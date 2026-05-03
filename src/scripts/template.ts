import Handlebars from "handlebars";
import type { KindleData } from "./extract";

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

export function renderTemplate(data: KindleData, template: string = DEFAULT_TEMPLATE): string {
  const compiled = handlebars.compile(template, { noEscape: true });
  return compiled(data);
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
