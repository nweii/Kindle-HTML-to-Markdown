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
  const title = titleEl.textContent!.trim().replace(/:/g, " - ");
  let authors = authorsEl.textContent!.trim();
  if (authors.split(",").length === 2) {
    // Single author exported as "Last, First" — swap to "First Last"
    authors = authors.replace(/(.+),(.+)/u, "$2 $1").trim();
  }

  let md = `---
title: ${title}
author: ${authors}
aliases: ['"${title}" by ${authors}']
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
