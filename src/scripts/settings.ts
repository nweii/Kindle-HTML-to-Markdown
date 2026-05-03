import { DEFAULT_TEMPLATE } from "./template";

const KEY_TEMPLATE = "kindleToMd.template";
const KEY_OPEN_IN_OBSIDIAN = "kindleToMd.openInObsidian";

export type ExportedSettings = {
  version: 1;
  template: string;
  openInObsidian: boolean;
};

export function loadTemplate(): string {
  return localStorage.getItem(KEY_TEMPLATE) ?? DEFAULT_TEMPLATE;
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

export function exportSettings(): ExportedSettings {
  return {
    version: 1,
    template: loadTemplate(),
    openInObsidian: loadOpenInObsidian(),
  };
}

export function importSettings(raw: unknown): { template: string; openInObsidian: boolean } {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Settings file must be a JSON object.");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`Unsupported settings version: ${String(obj.version)}`);
  }
  if (typeof obj.template !== "string") {
    throw new Error("Settings 'template' must be a string.");
  }
  const openInObsidian = obj.openInObsidian === true;
  saveTemplate(obj.template);
  saveOpenInObsidian(openInObsidian);
  return { template: obj.template, openInObsidian };
}

export function buildObsidianUri(fileName: string, content: string): string {
  const file = encodeURIComponent(fileName.replace(/\.md$/i, ""));
  const body = encodeURIComponent(content);
  return `obsidian://new?file=${file}&content=${body}`;
}
