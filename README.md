# kindle2md

A small web utility that converts Kindle highlight HTML exports into Markdown, perfect for Obsidian and similar note-taking apps. Runs entirely in your browser — your files never leave your computer.

In the Kindle app, share a book's highlights/notes/bookmarks as HTML (via the Share → Export Notes flow), then drop the file into kindle2md.

## Features

- Drop in one or many `.html` exports → get one `.md` per file
- Customize the output via an editable [Handlebars](https://handlebarsjs.com/) template, with a built-in cheat sheet of available variables
- Optional "Open in Obsidian" mode hands each note off to your last-active vault via `obsidian://new`
- Template + settings persist in `localStorage`; export/import as a versioned JSON blob

## Local development

```bash
bun install
bun run dev      # serves src/index.html with HMR
bun test         # runs the test suite (extract + template)
bun run build    # writes the production bundle to ./dist
```

Tested with Bun 1.3+. Deployed via Vercel (`bun run build` → `dist/`).
