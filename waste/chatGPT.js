const title = document.querySelector('.bookTitle').textContent;
const authors = document.querySelector('.authors').textContent;
const sections = Array.from(document.querySelectorAll('.sectionHeading')).map(el => el.textContent);
const notes = Array.from(document.querySelectorAll('.noteHeading')).map(el => {
	const type = el.textContent.split(' ')[0].toLowerCase();
	const location = el.textContent.match(/Location (\d+)/)[1];
	const text = el.nextElementSibling.textContent;
	return { type, location, text };
});

let markdown = `
# ${title}

## Authors

${authors}

`;

for (let section of sections) {
	markdown += `## ${section}`;
}

for (let note of notes) {
	let noteMarkdown = '';
	if (note.type === 'highlight') {
		noteMarkdown += `> **Highlight** - Location ${note.location}\n`;
		noteMarkdown += `> ${note.text}\n`;
	} else if (note.type === 'note') {
		noteMarkdown += `> **Note** - Location ${note.location}\n`;
		noteMarkdown += `> ${note.text}\n`;
	}
	markdown += noteMarkdown;
}
console.log(markdown);