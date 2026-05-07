import { describe, expect, test } from "bun:test";
import { auditExtraction, extractKindleData, normalizeKindleHtml } from "../src/scripts/extract";

async function rawHtml(name: string): Promise<string> {
  return Bun.file(`${import.meta.dir}/fixtures/${name}`).text();
}

async function parse(name: string): Promise<Document> {
  const html = await rawHtml(name);
  return new DOMParser().parseFromString(normalizeKindleHtml(html), "text/html");
}

describe("extractKindleData", () => {
  test("swaps 'Last, First' for a single author", async () => {
    const data = extractKindleData(await parse("single-author.html"));
    expect(data.author).toBe("Daniel Kahneman");
  });

  test("does not swap two authors in 'First Last, First Last' format", async () => {
    const data = extractKindleData(await parse("multi-author.html"));
    expect(data.author).toBe("Martin Kleppmann, Some Coauthor");
  });

  test("collapses ':' in titles to ' - ' without leaving double spaces", async () => {
    const data = extractKindleData(await parse("all-entry-types.html"));
    expect(data.title).toBe("You Don't Know JS - Scope & Closures");
  });

  test("groups entries under their preceding section heading", async () => {
    const data = extractKindleData(await parse("all-entry-types.html"));
    expect(data.sections).toHaveLength(2);
    expect(data.sections[0]!.heading).toBe("Chapter 1: A Pragmatic Philosophy");
    expect(data.sections[1]!.heading).toBe("Chapter 2: A Pragmatic Approach");
  });

  test("classifies entries as highlight/note/bookmark with location and color", async () => {
    const data = extractKindleData(await parse("all-entry-types.html"));
    const ch1 = data.sections[0]!.entries;
    expect(ch1).toHaveLength(3);
    expect(ch1[0]).toEqual({
      type: "highlight",
      text: "Care about your craft.",
      location: "Chapter 1 > Page 1 · Location 50",
      color: "Yellow",
    });
    expect(ch1[1]).toEqual({
      type: "note",
      text: "Foundational chapter — return here.",
      location: "Chapter 1 > Page 1 · Location 51",
    });
    expect(ch1[2]).toEqual({
      type: "bookmark",
      location: "Chapter 2 > Page 25 · Location 410",
    });
  });

  test("parses modern Kindle format with annotation color spans", async () => {
    const data = extractKindleData(await parse("modern-format.html"));
    expect(data.title).toBe("Trick Mirror - Reflections on Self-Delusion");
    expect(data.author).toBe("Jia Tolentino");
    const intro = data.sections[0]!;
    expect(intro.heading).toBe("Introduction");
    expect(intro.entries[0]).toMatchObject({ type: "highlight", color: "yellow" });
    expect(intro.entries[1]).toMatchObject({ type: "bookmark" });
    expect(intro.entries[2]).toMatchObject({ type: "highlight", color: "aqua" });
  });

  test("yields empty sections array when bodyContainer has no entries", async () => {
    const data = extractKindleData(await parse("empty-body.html"));
    expect(data.sections).toEqual([]);
  });

  test("does not crash when a noteHeading has no following noteText sibling", async () => {
    const data = extractKindleData(await parse("missing-note-text.html"));
    const entry = data.sections[0]!.entries[0]!;
    expect(entry).toMatchObject({ type: "highlight", text: "" });
  });

  test("parses XHTML-flavored exports that wrap headings in h2/h3 with malformed nesting", async () => {
    const data = extractKindleData(await parse("xhtml-h-tag-malformed.html"));
    expect(data.title).toBe("Example Book - A Sample Subtitle");
    expect(data.author).toBe("Jane Doe");
    expect(data.sections).toHaveLength(1);
    const entries = data.sections[0]!.entries;
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      type: "highlight",
      text: "First example highlight text.",
      location: "Chapter One > Page 1 · Location 100",
      color: "yellow",
    });
    expect(entries[1]).toEqual({
      type: "note",
      text: "First example note text.",
      location: "Chapter One > Page 1 · Location 101",
    });
    expect(entries[2]).toEqual({
      type: "bookmark",
      location: "Chapter Two > Page 2 · Location 200",
    });
  });

  test("throws on input that is not a Kindle export", () => {
    const doc = new DOMParser().parseFromString("<html><body>nope</body></html>", "text/html");
    expect(() => extractKindleData(doc)).toThrow(/Kindle notebook HTML export/);
  });
});

describe("auditExtraction", () => {
  test("returns no warnings when extracted count matches source markers", async () => {
    const html = await rawHtml("all-entry-types.html");
    const data = extractKindleData(
      new DOMParser().parseFromString(normalizeKindleHtml(html), "text/html"),
    );
    expect(auditExtraction(html, data)).toEqual([]);
  });

  test("warns when zero entries were parsed but the source has markers", async () => {
    const html = await rawHtml("xhtml-h-tag-malformed.html");
    // Simulate a parser that didn't run normalization — the old broken behavior.
    const data = extractKindleData(new DOMParser().parseFromString(html, "text/html"));
    const warnings = auditExtraction(html, data);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/couldn't parse any/);
    expect(warnings[0]).toMatch(/3/);
  });

  test("warns with a count when some but not all entries were parsed", () => {
    const html = `
      <div class='bodyContainer'>
        <div class='bookTitle'>X</div><div class='authors'>A</div>
        <div class='noteHeading'>Highlight (Yellow) - Loc 1</div>
        <div class='noteText'>one</div>
        <div class='noteHeading'>Highlight (Yellow) - Loc 2</div>
        <div class='noteText'>two</div>
      </div>`;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const data = extractKindleData(doc);
    // Now imagine the source had 5 markers but parsing only saw 2 (e.g. truncated/escaped):
    const inflatedHtml = html + `<!-- class="noteHeading" class="noteHeading" class="noteHeading" -->`;
    const warnings = auditExtraction(inflatedHtml, data);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/Extracted 2 entries/);
    expect(warnings[0]).toMatch(/5 marker/);
    expect(warnings[0]).toMatch(/3 entries appear to be missing/);
  });

  test("returns no warnings when there are no entries and no markers", async () => {
    const html = await rawHtml("empty-body.html");
    const data = extractKindleData(
      new DOMParser().parseFromString(normalizeKindleHtml(html), "text/html"),
    );
    expect(auditExtraction(html, data)).toEqual([]);
  });
});
