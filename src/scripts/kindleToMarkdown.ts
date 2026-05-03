export function kindleToMarkdown(doc: Document): string {
  const bodyContainer = doc.querySelector(".bodyContainer");
  const titleEl = doc.querySelector(".bookTitle");
  const authorsEl = doc.querySelector(".authors");

  if (!bodyContainer || !titleEl || !authorsEl) {
    throw new Error(
      "Input does not look like a Kindle notebook export (missing .bodyContainer, .bookTitle, or .authors).",
    );
  }

  const container = bodyContainer.getElementsByTagName("div");
  const title = titleEl.textContent!.trim().replace(/\s*:\s*/g, " - ");
  let authors = authorsEl.textContent!.trim();
  const authorParts = authors.split(",").map((s) => s.trim());
  if (authorParts.length === 2 && !/\s/.test(authorParts[0]!)) {
    // Single author exported as "Last, First Middle" — swap to "First Middle Last".
    // Skip when first part has whitespace (indicates a real "First Last, First Last" co-author list).
    authors = `${authorParts[1]} ${authorParts[0]}`;
  }

  let md = `---
title: ${title}
author: ${authors}
aliases: ['"${yamlSingleQuoteEscape(title)}" by ${yamlSingleQuoteEscape(authors)}']
---
## Highlights
From *${title}* by ${authors}:

`;

  for (let el = 0; el < container.length; el++) {
    const tag = container[el]!;
    if (tag.className === "sectionHeading") {
      md += `### ${tag.textContent!.trim()}\n`;
    } else if (tag.className === "noteHeading") {
      const headingText = tag.textContent!;
      if (headingText.includes("Bookmark")) {
        md += headingText.trim().replace("Bookmark -", "*Bookmark* at") + "\n\n";
      } else {
        const text = tag.nextElementSibling?.textContent?.trim() ?? "";
        if (headingText.includes("Note")) {
          md += `${text}\n\n`;
        } else if (headingText.includes("Highlight")) {
          md += `> ${text}\n\n`;
        }
      }
    }
  }
  return md;
}

// In single-quoted YAML strings, a literal apostrophe is escaped by doubling it.
function yamlSingleQuoteEscape(s: string): string {
  return s.replace(/'/g, "''");
}
