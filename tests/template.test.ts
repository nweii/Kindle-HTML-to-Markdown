import { describe, expect, test } from "bun:test";
import { extractKindleData } from "../src/scripts/extract";
import {
  buildAiPrompt,
  DEFAULT_TEMPLATE,
  formatDate,
  highlightHandlebars,
  renderTemplate,
  tryCompileTemplate,
} from "../src/scripts/template";

async function render(name: string, template: string = DEFAULT_TEMPLATE): Promise<string> {
  const html = await Bun.file(`${import.meta.dir}/fixtures/${name}`).text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  return renderTemplate(extractKindleData(doc), template);
}

describe("DEFAULT_TEMPLATE", () => {
  test("emits YAML frontmatter with title, author, and aliases", async () => {
    const md = await render("single-author.html");
    expect(md).toMatch(
      /^---\ntitle: Thinking, Fast and Slow\nauthor: Daniel Kahneman\naliases: \['"Thinking, Fast and Slow" by Daniel Kahneman'\]\n---/,
    );
  });

  test("escapes apostrophes in the YAML aliases line", async () => {
    const md = await render("all-entry-types.html");
    expect(md).toContain(`aliases: ['"You Don''t Know JS - Scope & Closures" by Kyle Simpson']`);
  });

  test("renders section headings as H3, highlights as blockquotes, notes plain, bookmarks prefixed", async () => {
    const md = await render("all-entry-types.html");
    expect(md).toContain("### Chapter 1: A Pragmatic Philosophy");
    expect(md).toContain("> Care about your craft.");
    expect(md).toContain("Foundational chapter — return here.");
    expect(md).not.toContain("> Foundational chapter");
    expect(md).toContain("*Bookmark* at Chapter 2 > Page 25 · Location 410");
    expect(md).toContain("> Don't repeat yourself.");
  });

  test("does not HTML-escape ampersands or quotes in titles", async () => {
    const md = await render("all-entry-types.html");
    expect(md).toContain("Scope & Closures");
    expect(md).not.toContain("&amp;");
  });

  test("handles modern Kindle format end-to-end", async () => {
    const md = await render("modern-format.html");
    expect(md).toContain("title: Trick Mirror - Reflections on Self-Delusion");
    expect(md).toContain("author: Jia Tolentino");
    expect(md).toContain("### Introduction");
    expect(md).toContain(
      "> When I feel confused about something, I write about it until I turn into the person who shows up on paper.",
    );
    expect(md).toContain("*Bookmark* at Page 65 · Location 1023");
    expect(md).toContain(
      `> Figuring out how to "get better" at being a woman is a ridiculous and often amoral project.`,
    );
  });

  test("produces valid frontmatter for an export with no entries", async () => {
    const md = await render("empty-body.html");
    expect(md).toContain("title: Empty Book");
    expect(md).toContain("## Highlights");
  });
});

describe("custom templates", () => {
  test("can render only highlight text, no frontmatter", async () => {
    const md = await render(
      "all-entry-types.html",
      `{{#each sections}}{{#each entries}}{{#if (eq type "highlight")}}- {{text}}\n{{/if}}{{/each}}{{/each}}`,
    );
    expect(md).toBe("- Care about your craft.\n- Don't repeat yourself.\n");
  });

  test("exposes color on highlight entries", async () => {
    const md = await render(
      "modern-format.html",
      `{{#each sections}}{{#each entries}}{{#if color}}[{{color}}] {{text}}\n{{/if}}{{/each}}{{/each}}`,
    );
    expect(md).toContain("[yellow] When I feel confused");
    expect(md).toContain("[aqua] Figuring out");
  });

  test("formatDate helper supports moment-style tokens with literal brackets", async () => {
    const date = new Date(2024, 4, 17, 9, 7, 3); // May 17 2024 09:07:03 local
    const md = renderTemplate(
      { title: "T", author: "A", date, sections: [] },
      `created: {{formatDate date "yyyy-MM-dd[T]HH:mm:ss"}}`,
    );
    expect(md).toBe("created: 2024-05-17T09:07:03");
  });
});

describe("tryCompileTemplate", () => {
  test("returns null for a valid template", () => {
    expect(tryCompileTemplate("hello {{name}}")).toBeNull();
    expect(tryCompileTemplate(DEFAULT_TEMPLATE)).toBeNull();
  });

  test("returns a single-line error message for malformed syntax", () => {
    const err = tryCompileTemplate("{{#if}}");
    expect(err).not.toBeNull();
    expect(err).not.toContain("\n");
  });
});

describe("buildAiPrompt", () => {
  test("embeds the user's current template inside a handlebars code block", () => {
    const userTemplate = "# {{title}}\n\n{{#each sections}}- {{heading}}\n{{/each}}";
    const prompt = buildAiPrompt(userTemplate);
    expect(prompt).toContain("## My current template");
    expect(prompt).toContain("```handlebars\n" + userTemplate + "\n```");
  });

  test("embeds the default template as a baseline", () => {
    const prompt = buildAiPrompt("anything");
    expect(prompt).toContain("## Default template (reference baseline)");
    expect(prompt).toContain(DEFAULT_TEMPLATE);
  });

  test("explicitly asks the AI to respond with a handlebars code block", () => {
    const prompt = buildAiPrompt("");
    expect(prompt).toContain("```handlebars");
    expect(prompt).toMatch(/inside a.*```handlebars.*code block/);
  });

  test("documents only the three custom helpers (eq, yamlEscape, formatDate)", () => {
    const prompt = buildAiPrompt("");
    expect(prompt).toContain("(eq A B)");
    expect(prompt).toContain("yamlEscape");
    expect(prompt).toContain("formatDate");
    expect(prompt).toContain("don't invent others");
  });
});

describe("highlightHandlebars", () => {
  test("wraps variable expressions in hb-var spans", () => {
    expect(highlightHandlebars("hello {{title}}!")).toBe(
      `hello <span class="hb-var">{{title}}</span>!`,
    );
  });

  test("wraps block helpers and closers in hb-block spans", () => {
    const html = highlightHandlebars("{{#each xs}}{{x}}{{/each}}");
    expect(html).toContain(`<span class="hb-block">{{#each xs}}</span>`);
    expect(html).toContain(`<span class="hb-var">{{x}}</span>`);
    expect(html).toContain(`<span class="hb-block">{{/each}}</span>`);
  });

  test("escapes HTML entities outside tags", () => {
    expect(highlightHandlebars("a < b & c")).toBe("a &lt; b &amp; c");
  });
});

describe("formatDate", () => {
  const date = new Date(2024, 0, 5, 8, 4, 9); // Jan 5, 2024 08:04:09 local

  test("pads year, month, day, hour, minute, second", () => {
    expect(formatDate(date, "yyyy-MM-dd HH:mm:ss")).toBe("2024-01-05 08:04:09");
  });

  test("supports unpadded variants", () => {
    expect(formatDate(date, "yyyy-M-d H:m:s")).toBe("2024-1-5 8:4:9");
  });

  test("supports MMM and MMMM month names", () => {
    expect(formatDate(date, "MMMM d, yyyy")).toBe("January 5, 2024");
    expect(formatDate(date, "d MMM yyyy")).toBe("5 Jan 2024");
  });

  test("treats text inside [brackets] as literal", () => {
    expect(formatDate(date, "[Year] yyyy")).toBe("Year 2024");
    expect(formatDate(date, "yyyy[T]HH")).toBe("2024T08");
  });
});
