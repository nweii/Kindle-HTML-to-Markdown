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
author: {{author}}
aliases: ['"{{yamlEscape title}}" by {{yamlEscape author}}']
---
## Highlights
From *{{title}}* by {{author}}:

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
