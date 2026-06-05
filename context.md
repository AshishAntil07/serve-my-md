# serve-my-md — Project Context

## What it is

A tiny CLI that generates a fully static docs website from a directory of markdown files. Every page is a standalone `.html` file with pre-rendered content (SSG). The React SPA hydrates on load for seamless client-side navigation.

npm: `serve-my-md` — repo: `github.com/AshishAntil07/serve-my-md`

## Architecture

Monorepo with pnpm workspaces:

```
serve-my-md/
  cli/          — CLI logic (tsup build → bin/index.js)
  web/          — React SPA (Vite + TanStack Router + Tailwind)
  shared/       — TypeScript types and constants shared between CLI and web
  bin/          — CLI entry point (bundled output)
  index.html    — root HTML template used by SSG
  .html         — symlink/file for vite dev (copies of template)
```

### CLI (`cli/`)

- Entry: `cli/src/index.ts`
- Core logic: `cli/src/core/index.ts` (file scanning, markdown parsing, route tree building, SSG HTML generation)
- Build pipeline: `cli/src/core/build.ts` (orchestrates the full build)
- Shared: `cli/src/shared.ts` (markdown parser, config, ignore rules)
- Utils: `cli/src/utils/index.ts` (slugify, trimIndexFromPath, cleanName, route tree functions)
- Config defaults: `cli/src/smm.config.json`

### Web app (`web/`)

- Entry: `web/src/main.tsx`
- App: `web/src/App.tsx` (sidebar + content layout)
- Components in `web/src/components/`
- Sidebar renders route tree with grouper labels, collapsible dirs, and links
- Search, keyboard shortcuts, breadcrumbs, themes, responsive layout

### Shared (`shared/`)

- `index.d.ts` — `Out`, `Route`, `RouteTree` types; `isGrouper` flag on RouteTree nodes
- `constants.json` — `STATIC_TEMP_CONTENT_PREFIX`

## Key Features

### SSG (Static Site Generation)

`buildDistRoutesFromRouteTree` generates a `.html` file per route with pre-rendered markdown content in the `#app` div. SEO-friendly: search engines see all content. After JS loads, React hydrates for client-side navigation.

Build flow:

1. Scan markdown files → build route tree
2. Parse markdown → route content JSON
3. Write `.generated/output.json` and `.generated/paths.json`
4. Vite build (CSS + JS bundles)
5. Generate per-route static HTML files
6. Copy `dist/` to target docs directory

### Groupers

Directories named `(Name)` act as **groupers**:

- Shown as labeled section in sidebar (not collapsible)
- Skipped from URL pathname segments
- Cannot contain `index.md`
- Can be ordered with numeric prefixes: `(1. Guide)`
- Files inside a grouper sit at the grouper's URL level (no extra path segment)

Sort order rules (when `sortRoutes: true`):

1. `index.md` always first
2. Regular files/directories sorted next (by label with numeric prefixes)
3. Groupers sorted last (by label with numeric prefixes), after ALL regular items
4. Within each tier, ordering is controlled by numeric prefixes + `localeCompare`
5. Grouper indexes never collide with regular file/directory indexes — they operate in separate sort tiers

### Regular directories (non-groupers)

- Appear as collapsible sidebar containers
- Can have `index.md` as a clickable landing page
- Included in URL pathname segments of child files
- If a dir contains only `index.md` with no other children, it collapses to a leaf node

### Routing

- `index.md` = landing page, never in URL pathname, maps to `""` in route tree
- Filename slugification: lowercase, spaces/underscores → `-`, punctuation removed
- Groupers `(Name)` excluded from pathname
- `trimIndexFromPath: true` strips numeric prefixes from emitted route names

### Config (`smm.config.json`)

Options: `rootTitle`, `description`, `markdownItOptions`, `baseRoute`, `publicPath`, `defaultTheme`, `favicon`, `logo`, `name`, `showNameWithLogo`, `og`, `sortRoutes`, `trimIndexFromPath`, `version`, `fonts` (title/body/mono with name + url)

### Markdown

markdown-it with footnotes, task list plugins. Prism.js syntax highlighting with auto language loading. `linkify` enabled, `fuzzyEmail` disabled. Configurable via `markdownItOptions`.

### Ignore (`.smmignore`)

Glob-based ignore rules. Lines starting with `#` are comments. `!` prefix to un-ignore. Evaluated top-to-bottom.

### Web UI features

- Full-text search (`Ctrl+Shift+F`)
- Keyboard nav: next page (`Alt+Enter`), prev page (`Alt+Shift+Enter`)
- Intent-based link preloading
- Light/dark theme toggle
- Responsive layout
- Breadcrumbs
- Accessibility (keyboard nav, ARIA labels)

## Version

1.0.2 — published to npm as `serve-my-md`

## Docs

Separate git worktree at `../serve-my-md-docs` (gitdir: `.git/worktrees/serve-my-md-docs`).

### Docs structure

```
serve-my-md-docs/
  index.md
  Why serve-my-md.md
  1. Getting Started.md
  2. CLI Reference.md
  (1. Guide)/
    3. Routing and Sidebar Patterns.md
    7. Markdown and Rendering.md
    8. Build Output and Assets.md
  (2. Configuration)/
    4. SMM Config/
      index.md
      1. Defaults and Options.md
      2. Trim and Ordering.md
    5. SMM Ignore/
      index.md
  (3. Examples)/
    1. Structure Examples.md
    2. Config Examples.md
  smm.config.json
  .smmignore
  dist/        — built output (SSG-generated site)
```

Docs are built with `trimIndexFromPath: true` and `sortRoutes: true`.

### Future goals (documented in index.md, Getting Started, CLI Reference, README)

- Search Indexing
- Config validation + JSON Schema export with Zod
- Sitemap generation
- Per-page Open Graph (frontmatter)
- Doctor command (health checks)
- Link validation at build-time
- Optional RSS feed
- SchemaStore upload

## Build

```bash
pnpm build              # build CLI (tsup)
pnpm dev                # watch mode
pnpm start              # run CLI
pnpm dev:web            # vite dev server (port 3000)
pnpm build:web          # vite build web app
pnpm test               # vitest (CLI)
pnpm test:web           # vitest (web)
```

CLI entry: `node bin/index.js --directory <path>`

## Technical details to be aware of

- Sort happens on RAW labels (before trimming) — numeric prefixes affect lexicographic sort order
- `cleanNestedPaths` runs AFTER `sortRoutes` — trims labels and pathSegments
- `publicPath` directory is automatically excluded from markdown scanning
- `makeRoutesOfNestedPaths` vs `makeRoutesOfNestedPathsRaw`: Raw uses original path segments before cleaning, doesn't handle groupers; clean version skips groupers in path building
- `buildDistRoutesFromRouteTree` skips grouper nodes (no HTML generated for them), recursing into their children with the same URL prefix
- The template `index.html` uses `{{content}}`, `{{distAssets}}`, `{{og}}`, `{{title}}`, `{{description}}`, `{{favicon}}`, `{{fonts}}` placeholders
- Loading screen CSS (spinner animation) on `body.loading`, removed on React mount
- Sidebar groupers render as `<div>` with label text; regular directories render as Radix `Collapsible`
