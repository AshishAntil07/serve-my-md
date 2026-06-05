# serve-my-md Docs

Welcome to the docs for `serve-my-md`.

A tiny CLI to generate a static docs website from markdown files.

- [Why serve-my-md?](/why-serve-my-md)
- [Getting Started](/getting-started)
- [CLI Reference](/cli-reference)

### Guide

- [Routing and Sidebar Patterns](/routing-and-sidebar-patterns)
- [Markdown and Rendering](/markdown-and-rendering)
- [Build Output and Assets](/build-output-and-assets)

### Configuration

- [SMM Config](/smm-config)
- [SMM Ignore](/smm-ignore)

### Examples

- [Structure Examples](/structure-examples)
- [Config Examples](/config-examples)

## Future goals

- **Search Indexing** — structured search index for smarter results
- **Config validation** — Zod-based schema validation of `smm.config.json` with JSON Schema export
- **Sitemap** — automatic `sitemap.xml` generation
- **Per-page Open Graph** — page-level og tags from frontmatter
- **Doctor command** — health checks: config validation, route discovery, broken link detection, and more
- **Link validation** — flag invalid internal links at build-time
- **Optional RSS** — config-enableable RSS feed for blog/changelog content
- **SchemaStore upload** — publish JSON Schema to SchemaStore once stable
