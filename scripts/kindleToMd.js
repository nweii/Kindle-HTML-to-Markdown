// let convertBtn = document.getElementById('convertBtn');
// convertBtn.addEventListener('click', convertAndDownload);
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", function() {
	convertAndDownload(fileInput.files);
});

function convertAndDownload() {
	let fileInput = document.getElementById('fileInput');
	let files = fileInput.files; // an array
	let md_files = []; // array for the converted files
	for (let i = 0; i < files.length; i++) {
		let file = files[i];
		let reader = new FileReader();
		reader.onload = function(e) {
			let html = e.target.result;
			// Create a DOM parser
			let parser = new DOMParser();
			// Parse the HTML string
			let doc = parser.parseFromString(html, "text/html");
			// Run the script function to convert the HTML to Markdown here
			let md = kindleToMarkdown(doc);
			md_files.push({ fileName: file.name, content: md });
			if (md_files.length === files.length) {
				md_files.forEach(function(file) {
					let blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
					let fileName = file.fileName.replace(".html", ".md").replace("Notebook","Kindle Notes");
					saveAs(blob, fileName);
				});
			}
		};
		reader.readAsText(file);
	}
}

function kindleToMarkdown(doc) {
	const container = doc.querySelector('.bodyContainer').getElementsByTagName('div');
	const title = doc.querySelector('.bookTitle').textContent.trim();
	let authors = doc.querySelector('.authors').textContent.trim();
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
	// loop over each element in the document
	for (let el = 0; el < container.length; el++) {
		let tag = container[el];
		if (tag.className === 'sectionHeading') {
			md += `## ${tag.textContent.trim()}\n`;
		} else if (tag.className === 'noteHeading') {
			// Notes and highlights are stored in the next sibling tag
			if (tag.textContent.includes('Bookmark')) {
				md += tag.textContent.trim().replace("Bookmark -","*Bookmark* at") + '\n\n';
			} else {
				const text = tag.nextElementSibling.textContent.trim();
				if (tag.textContent.includes('Note')) {
					md += `${text}\n\n`;
				} else if (tag.textContent.includes('Highlight')) {
					md += `> ${text}\n\n`;
				}
			}
		}
	}
	return md;
}