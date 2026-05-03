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

export function extractKindleData(doc: Document): KindleData {
  const bodyContainer = doc.querySelector(".bodyContainer");
  const titleEl = doc.querySelector(".bookTitle");
  const authorsEl = doc.querySelector(".authors");

  if (!bodyContainer || !titleEl || !authorsEl) {
    throw new Error(
      "Input does not look like a Kindle notebook export (missing .bodyContainer, .bookTitle, or .authors).",
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
