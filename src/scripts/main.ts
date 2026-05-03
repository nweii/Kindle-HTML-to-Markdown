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
const copyBtn = $<HTMLButtonElement>("templateCopy");
const resetBtn = $<HTMLButtonElement>("templateReset");
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

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(template);
    flash("Template copied to clipboard.");
  } catch (err) {
    alert(`Couldn't copy: ${err instanceof Error ? err.message : String(err)}`);
  }
});

resetBtn.addEventListener("click", () => {
  if (!confirm("Reset your template to the default? Your current template will be discarded.")) {
    return;
  }
  template = DEFAULT_TEMPLATE;
  saveTemplate(template);
  syncResetEnabled();
  renderTemplateView();
  flash("Template reset to default.");
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
    alert(`No files converted.\n\n${failures.join("\n\n")}`);
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
    alert(
      `${results.length} file(s) converted. ${failures.length} couldn't be converted:\n\n${failures.join("\n\n")}`,
    );
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
