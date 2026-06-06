# Key Behaviors

## Internal links auto-prepend `baseRoute`

When you set a `baseRoute` in `smm.config.json` (e.g. `/docs`), any internal markdown link (`[text](/some-page)`) automatically has that base prepended during navigation. You never need to manually prefix links with the base route — change it in one place and all links adapt.

## Sorting and indexing

Pages, directories, and groupers are sorted automatically when `sortRoutes: true`:

1. `index.md` always comes first.
2. Regular files and directories come next, sorted lexicographically.
3. Groupers `(Name)` come last, after all regular items.

Numeric prefixes on filenames (`1. intro.md`, `2. setup.md`) control ordering within each tier. The prefix is stripped from the emitted URL when `trimIndexFromPath: true`.

Grouper indexes only affect order among other groupers — they never collide with file/directory indexes since groupers always sort after regular items.

## SSG pre-rendering

Every page is a standalone `.html` file with pre-rendered markdown content baked into the DOM. Search engines see the full content immediately. After the page loads, the React SPA hydrates and takes over for seamless client-side navigation.

## Groupers

Directories named `(Name)` act as groupers:

- Rendered as a labeled section in the sidebar (not collapsible).
- Skipped from URL pathnames — files inside sit at the grouper's parent URL level.
- Cannot contain `index.md`.
- Can be ordered with numeric prefixes: `(1. Guide)`, `(2. Reference)`.

## Client-side link interception

Internal markdown links (`[text](/path)`) are intercepted by the SPA router — navigating them does not cause a full page reload. External links (`https://...`) open normally.

## Intent-based preloading

When you hover over or touch a link, its content is preloaded in the background. Navigation feels instant because the data is ready before you click.

## Auto-slug generation

Route path segments are automatically normalized:

- Lowercased
- Spaces and underscores become `-`
- Punctuation (`.,;"'\\:<>`?!`) is removed
- Grouper directory names like `(Group)` are excluded entirely

No need to manually craft URL-safe filenames.

## `index.md` as landing page

- `index.md` represents the landing page for its directory.
- It is never included in the URL pathname — internally maps to `""`.
- If a directory contains only `index.md` and no other files, it collapses to a leaf node (no collapsible).

## `publicPath` auto-copy and auto-exclude

If `publicPath` is set in config, that directory is:

- Copied into the web app's public assets before the Vite build.
- Automatically excluded from markdown scanning — no need to also add it to `.smmignore`.

## Config merge with sensible defaults

`smm.config.json` is merged over built-in defaults. You only need to specify what you want to override. Missing options fall back to the CLI's internal defaults — the config file is entirely optional.

## `.smmignore` glob patterns

Create `.smmignore` at your docs root to exclude paths during markdown traversal:

- Lines starting with `#` are comments.
- Empty lines are ignored.
- Prefix with `!` to un-ignore.
- Patterns are evaluated top-to-bottom, last match wins.
