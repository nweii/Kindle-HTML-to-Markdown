# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The README covers what the tool does, how to use it, the templating syntax, and the bird's-eye architecture. This file captures the things that are *non-obvious from the source* and easy to miss when making changes.

## Critical: keep the AI prompt in sync with the actual codebase

`src/scripts/template.ts:buildAiPrompt(currentTemplate)` builds the prompt copied by the "Copy AI prompt" button in the reference panel. It contains a hand-written description of:

- the `KindleData` TypeScript shape
- the three custom Handlebars helpers (`eq`, `yamlEscape`, `formatDate`) and their behavior
- the date format token table
- a snapshot of `DEFAULT_TEMPLATE` and `SAMPLE_DATA`
- the explicit "don't invent other helpers" guardrail and the "respond with the FULL updated template in a ```handlebars code block" closer

**Whenever you change any of those things — add a helper, change a token, alter the data shape, modify the default template, change the sample data, change which helpers are registered with Handlebars — you must update `buildAiPrompt` to match.** Out-of-sync = the AI on the other end will hallucinate APIs that don't exist (or miss real ones), which silently corrupts user templates. The `tests/template.test.ts` suite covers some of this but doesn't pin every detail; manual diff against `template.ts` after any helper/data-shape change.

## Build + test commands

```bash
bun install
bun run dev        # bun's HTML dev server with HMR (Tailwind plugin via bunfig.toml)
bun test           # runs all tests in tests/
bun test extract   # runs only tests/extract.test.ts
bun test template  # runs only tests/template.test.ts
bun test -t "swap" # runs tests whose name matches the substring
bun run build      # writes dist/index.html, .css, .js (production, minified)
bun run clean      # rm -rf dist
bunx tsc --noEmit  # type-check without emitting
```

Tests use `@happy-dom/global-registrator` preloaded via `bunfig.toml` to provide `DOMParser` etc. as globals. Test fixtures (`tests/fixtures/*.html`) are minimal hand-written Kindle-shaped HTML — keep them small and labeled by what edge case they cover.

## Architecture you'd otherwise have to read multiple files to understand

### Pure extract → render is the load-bearing split

`extract.ts:extractKindleData(doc)` is **pure** — given a parsed `Document`, returns a structured `KindleData` object with no DOM/IO/global state. `template.ts:renderTemplate(data, template)` is **pure-ish** (Handlebars compile is cached on a single-entry cache keyed by template string).

`main.ts` is the only DOM glue. **Don't merge logic into main.ts** — keeping extract + render pure is what makes them testable and what makes the live preview feature even possible. If you're tempted to add browser APIs to either of those modules, the call site in `main.ts` should pass the data in instead.

### `templateInput` is a *view* of the canonical `template` variable

`main.ts` keeps the canonical template in a `template` module-level variable (read from localStorage via `loadTemplate()`). The `<textarea>` is just a render target for that variable, switched between two views by `renderTemplateView()`:

- **edit mode** — textarea shows the raw template source, syntax-highlighted by the `<pre>` overlay
- **preview mode** — textarea shows `renderTemplate(SAMPLE_DATA, template)` rendered output, read-only, no Handlebars highlighting

Reset, Import (removed), and any future operation that mutates the template should:
1. Update the `template` variable
2. Call `saveTemplate(template)`
3. Call `syncResetEnabled()`
4. Call `renderTemplateView()` — never assign `templateInput.value` directly outside of `renderTemplateView`

This invariant prevents the textarea from ever desyncing from the canonical state across mode toggles.

### Syntax highlighting is a textarea-over-pre overlay

`<pre id="templateHighlight">` is `absolute inset-0` behind a transparent `<textarea>`. JS keeps `pre.innerHTML = highlightHandlebars(textarea.value)` and copies `scrollTop`/`scrollLeft` on `input` and `scroll` events. Both elements need **identical** font-family, font-size, line-height, padding, and white-space behavior or the highlight visibly drifts off the typed characters. Mobile note: both use `text-base sm:text-xs` because Safari iOS auto-zooms when an input's font is below 16px.

### Concentric corner radii are derived from one CSS variable

`styles.css` defines `.platter`/`.platter-pad`/`.platter-pad-no-bottom`/`.platter-pad-no-top`/`.platter-inner-card` with the inner radius computed as `calc(var(--platter-radius) - var(--platter-padding))`. To change the look, **edit `--platter-radius` (or `--platter-padding`) in `styles.css`** — every nested card (dropzone, textarea wrapper, all buttons, reference panel) follows automatically. Don't reach for `rounded-md` etc. on inner card elements; use `.platter-inner-card` so the family stays in sync.

### Output mode is a single discriminated string in localStorage

`settings.ts:OutputMode = "download" | "clipboard" | "obsidian"` (default `"download"` is not persisted — only non-default values get a localStorage entry). The `convertAll` dispatch in `main.ts` branches on this. When adding a new output mode: extend the union, add an entry to `OUTPUT_MODE_HELP` in `main.ts`, add an `<option>` in `index.html`, and add a branch to `convertAll`. The localStorage key is `kindleToMd.outputMode` (template key is `kindleToMd.template`).

### Error UX: alert() for conversion failures, inline flash for template editor

Conversion failures (per-file or total) use `window.alert()` — they bubble out of the collapsed customize panel where the inline status `<p>` lives. Template syntax errors (debounced 350ms during typing) and Preview render errors stay as inline flash, since the user is already looking at the customize panel. `confirm()` guards the destructive Reset button. Don't move conversion errors back to inline flash — they got missed when they were there.

### Kindle export quirks the parser handles (and one it can't)

- **Two `noteHeading` formats:** old (`Highlight (Yellow) - …`) and new (`Highlight(<span class="annotation_yellow">yellow</span>) - …`). Both parse via the regex in `extract.ts`.
- **`Last, First` author swap:** only triggers when there's exactly one comma AND the part before it has no whitespace, so a real two-author list like `"First Last, Second Author"` is left alone.
- **Title `:` collapse** uses `\s*:\s*` to avoid double-spacing.
- **YAML aliases line** uses `{{yamlEscape}}` to double apostrophes — required for titles like *Surely You're Joking…*.
- **Multi-paragraph highlights are flattened by Kindle itself** before we see the file. There is nothing we can do about it. Don't try to "fix" it by hunting for `<br>` or `<p>` in the noteText — they aren't there.

## Deployment

Vercel project; `vercel.json` runs `bun install` and `bun run build` to produce `dist/`. The repo URL on GitHub is `nweii/kindle2md` (recently renamed from `Kindle-HTML-to-Markdown`; GitHub auto-redirects the old URL but Vercel may still show the old URL in its Git settings — that's cosmetic).

Bundle weight to be aware of when adding deps: Handlebars runtime is the bulk (~25KB gzipped on top of an otherwise ~5KB bundle). Don't reach for additional template engines or date libraries — the `formatDate` helper in `template.ts` is a moment-style token mapper backed by `Intl.DateTimeFormat`, intentionally zero-dep.
