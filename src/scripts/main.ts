import { saveAs } from "file-saver";
import { extractKindleData } from "./extract";
import {
  DEFAULT_TEMPLATE,
  highlightHandlebars,
  renderTemplate,
  SAMPLE_DATA,
  tryCompileTemplate,
} from "./template";
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
const templateHighlight = $<HTMLPreElement>("templateHighlight");
const obsidianToggle = $<HTMLInputElement>("obsidianToggle");
const previewBtn = $<HTMLButtonElement>("templatePreview");
const previewLabel = $<HTMLSpanElement>("templatePreviewLabel");
const resetBtn = $<HTMLButtonElement>("templateReset");
const exportBtn = $<HTMLButtonElement>("templateExport");
const importBtn = $<HTMLButtonElement>("templateImport");
const importFileInput = $<HTMLInputElement>("templateImportFile");
const status = $<HTMLParagraphElement>("templateStatus");

// Canonical template; the textarea is just a view of this (or its rendered preview).
let template = loadTemplate();
let mode: "edit" | "preview" = "edit";

obsidianToggle.checked = loadOpenInObsidian();
syncResetEnabled();
renderTemplateView();

if (isTouch()) {
  const clickPrompt = document.querySelector("#clickPrompt");
  if (clickPrompt?.textContent) {
    clickPrompt.textContent = clickPrompt.textContent.replace("click", "tap");
  }
}

fileInput.addEventListener("change", () => convertAll());

let validateTimer: number | undefined;
templateInput.addEventListener("input", () => {
  if (mode === "preview") return; // textarea is readonly in preview mode
  template = templateInput.value;
  saveTemplate(template);
  syncResetEnabled();
  syncHighlight();
  if (validateTimer) clearTimeout(validateTimer);
  validateTimer = window.setTimeout(() => {
    const error = tryCompileTemplate(template);
    if (error) flash(`Template error: ${error}`, true);
    else if (status.dataset.state === "error") clearStatus();
  }, 350);
});

templateInput.addEventListener("scroll", () => {
  templateHighlight.scrollTop = templateInput.scrollTop;
  templateHighlight.scrollLeft = templateInput.scrollLeft;
});

obsidianToggle.addEventListener("change", () => {
  saveOpenInObsidian(obsidianToggle.checked);
});

previewBtn.addEventListener("click", () => {
  mode = mode === "edit" ? "preview" : "edit";
  previewBtn.setAttribute("aria-pressed", mode === "preview" ? "true" : "false");
  previewLabel.textContent = mode === "preview" ? "Back to editing" : "Preview output";
  renderTemplateView();
});

resetBtn.addEventListener("click", () => {
  template = DEFAULT_TEMPLATE;
  saveTemplate(template);
  syncResetEnabled();
  renderTemplateView();
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
    obsidianToggle.checked = applied.openInObsidian;
    syncResetEnabled();
    renderTemplateView();
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
  const failures: string[] = [];

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
      failures.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (results.length === 0) {
    flash(`No files converted. ${failures[0] ?? ""}`, true);
    fileInput.value = "";
    return;
  }

  if (obsidianToggle.checked) {
    for (const r of results) window.open(buildObsidianUri(r.fileName, r.content), "_blank");
    if (results.length > 1) {
      flash(
        `Sending ${results.length} files to Obsidian. If most don't open, allow popups for this site and retry.`,
      );
    }
  } else {
    for (const r of results) {
      saveAs(new Blob([r.content], { type: "text/plain;charset=utf-8" }), r.fileName);
    }
  }

  if (failures.length > 0) {
    flash(`${results.length} converted, ${failures.length} failed: ${failures[0]}`, true);
  }

  fileInput.value = "";
}

let flashTimer: number | undefined;
function flash(message: string, isError = false): void {
  status.textContent = message;
  status.dataset.state = isError ? "error" : "ok";
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = window.setTimeout(clearStatus, 5000);
}

function clearStatus(): void {
  status.textContent = "";
  delete status.dataset.state;
}

function syncResetEnabled(): void {
  resetBtn.disabled = template === DEFAULT_TEMPLATE;
}

/** Render the current template as either editable source (edit mode) or rendered output (preview mode). */
function renderTemplateView(): void {
  if (mode === "edit") {
    templateInput.value = template;
    templateInput.readOnly = false;
    syncHighlight();
    return;
  }
  let preview: string;
  try {
    preview = renderTemplate(SAMPLE_DATA, template);
  } catch (err) {
    flash(
      `Preview error: ${err instanceof Error ? (err.message.split("\n")[0] ?? "") : String(err)}`,
      true,
    );
    mode = "edit";
    previewBtn.setAttribute("aria-pressed", "false");
    previewLabel.textContent = "Preview output";
    renderTemplateView();
    return;
  }
  templateInput.value = preview;
  templateInput.readOnly = true;
  // In preview, render plain text (no Handlebars highlighting — there are no tags).
  templateHighlight.textContent = preview.endsWith("\n") ? preview + " " : preview;
  templateHighlight.scrollTop = templateInput.scrollTop = 0;
}

function syncHighlight(): void {
  // Textareas display the empty line after a trailing \n; <pre> doesn't, so pad with a space.
  const v = templateInput.value;
  const display = v.endsWith("\n") ? v + " " : v;
  templateHighlight.innerHTML = highlightHandlebars(display);
  templateHighlight.scrollTop = templateInput.scrollTop;
  templateHighlight.scrollLeft = templateInput.scrollLeft;
}

function isTouch(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
