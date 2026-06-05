# Why serve-my-md?

## Zero-friction static site

serve-my-md generates a **completely static site** — every page is a standalone HTML file with pre-rendered content. No server, no database, no build-time backend. Deploy anywhere: CDN, GitHub Pages, Netlify, Vercel, S3, or a simple static file server.

## Blazing fast

Static HTML means instant first paint. After load, the React SPA takes over for seamless client-side navigation with intent-based preloading.

## Rich markdown support

- Full markdown-it pipeline with footnotes, task lists, and configurable options
- Prism.js syntax highlighting for dozens of languages
- Configurable markdown-it options via `smm.config.json`

## Custom ordering

Control your page order with numeric filename prefixes:

```text
1. intro.md
2. setup.md
3. advanced.md
```

Set `trimIndexFromPath: true` in config and the prefixes are stripped from URLs while ordering is preserved.

## Minimal yet powerful config

A single `smm.config.json` at your docs root is all you need. Override titles, theme, fonts, Open Graph tags, and more — or use the sensible defaults and get going immediately.

## SEO built-in

Every page is a full HTML document with:

- Unique `<title>` and `<meta description>`
- Open Graph tags for social previews
- Pre-rendered content in the HTML — search engines see everything
- Semantic HTML structure

## Great user experience

- **Site-wide search** — instant full-text search with keyboard shortcut (Ctrl+Shift+F)
- **Accessibility** — keyboard navigation, ARIA labels, semantic landmarks
- **Light/dark themes** — automatic or user-toggleable
- **Responsive** — works on desktop and mobile
- **Breadcrumbs** — clear navigation context
- **Keyboard shortcuts** — quick navigation between pages
