import { DEFAULT_TEMPLATE } from "./template";

const KEY_TEMPLATE = "kindleToMd.template";
const KEY_OUTPUT_MODE = "kindleToMd.outputMode";

export type OutputMode = "download" | "clipboard" | "obsidian";

export function loadTemplate(): string {
  // Empty string from localStorage (e.g. user cleared the textarea) falls back to default.
  const stored = localStorage.getItem(KEY_TEMPLATE);
  return stored && stored.length > 0 ? stored : DEFAULT_TEMPLATE;
}

export function saveTemplate(template: string): void {
  if (template === DEFAULT_TEMPLATE) localStorage.removeItem(KEY_TEMPLATE);
  else localStorage.setItem(KEY_TEMPLATE, template);
}

export function loadOutputMode(): OutputMode {
  const v = localStorage.getItem(KEY_OUTPUT_MODE);
  if (v === "clipboard" || v === "obsidian") return v;
  return "download";
}

export function saveOutputMode(value: OutputMode): void {
  if (value === "download") localStorage.removeItem(KEY_OUTPUT_MODE);
  else localStorage.setItem(KEY_OUTPUT_MODE, value);
}

export function buildObsidianUri(fileName: string, content: string): string {
  const file = encodeURIComponent(fileName.replace(/\.md$/i, ""));
  const body = encodeURIComponent(content);
  return `obsidian://new?file=${file}&content=${body}`;
}
