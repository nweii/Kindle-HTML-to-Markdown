import { DEFAULT_TEMPLATE } from "./template";

const KEY_TEMPLATE = "kindleToMd.template";
const KEY_OPEN_IN_OBSIDIAN = "kindleToMd.openInObsidian";

export function loadTemplate(): string {
  // Empty string from localStorage (e.g. user cleared the textarea) falls back to default.
  const stored = localStorage.getItem(KEY_TEMPLATE);
  return stored && stored.length > 0 ? stored : DEFAULT_TEMPLATE;
}

export function saveTemplate(template: string): void {
  if (template === DEFAULT_TEMPLATE) localStorage.removeItem(KEY_TEMPLATE);
  else localStorage.setItem(KEY_TEMPLATE, template);
}

export function loadOpenInObsidian(): boolean {
  return localStorage.getItem(KEY_OPEN_IN_OBSIDIAN) === "true";
}

export function saveOpenInObsidian(value: boolean): void {
  if (value) localStorage.setItem(KEY_OPEN_IN_OBSIDIAN, "true");
  else localStorage.removeItem(KEY_OPEN_IN_OBSIDIAN);
}

export function buildObsidianUri(fileName: string, content: string): string {
  const file = encodeURIComponent(fileName.replace(/\.md$/i, ""));
  const body = encodeURIComponent(content);
  return `obsidian://new?file=${file}&content=${body}`;
}
