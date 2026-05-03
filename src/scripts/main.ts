import { saveAs } from "file-saver";
import { kindleToMarkdown } from "./kindleToMarkdown";

const fileInput = document.getElementById("fileInput") as HTMLInputElement;
fileInput.addEventListener("change", convertAndDownload);

if (isTouch()) {
  const clickPrompt = document.querySelector("#clickPrompt");
  if (clickPrompt?.textContent) {
    clickPrompt.textContent = clickPrompt.textContent.replace("click", "tap");
  }
}

function convertAndDownload(): void {
  const files = fileInput.files;
  if (!files || files.length === 0) return;

  const mdFiles: { fileName: string; content: string }[] = [];
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const html = e.target?.result as string;
      const doc = new DOMParser().parseFromString(html, "text/html");
      mdFiles.push({ fileName: file.name, content: kindleToMarkdown(doc) });
      if (mdFiles.length === files.length) {
        for (const f of mdFiles) {
          const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
          const fileName = f.fileName.replace(".html", ".md").replace("Notebook", "Kindle Notes");
          saveAs(blob, fileName);
        }
      }
    };
    reader.readAsText(file);
  }
}

function isTouch(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
