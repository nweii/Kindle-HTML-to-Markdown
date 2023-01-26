const container = document.querySelector('.bodyContainer').getElementsByTagName('div');
const title = document.querySelector('.bookTitle').textContent.trim();
let authors = document.querySelector('.authors').textContent.trim();

if (authors.split(',').length === 2) {
	authors = authors.replace(/(.+),(.+)/u, "$2 $1").trim();
};

let md = `---
title: ${title}
author: ${authors}
---
# *${title}*
by ${authors}

## Highlights
From *${title}* by ${authors}:

`;

kindleToMarkdown(md);

function kindleToMarkdown(md) {
	for (let el = 0; el < container.length; el++) {
		let tag = container[el];
		
		if (tag.className === 'sectionHeading') {
			md += `## ${tag.textContent.trim()}\n`;
		} 
		else if (tag.className === 'noteHeading') {
			// Notes and highlights are stored in the next sibling tag
			if (tag.textContent.includes('Bookmark')) {
				md += tag.textContent.trim() + '\n\n';
			}
			else {
				const text = tag.nextElementSibling.textContent.trim();
				
				if (tag.textContent.includes('Note')) {
					md += `${text}\n\n`;
				} 
				else if (tag.textContent.includes('Highlight')) {
					md += `> ${text}\n\n`;
				}
			} 
		}
	}

	return md;
}

console.log(kindleToMarkdown(md));