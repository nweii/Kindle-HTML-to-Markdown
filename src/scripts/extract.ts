export type KindleEntry =
  | { type: "highlight"; text: string; location: string; color?: string }
  | { type: "note"; text: string; location: string }
  | { type: "bookmark"; location: string };

export type KindleSection = {
  heading: string;
  entries: KindleEntry[];
};

export type KindleData = {
  title: string;
  author: string;
  date: Date;
  sections: KindleSection[];
};

// Older XHTML-flavored Kindle exports (Mac/PC desktop app) wrap headings in
// <h2 class='sectionHeading'> / <h3 class='noteHeading'> with malformed nesting:
//   <h3 class='noteHeading'>...</div><div class='noteText'>...</h3>
// HTML5 parsers can't put <div> inside <h3>, so the noteText divs leak out of
// .bodyContainer and swallow trailing siblings — yielding a parse with title
// and author intact but zero highlights. Renaming h2/h3 (and their closers) to
// div makes the existing div-pair structure well-formed without touching the
// modern (already div-based) format.
export function normalizeKindleHtml(html: string): string {
  return html
    .replace(/<h2(\s[^>]*class\s*=\s*['"]sectionHeading['"][^>]*)>/gi, "<div$1>")
    .replace(/<h3(\s[^>]*class\s*=\s*['"]noteHeading['"][^>]*)>/gi, "<div$1>")
    .replace(/<\/h2>/gi, "</div>")
    .replace(/<\/h3>/gi, "</div>");
}

// Independent sanity check that runs after extraction. Counts the raw
// `class='noteHeading'` markers in the source HTML and compares to how many
// entries we actually extracted. A shortfall means our parser silently dropped
// content — usually an unfamiliar export format. This is a lower bound, not a
// guarantee: the regex doesn't validate that each marker is a complete entry.
export function auditExtraction(html: string, data: KindleData): string[] {
  const warnings: string[] = [];

  const markerCount = (html.match(/class\s*=\s*['"]noteHeading['"]/gi) ?? []).length;
  const extractedCount = data.sections.reduce((n, s) => n + s.entries.length, 0);

  if (markerCount > extractedCount) {
    const lost = markerCount - extractedCount;
    if (extractedCount === 0) {
      warnings.push(
        `Found ${markerCount} highlight/note marker(s) in the source but couldn't parse any of them. The export format may not be supported — please report this with a copy of the file.`,
      );
    } else {
      warnings.push(
        `Extracted ${extractedCount} entries but the source HTML contains ${markerCount} marker(s). ${lost} entr${lost === 1 ? "y appears" : "ies appear"} to be missing — the export format may have unfamiliar quirks.`,
      );
    }
  }

  return warnings;
}

export function extractKindleData(doc: Document): KindleData {
  const bodyContainer = doc.querySelector(".bodyContainer");
  const titleEl = doc.querySelector(".bookTitle");
  const authorsEl = doc.querySelector(".authors");

  if (!bodyContainer || !titleEl || !authorsEl) {
    throw new Error(
      "This file doesn't look like a Kindle notebook HTML export. In the Kindle app, use Share → Export Notes to get a compatible file.",
    );
  }

  const title = titleEl.textContent!.trim().replace(/\s*:\s*/g, " - ");

  let author = authorsEl.textContent!.trim();
  const authorParts = author.split(",").map((s) => s.trim());
  if (authorParts.length === 2 && !/\s/.test(authorParts[0]!)) {
    // Single author exported as "Last, First Middle" — swap to "First Middle Last".
    // Skip when first part has whitespace (indicates a real "First Last, First Last" co-author list).
    author = `${authorParts[1]} ${authorParts[0]}`;
  }

  const sections: KindleSection[] = [];
  let current: KindleSection = { heading: "", entries: [] };

  const divs = bodyContainer.getElementsByTagName("div");
  for (let i = 0; i < divs.length; i++) {
    const tag = divs[i]!;
    if (tag.className === "sectionHeading") {
      if (current.heading !== "" || current.entries.length > 0) {
        sections.push(current);
      }
      current = { heading: tag.textContent!.trim(), entries: [] };
    } else if (tag.className === "noteHeading") {
      const heading = tag.textContent!.trim();
      const text = tag.nextElementSibling?.textContent?.trim() ?? "";

      if (heading.startsWith("Bookmark")) {
        const m = heading.match(/^Bookmark\s*-\s*(.+)$/);
        current.entries.push({ type: "bookmark", location: m?.[1] ?? heading });
      } else if (heading.startsWith("Highlight")) {
        const colorMatch = heading.match(/Highlight\s*\(([^)]+)\)/);
        const locationMatch = heading.match(/^Highlight\s*\([^)]*\)\s*-\s*(.+)$/);
        const entry: KindleEntry = {
          type: "highlight",
          text,
          location: locationMatch?.[1] ?? heading,
        };
        if (colorMatch?.[1]) entry.color = colorMatch[1];
        current.entries.push(entry);
      } else if (heading.startsWith("Note")) {
        const m = heading.match(/^Note\s*-\s*(.+)$/);
        current.entries.push({ type: "note", text, location: m?.[1] ?? heading });
      }
    }
  }

  if (current.heading !== "" || current.entries.length > 0) {
    sections.push(current);
  }

  return { title, author, date: new Date(), sections };
}
