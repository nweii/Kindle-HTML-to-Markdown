import { describe, expect, test } from "bun:test";
import { extractKindleData } from "../src/scripts/extract";

async function parse(name: string): Promise<Document> {
  const html = await Bun.file(`${import.meta.dir}/fixtures/${name}`).text();
  return new DOMParser().parseFromString(html, "text/html");
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

  test("throws on input that is not a Kindle export", () => {
    const doc = new DOMParser().parseFromString("<html><body>nope</body></html>", "text/html");
    expect(() => extractKindleData(doc)).toThrow(/Kindle notebook HTML export/);
  });
});
