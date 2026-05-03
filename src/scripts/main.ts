import { saveAs } from "file-saver";
import { extractKindleData } from "./extract";
import { DEFAULT_TEMPLATE, renderTemplate } from "./template";
import {
  buildObsidianUri,
  exportSettings,
  importSettings,
  loadOpenInObsidian,
  loadTemplate,
  saveOpenInObsidian,
  saveTemplate,
} from "./settings";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const fileInput = $<HTMLInputElement>("fileInput");
const templateInput = $<HTMLTextAreaElement>("templateInput");
const obsidianToggle = $<HTMLInputElement>("obsidianToggle");
const resetBtn = $<HTMLButtonElement>("templateReset");
const exportBtn = $<HTMLButtonElement>("templateExport");
const importBtn = $<HTMLButtonElement>("templateImport");
const importFileInput = $<HTMLInputElement>("templateImportFile");
const status = $<HTMLParagraphElement>("templateStatus");

let template = loadTemplate();
templateInput.value = template;
obsidianToggle.checked = loadOpenInObsidian();
syncResetEnabled();

if (isTouch()) {
  const clickPrompt = document.querySelector("#clickPrompt");
  if (clickPrompt?.textContent) {
    clickPrompt.textContent = clickPrompt.textContent.replace("click", "tap");
  }
}

fileInput.addEventListener("change", () => convertAll());

templateInput.addEventListener("input", () => {
  template = templateInput.value;
  saveTemplate(template);
  syncResetEnabled();
});

obsidianToggle.addEventListener("change", () => {
  saveOpenInObsidian(obsidianToggle.checked);
});

resetBtn.addEventListener("click", () => {
  template = DEFAULT_TEMPLATE;
  templateInput.value = template;
  saveTemplate(template);
  syncResetEnabled();
  flash("Template reset to default.");
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(exportSettings(), null, 2)], {
    type: "application/json",
  });
  saveAs(blob, "kindle-to-md-settings.json");
});

importBtn.addEventListener("click", () => importFileInput.click());

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const applied = importSettings(parsed);
    template = applied.template;
    templateInput.value = applied.template;
    obsidianToggle.checked = applied.openInObsidian;
    syncResetEnabled();
    flash("Settings imported.");
  } catch (err) {
    flash(`Import failed: ${err instanceof Error ? err.message : String(err)}`, true);
  } finally {
    importFileInput.value = "";
  }
});

async function convertAll(): Promise<void> {
  const files = fileInput.files;
  if (!files || files.length === 0) return;

  const results: { fileName: string; content: string }[] = [];
  for (const file of files) {
    try {
      const html = await file.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const md = renderTemplate(extractKindleData(doc), template);
      results.push({
        fileName: file.name.replace(/\.html$/i, ".md").replace("Notebook", "Kindle Notes"),
        content: md,
      });
    } catch (err) {
      flash(
        `Couldn't convert ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );
      return;
    }
  }

  if (obsidianToggle.checked) {
    for (const r of results) window.open(buildObsidianUri(r.fileName, r.content), "_blank");
  } else {
    for (const r of results) {
      saveAs(new Blob([r.content], { type: "text/plain;charset=utf-8" }), r.fileName);
    }
  }
  fileInput.value = "";
}

let flashTimer: number | undefined;
function flash(message: string, isError = false): void {
  status.textContent = message;
  status.dataset.state = isError ? "error" : "ok";
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => {
    status.textContent = "";
    delete status.dataset.state;
  }, 4000);
}

function syncResetEnabled(): void {
  resetBtn.disabled = template === DEFAULT_TEMPLATE;
}

function isTouch(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
