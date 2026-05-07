import Handlebars from "handlebars";
import type { KindleData } from "./extract";

/** Realistic-looking data used by the in-app preview toggle. */
export const SAMPLE_DATA: KindleData = {
  title: "Thinking, Fast and Slow",
  author: "Daniel Kahneman",
  date: new Date(2024, 4, 17, 10, 30),
  sections: [
    {
      heading: "Part 1: Two Systems",
      entries: [
        {
          type: "highlight",
          text: "System 1 operates automatically and quickly, with little or no effort and no sense of voluntary control.",
          location: "Chapter 1 > Page 19 · Location 285",
          color: "Yellow",
        },
        {
          type: "note",
          text: "Compare with System 2 description in the next chapter.",
          location: "Chapter 1 > Page 19 · Location 286",
        },
        {
          type: "bookmark",
          location: "Chapter 1 > Page 21 · Location 312",
        },
      ],
    },
    {
      heading: "Part 2: Heuristics and Biases",
      entries: [
        {
          type: "highlight",
          text: "The illusion of validity persists even when its falsity is recognized.",
          location: "Chapter 4 > Page 86 · Location 1450",
          color: "Pink",
        },
      ],
    },
  ],
};

export const DEFAULT_TEMPLATE = `---
title: {{title}}
author: '[[{{yamlEscape author}}]]'
aliases: ['"{{yamlEscape title}}" by {{yamlEscape author}}']
---
## Highlights
From *{{title}}* by [[{{author}}]]:

{{#each sections}}{{#if heading}}### {{heading}}
{{/if}}{{#each entries}}{{#if (eq type "highlight")}}> {{text}}

{{/if}}{{#if (eq type "note")}}{{text}}

{{/if}}{{#if (eq type "bookmark")}}*Bookmark* at {{location}}

{{/if}}{{/each}}{{/each}}`;

const handlebars = Handlebars.create();

handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

// Single-quoted YAML strings escape ' as ''
handlebars.registerHelper("yamlEscape", (s: string) => String(s ?? "").replace(/'/g, "''"));

handlebars.registerHelper("formatDate", (date: unknown, format: unknown) => {
  if (!(date instanceof Date) || typeof format !== "string") return "";
  return formatDate(date, format);
});

let cachedSource: string | null = null;
let cachedCompiled: HandlebarsTemplateDelegate | null = null;

export function renderTemplate(data: KindleData, template: string = DEFAULT_TEMPLATE): string {
  if (template !== cachedSource) {
    cachedSource = template;
    cachedCompiled = handlebars.compile(template, { noEscape: true });
  }
  return cachedCompiled!(data);
}

/**
 * Build a self-contained prompt the user can paste into Claude/ChatGPT/etc. to get
 * help iterating on their template. Includes the data shape, the three custom
 * helpers, the default template (as a baseline), the user's current template, and
 * a small sample of input data so the model can reason about the output without
 * needing the Kindle HTML format itself.
 */
export function buildAiPrompt(currentTemplate: string): string {
  const sampleJson = JSON.stringify(
    SAMPLE_DATA,
    (_key, value) => (value instanceof Date ? value.toISOString() : value),
    2,
  );
  return `I'm customizing a Handlebars template for kindle2md, a tool that converts Kindle highlight HTML exports into Markdown notes. Help me iterate on the template below.

## Available data

The template receives this shape (TypeScript):

\`\`\`ts
type KindleData = {
  title: string;        // book's title
  author: string;       // author or author list
  date: Date;           // moment of conversion
  sections: {
    heading: string;    // chapter name (may be "" for entries before any heading)
    entries: (
      | { type: "highlight"; text: string; location: string; color?: string }
      | { type: "note"; text: string; location: string }
      | { type: "bookmark"; location: string }
    )[];
  }[];
};
\`\`\`

## Handlebars syntax

Standard Handlebars rules apply ({{var}}, {{#each}}, {{#if}}, {{#unless}}, etc.). HTML escaping is OFF (the renderer uses { noEscape: true } since the output is Markdown, not HTML), so values containing < or & pass through unchanged. The only place to be careful is inside single-quoted YAML strings — use the {{yamlEscape}} helper there.

## Custom helpers (only these three; please don't invent others)

- **(eq A B)** — strict equality. Use inside {{#if}} to discriminate entry types:
  {{#if (eq type "highlight")}}> {{text}}{{/if}}
- **{{yamlEscape s}}** — doubles single quotes in s so the value is safe to embed in a single-quoted YAML string.
- **{{formatDate date "format"}}** — moment-style date formatting. Tokens (and what they emit for Jan 5, 2024 at 08:04:09):
  - yyyy → 2024, yy → 24
  - MMMM → January, MMM → Jan, MM → 01, M → 1
  - dd → 05, d → 5
  - HH → 08, H → 8
  - mm → 04, m → 4
  - ss → 09, s → 9
  - Wrap literal characters in [brackets] so they aren't interpreted as tokens, e.g. yyyy-MM-dd[T]HH:mm → 2024-01-05T08:04.

## ${currentTemplate === DEFAULT_TEMPLATE ? "Default template (I haven't edited it yet — I'm starting from this)" : "Default template (reference baseline)"}

\`\`\`handlebars
${DEFAULT_TEMPLATE}
\`\`\`
${
  currentTemplate === DEFAULT_TEMPLATE
    ? ""
    : `
## My current template

\`\`\`handlebars
${currentTemplate}
\`\`\`
`
}
## Sample input (so you can reason about the output without seeing real Kindle HTML)

\`\`\`json
${sampleJson}
\`\`\`

## What I want changed

[Describe what you want changed about the template here.]

---

**Please respond with**: a brief explanation of your changes, then the FULL updated template inside a \`\`\`handlebars code block so I can copy it directly into my editor. Don't elide unchanged sections — give me the complete template every time.`;
}

/**
 * Compile and dry-run the template against a minimal sample to catch both compile-time
 * and runtime errors (Handlebars compiles permissively but throws during render on
 * mismatched blocks, helper exceptions, etc.). Returns a single-line error message on
 * failure, or null on success.
 */
export function tryCompileTemplate(template: string): string | null {
  try {
    const compiled = handlebars.compile(template, { noEscape: true });
    compiled({ title: "", author: "", date: new Date(), sections: [] });
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.split("\n")[0] ?? msg;
  }
}

const HB_TAG = /\{\{[#\/]?[^}]*\}\}/g;
const HTML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

/**
 * Returns HTML for a Handlebars source string with each `{{…}}` tag wrapped in a
 * span. Two classes: `hb-block` for `{{#…}}` / `{{/…}}` / `{{else}}`, `hb-var` for
 * everything else. The output is meant to be set as `innerHTML` on a sibling
 * element behind a transparent textarea.
 */
export function highlightHandlebars(src: string): string {
  const escaped = src.replace(/[&<>]/g, (c) => HTML_ENTITIES[c] ?? c);
  return escaped.replace(HB_TAG, (match) => {
    const isBlock = /^\{\{[#/]/.test(match) || /^\{\{else\b/.test(match);
    const cls = isBlock ? "hb-block" : "hb-var";
    return `<span class="${cls}">${match}</span>`;
  });
}

// Lightweight moment-style date formatter backed by browser Date methods.
// Tokens: yyyy yy MMMM MMM MM M dd d HH H mm m ss s. Wrap literals in [brackets].
export function formatDate(date: Date, format: string): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const tokens: Record<string, () => string> = {
    yyyy: () => String(date.getFullYear()),
    yy: () => pad(date.getFullYear() % 100),
    MMMM: () => date.toLocaleString(undefined, { month: "long" }),
    MMM: () => date.toLocaleString(undefined, { month: "short" }),
    MM: () => pad(date.getMonth() + 1),
    M: () => String(date.getMonth() + 1),
    dd: () => pad(date.getDate()),
    d: () => String(date.getDate()),
    HH: () => pad(date.getHours()),
    H: () => String(date.getHours()),
    mm: () => pad(date.getMinutes()),
    m: () => String(date.getMinutes()),
    ss: () => pad(date.getSeconds()),
    s: () => String(date.getSeconds()),
  };
  return format.replace(
    /\[([^\]]*)\]|yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|mm|m|ss|s/g,
    (match, escaped) => {
      if (escaped !== undefined) return escaped;
      const fn = tokens[match];
      return fn ? fn() : match;
    },
  );
}
