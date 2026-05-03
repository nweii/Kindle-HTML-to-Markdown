import { describe, expect, test } from "bun:test";
import { kindleToMarkdown } from "../src/scripts/kindleToMarkdown";

async function parseFixture(name: string): Promise<Document> {
  const html = await Bun.file(`${import.meta.dir}/fixtures/${name}`).text();
  return new DOMParser().parseFromString(html, "text/html");
}

describe("kindleToMarkdown", () => {
  test("swaps 'Last, First' for a single author", async () => {
    const md = kindleToMarkdown(await parseFixture("single-author.html"));
    expect(md).toContain("author: Daniel Kahneman");
    expect(md).not.toContain("Kahneman, Daniel");
  });

  test("does not swap two authors in 'First Last, First Last' format", async () => {
    const md = kindleToMarkdown(await parseFixture("multi-author.html"));
    expect(md).toContain("author: Martin Kleppmann, Some Coauthor");
  });

  test("collapses ':' in titles to ' - ' without leaving double spaces", async () => {
    const md = kindleToMarkdown(await parseFixture("all-entry-types.html"));
    expect(md).toContain("title: You Don't Know JS - Scope & Closures");
    expect(md).not.toMatch(/  /); // no double spaces anywhere in output
  });

  test("emits YAML frontmatter with title, author, and aliases", async () => {
    const md = kindleToMarkdown(await parseFixture("single-author.html"));
    expect(md).toMatch(
      /^---\ntitle: Thinking, Fast and Slow\nauthor: Daniel Kahneman\naliases: \['"Thinking, Fast and Slow" by Daniel Kahneman'\]\n---/,
    );
  });

  test("escapes apostrophes in the YAML aliases line", async () => {
    const md = kindleToMarkdown(await parseFixture("all-entry-types.html"));
    // Single-quoted YAML strings escape ' as ''
    expect(md).toContain(`aliases: ['"You Don''t Know JS - Scope & Closures" by Kyle Simpson']`);
  });

  test("renders section headings as H3", async () => {
    const md = kindleToMarkdown(await parseFixture("all-entry-types.html"));
    expect(md).toContain("### Chapter 1: A Pragmatic Philosophy");
    expect(md).toContain("### Chapter 2: A Pragmatic Approach");
  });

  test("renders highlights as blockquotes", async () => {
    const md = kindleToMarkdown(await parseFixture("all-entry-types.html"));
    expect(md).toContain("> Care about your craft.");
    expect(md).toContain("> Don't repeat yourself.");
  });

  test("renders notes as plain paragraphs", async () => {
    const md = kindleToMarkdown(await parseFixture("all-entry-types.html"));
    expect(md).toContain("Foundational chapter — return here.");
    expect(md).not.toContain("> Foundational chapter");
  });

  test("renders bookmarks with location prefix", async () => {
    const md = kindleToMarkdown(await parseFixture("all-entry-types.html"));
    expect(md).toMatch(/\*Bookmark\* at Chapter 2 > Page 25 · Location 410/);
  });

  test("handles modern Kindle format with annotation color spans", async () => {
    const md = kindleToMarkdown(await parseFixture("modern-format.html"));
    expect(md).toContain("title: Trick Mirror - Reflections on Self-Delusion");
    expect(md).toContain("author: Jia Tolentino");
    expect(md).toContain("### Introduction");
    expect(md).toContain(
      "> When I feel confused about something, I write about it until I turn into the person who shows up on paper.",
    );
    expect(md).toContain("*Bookmark* at Page 65 · Location 1023");
    expect(md).toContain(
      "> Figuring out how to \"get better\" at being a woman is a ridiculous and often amoral project.",
    );
  });

  test("produces valid frontmatter for an export with no entries", async () => {
    const md = kindleToMarkdown(await parseFixture("empty-body.html"));
    expect(md).toContain("title: Empty Book");
    expect(md).toContain("author: Anonymous");
    expect(md).toContain("## Highlights");
  });

  test("does not crash when a noteHeading has no following noteText sibling", async () => {
    const md = kindleToMarkdown(await parseFixture("missing-note-text.html"));
    expect(md).toContain("title: Truncated Export");
    // Highlight with no body emits an empty blockquote rather than throwing
    expect(md).toContain("> \n");
  });

  test("throws on input that is not a Kindle export", () => {
    const doc = new DOMParser().parseFromString("<html><body>nope</body></html>", "text/html");
    expect(() => kindleToMarkdown(doc)).toThrow(/Kindle notebook export/);
  });
});
