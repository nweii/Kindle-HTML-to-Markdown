import { saveAs } from "file-saver";
import { extractKindleData } from "./extract";
import {
  buildAiPrompt,
  DEFAULT_TEMPLATE,
  highlightHandlebars,
  renderTemplate,
  SAMPLE_DATA,
  tryCompileTemplate,
} from "./template";
import {
  buildObsidianUri,
  loadOutputMode,
  loadTemplate,
  type OutputMode,
  saveOutputMode,
  saveTemplate,
} from "./settings";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const fileInput = $<HTMLInputElement>("fileInput");
const templateInput = $<HTMLTextAreaElement>("templateInput");
const templateHighlight = $<HTMLPreElement>("templateHighlight");
const outputModeSelect = $<HTMLSelectElement>("outputMode");
const outputModeHelp = $<HTMLParagraphElement>("outputModeHelp");
const previewBtn = $<HTMLButtonElement>("templatePreview");
const previewLabel = $<HTMLSpanElement>("templatePreviewLabel");
const copyBtn = $<HTMLButtonElement>("templateCopy");
const copyIcon = $<SVGSVGElement & HTMLElement>("templateCopyIcon");
const copyLabel = $<HTMLSpanElement>("templateCopyLabel");
const aiPromptBtn = $<HTMLButtonElement>("aiPromptCopy");
const aiPromptLabel = $<HTMLSpanElement>("aiPromptCopyLabel");
const resetBtn = $<HTMLButtonElement>("templateReset");
const status = $<HTMLParagraphElement>("templateStatus");

const OUTPUT_MODE_HELP: Record<OutputMode, string> = {
  download: "A .md file downloads per book.",
  clipboard:
    "Copies the rendered Markdown to your clipboard. With multiple files, they're joined by --- separators.",
  obsidian:
    "Hands each file to Obsidian's obsidian://new URL handler in your last-active vault. Requires Obsidian.",
};

// Canonical template; the textarea is just a view of this (or its rendered preview).
let template = loadTemplate();
let mode: "edit" | "preview" = "edit";
let outputMode: OutputMode = loadOutputMode();

outputModeSelect.value = outputMode;
syncOutputModeHelp();
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

outputModeSelect.addEventListener("change", () => {
  outputMode = outputModeSelect.value as OutputMode;
  saveOutputMode(outputMode);
  syncOutputModeHelp();
});

previewBtn.addEventListener("click", () => {
  mode = mode === "edit" ? "preview" : "edit";
  previewBtn.setAttribute("aria-pressed", mode === "preview" ? "true" : "false");
  previewLabel.textContent = mode === "preview" ? "Back to editing" : "Preview output";
  renderTemplateView();
});

const COPY_ICON_IDLE = `<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`;
const COPY_ICON_DONE = `<polyline points="20 6 9 17 4 12"/>`;
let copyResetTimer: number | undefined;

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(template);
    copyIcon.innerHTML = COPY_ICON_DONE;
    copyLabel.textContent = "Copied";
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      copyIcon.innerHTML = COPY_ICON_IDLE;
      copyLabel.textContent = "Copy template";
    }, 2000);
  } catch (err) {
    alert(`Couldn't copy: ${err instanceof Error ? err.message : String(err)}`);
  }
});

let aiPromptResetTimer: number | undefined;
aiPromptBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(buildAiPrompt(template));
    aiPromptLabel.textContent = "Copied — paste into your AI chat";
    if (aiPromptResetTimer) clearTimeout(aiPromptResetTimer);
    aiPromptResetTimer = window.setTimeout(() => {
      aiPromptLabel.textContent = "Copy AI prompt";
    }, 3000);
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

  if (outputMode === "obsidian") {
    for (const r of results) window.open(buildObsidianUri(r.fileName, r.content), "_blank");
    if (results.length > 1) {
      flash(
        `Sending ${results.length} files to Obsidian. If most don't open, allow popups for this site and retry.`,
      );
    }
  } else if (outputMode === "clipboard") {
    const joined = results.map((r) => r.content).join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(joined);
      if (results.length === 1) {
        alert(`"${results[0]!.fileName}" copied to your clipboard.`);
      } else {
        alert(
          `${results.length} converted files copied to your clipboard, joined by --- separators.`,
        );
      }
    } catch (err) {
      alert(`Couldn't copy: ${err instanceof Error ? err.message : String(err)}`);
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

function syncOutputModeHelp(): void {
  outputModeHelp.textContent = OUTPUT_MODE_HELP[outputMode];
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
