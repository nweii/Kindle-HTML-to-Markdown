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

  test("preserves multi-author lists without swapping", async () => {
    const md = kindleToMarkdown(await parseFixture("multi-author.html"));
    expect(md).toContain("author: Martin Kleppmann, Alice Author, Bob Author");
  });

  test("replaces ':' in titles for filesystem safety", async () => {
    const md = kindleToMarkdown(await parseFixture("all-entry-types.html"));
    expect(md).toMatch(/^title: The Pragmatic Programmer.*Your Journey to Mastery$/m);
    expect(md).not.toMatch(/^title:.*:/m);
  });

  test("emits YAML frontmatter with title, author, and aliases", async () => {
    const md = kindleToMarkdown(await parseFixture("single-author.html"));
    expect(md).toMatch(
      /^---\ntitle: Thinking, Fast and Slow\nauthor: Daniel Kahneman\naliases: \['"Thinking, Fast and Slow" by Daniel Kahneman'\]\n---/,
    );
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

  test("throws on input that is not a Kindle export", () => {
    const doc = new DOMParser().parseFromString("<html><body>nope</body></html>", "text/html");
    expect(() => kindleToMarkdown(doc)).toThrow(/Kindle notebook export/);
  });
});
