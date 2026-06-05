# serve-my-md

A tiny CLI to generate a static docs website from markdown files.

## Documentation

Full docs are at [https://ashishantil.dev/serve-my-md](https://ashishantil.dev/serve-my-md).

## Basic usage

```bash
serve-my-md --directory .
```

Run this inside (or pointing to) the folder that contains your markdown docs.

## Commands and options

- `serve-my-md`: scans markdown files, builds the static site, and outputs it in the target directory.
- `-d, --directory <path>`: sets the docs root directory (default: current directory).
- `-i, --interactive`: asks for directory input interactively.

## Optional customization

In your target docs directory, you can optionally create files like `smm.config.json` and `.smmignore` to customize behavior (routing, sorting, ignored paths, etc.).

## Features

- **Static site generation** — every page is a standalone `.html` file with pre-rendered content
- **Groupers** — directory-based sidebar grouping with `(Name)` syntax, excluded from URLs
- **Full-text search** — site-wide search with `Ctrl+Shift+F`
- **Keyboard shortcuts** — quick page navigation
- **Light/dark themes** — automatic or user-toggleable
- **Responsive** — works on desktop and mobile
- **Accessibility** — keyboard navigation, ARIA labels, semantic landmarks
- **Breadcrumbs** — clear navigation context
- **Custom ordering** — numeric filename prefixes with `trimIndexFromPath` config
- **Rich markdown** — footnotes, task lists, syntax highlighting
- **SEO** — per-page OG tags, meta descriptions, pre-rendered content
- **Font customization** — configurable title/body/mono fonts
- **Public assets** — copy static files via `publicPath` config

## Future goals

- **Search Indexing** — structured search index for smarter results
- **Config validation** — Zod-based schema validation of `smm.config.json` with JSON Schema export
- **Sitemap** — automatic `sitemap.xml` generation
- **Per-page Open Graph** — page-level og tags from frontmatter
- **Doctor command** — health checks: config validation, route discovery, broken link detection, and more
- **Link validation** — flag invalid internal links at build-time
- **Optional RSS** — config-enableable RSS feed for blog/changelog content
- **SchemaStore upload** — publish JSON Schema to SchemaStore once stable
