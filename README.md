# kindle2md

Convert Kindle highlight HTML exports into Markdown, in your browser. Built for Obsidian and other Markdown-based note apps.

Drop one or many `.html` files exported from the Kindle app — get one `.md` per file, with YAML frontmatter, headings, blockquoted highlights, and notes/bookmarks. Customize the output template to match whatever vault format you use.

The conversion runs entirely in the browser. Your files never leave your device — no server, no upload, no analytics.

## How to use

1. In the Kindle app, open a book's notebook and tap **Share → Export Notes**. You'll get an HTML attachment.
2. Drop the `.html` file (or several at once) onto the dropzone at the top of the page.
3. Pick what happens with the result via the **When conversion finishes** select:
   - **Download Markdown file** (default) — one `.md` per input.
   - **Copy to clipboard** — the rendered Markdown lands on your clipboard. Multiple files are joined by `---` separators in one buffer.
   - **Open in Obsidian** — each file is handed to Obsidian's `obsidian://new` URL handler in your last-active vault.

## Features

- **Multi-file conversion.** Drop many `.html` files at once; one `.md` per input.
- **YAML frontmatter** with `title`, `author`, and `aliases`, ready for Obsidian.
- **Three output modes** — download, copy to clipboard, or hand off to Obsidian.
- **Both Kindle export formats supported.** The older `Highlight (Yellow) - …` heading and the newer markup with `<span class="annotation_yellow">…</span>` color spans both parse correctly.
- **Customizable [Handlebars](https://handlebarsjs.com/) template** with subtle in-editor syntax highlighting. The full set of variables, helpers, and date-formatting tokens is documented in a built-in reference panel. The template auto-saves to the device's localStorage as you type.
- **Live preview.** Toggle between editing the template source and previewing it rendered against a baked-in sample dataset, so you can iterate without dropping a real file each time.
- **Copy template to clipboard** for sharing or backup. The button shows an in-place "Copied" confirmation.

## Custom templates

The default template produces this for each book:

```markdown
---
title: ...
author: ...
aliases: ['"..." by ...']
---
## Highlights
From *...* by ...:

### Section heading
> A highlight.

A note.

*Bookmark* at Chapter 2 > Page 25 · Location 410
```

The template is [Handlebars](https://handlebarsjs.com/). Below is everything you can use; the same reference is also available inline in the customize panel.

### Inserting values

Wrap a name in double curly braces. Built-in values:

- `{{title}}` — the book's title
- `{{author}}` — the author or author list
- `{{date}}` — the moment of conversion (use the `formatDate` helper below to render it)

### Looping over chapters & entries

`{{#each sections}} … {{/each}}` repeats its inner block once per chapter. Inside the loop:

- `{{heading}}` — the chapter name (may be empty for entries before any heading)
- `{{#each entries}} … {{/each}}` — repeats once per highlight, note, or bookmark

Inside an entry:

- `{{type}}` — `"highlight"`, `"note"`, or `"bookmark"`
- `{{text}}` — the highlighted or noted text
- `{{location}}` — Kindle's location string (e.g. `Chapter 1 > Page 19 · Location 285`)
- `{{color}}` — only present for highlights

### Showing only one kind of entry

Combine `{{#if}}` with the `eq` helper to render only highlights (or only notes, or only bookmarks):

```handlebars
{{#if (eq type "highlight")}}> {{text}}{{/if}}
```

### Formatting dates

Pass `{{date}}` to the `formatDate` helper with a format string:

| Template | Output |
|---|---|
| `{{formatDate date "yyyy-MM-dd"}}` | `2024-01-05` |
| `{{formatDate date "MMMM d, yyyy"}}` | `January 5, 2024` |
| `{{formatDate date "yyyy-MM-dd[T]HH:mm"}}` | `2024-01-05T08:04` |

Wrap literal characters in `[brackets]` so they aren't interpreted as tokens (the `T` in ISO timestamps, for example).

Tokens (examples for Jan 5, 2024 at 08:04:09):

| Token | Meaning | Example |
|---|---|---|
| `yyyy` / `yy` | year | `2024` / `24` |
| `MMMM` / `MMM` | month name | `January` / `Jan` |
| `MM` / `M` | month number | `01` / `1` |
| `dd` / `d` | day of month | `05` / `5` |
| `HH` / `H` | hour (24h) | `08` / `8` |
| `mm` / `m` | minute | `04` / `4` |
| `ss` / `s` | second | `09` / `9` |

### YAML-safe text

If you embed a value inside a single-quoted YAML string (the default `aliases` field does this), wrap it with `{{yamlEscape …}}` to double any apostrophes — otherwise titles like *Surely You're Joking, Mr. Feynman!* break the YAML parser.

## Privacy

No file ever leaves your device — there's no server-side component. Your settings (template + chosen output mode) are stored in your browser's localStorage on the current device only.

## Known limitations

- **Multi-paragraph highlights are flattened.** When you select across multiple paragraphs in the Kindle app, Kindle merges those paragraphs into a single block of text *before* writing the HTML export. The paragraph breaks aren't recoverable from the export, so the converted Markdown reflects what Kindle gave us.

## Local development

```bash
bun install
bun run dev      # bun's HTML dev server with HMR (Tailwind plugin via bunfig.toml)
bun test         # extract + template tests via happy-dom
bun run build    # writes dist/index.html, .css, .js
```

Tested with Bun 1.3+. Deployed on Vercel (`bun run build` → `dist/`).

## Architecture

- `src/index.html` — entry. Dropzone + collapsible customize panel inside one nested "platter" card.
- `src/styles.css` — Tailwind v4 (via `bun-plugin-tailwind`) plus the `.platter`/`.platter-pad`/`.platter-inner-card` classes that drive concentric corner radii via `calc()` from a single `--platter-radius` knob.
- `src/scripts/extract.ts` — `extractKindleData(doc): KindleData`. Pure function: takes a parsed `Document`, returns `{ title, author, date, sections: [{ heading, entries: [{ type, text, location, color? }] }] }`.
- `src/scripts/template.ts` — `DEFAULT_TEMPLATE`, `renderTemplate(data, template)`, `formatDate`, `tryCompileTemplate` (debounced edit-time validation), `highlightHandlebars` (syntax overlay), `SAMPLE_DATA` (used by the preview toggle).
- `src/scripts/settings.ts` — localStorage I/O + `buildObsidianUri`.
- `src/scripts/main.ts` — DOM glue: file input, accordion, preview toggle, copy/reset, conversion loop.
- `tests/extract.test.ts`, `tests/template.test.ts` — 27 tests via Bun's runner with `@happy-dom/global-registrator` for `DOMParser`.
- `tests/fixtures/*.html` — minimal Kindle-shaped exports covering single-author name swap, multi-author, all entry types, modern color-span format, empty body, and a missing-noteText edge case.
- `build.ts` — production bundle entry (`Bun.build` + `bun-plugin-tailwind`, minified).

## License

[CC0-1.0](./LICENSE.md) — public domain. Use it however you like.
