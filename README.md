# serve-my-md

A tiny CLI to generate a static docs website from markdown files.

## Detailed docs will be released soon

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

## Coming soon

- `dev` command support will be released soon.
