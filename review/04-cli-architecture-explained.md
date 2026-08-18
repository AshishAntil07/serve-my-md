# serve-my-md CLI Architecture

> Pure architectural explanation — how the CLI works from end to end.
> No review, no critique, no alternatives. Web app treated as an opaque consumer.

---

## 1. Entry Point and Initialisation

### CLI Bundle

The CLI is bundled from `cli/src/index.ts` by `tsup` into a single ESM file at `bin/index.js`:

```
tsup → cli/src/index.ts → bin/index.js (ESM, node22 target, shebang added)
```

Externals (`ws`, `mime-types`) are not bundled — they remain as runtime dependencies.

### Startup Sequence (`cli/src/index.ts`)

When a user runs `serve-my-md`, the following happens in order:

**1. Command parsing (lines 19-88)**

A `Command` (from the `commander` library) is created with two subcommands: `build` and `dev`. Each subcommand registers its options and an `.action()` handler. However, instead of letting commander execute the action directly, the handlers use a Promise-based pattern: each action resolves a promise with a `CommandState` object `{ command, handler, options }`.

This is unusual — the `program.parseAsync(process.argv)` is called, but the actions only capture the parsed state rather than executing. The outer code awaits the promise to get the resolved `CommandState`.

The `makeOptions()` helper:

- If `--interactive` is set, prompts the user for a directory via `@inquirer/prompts`
- Resolves the directory to an absolute path
- Validates that the directory exists (exits with code 1 if not)

**2. Config loading (lines 90-97)**

Two files are read from the target directory:

- `.smmignore` — parsed by `parseSmmIgnore()` into a list of glob rules
- `smm.config.json` — parsed by `readConfig()` and shallow-merged over built-in defaults

Both are optional. Missing files produce a no-op default:

- Missing `.smmignore` → `shouldIgnore: () => false`
- Missing `smm.config.json` → empty object `{}`, defaults from `cli/src/smm.config.json` are used

`readConfig` is a simple `JSON.parse(await fs.readFile(...))` wrapped in a try-catch that returns `{}` on failure.

**3. Markdown parser initialisation (lines 99-113)**

A `MarkdownIt` instance is created with:

- Options merged from `finalConfig.markdownItOptions` (defaults: `html: true`, `xhtmlOut: true`, `breaks: true`, `linkify: true`, `typographer: false`)
- A custom `highlight` function using Prism.js with auto-language-loading
- Two plugins: `markdown-it-footnote` and `markdown-it-task-lists`
- `linkify.set({ fuzzyEmail: false })` disables email linkification

**4. State assembly (lines 115-125)**

A `SharedState` object is assembled combining:

- `CommandState` (command, handler, options)
- `UtilState` (finalConfig, mdParser, shouldIgnore)

This is stored in `appState` (a global `State<SharedState>` singleton from `lib/context.ts`).

The `publicPath` config option, if set, is resolved to an absolute path relative to the target directory.

**5. Command dispatch (lines 127-130)**

`state.handler()` is called — this dispatches to `commands.build` or `commands.dev`.

---

## 2. Global State Containers

The state system is in `cli/src/lib/context.ts`. It defines a generic `State<T>` class:

```typescript
class State<T> {
  private context: { state: T | null };

  getState(): T {
    if (!this.context.state)
      throw new Error(name + " state accessed before initialization!");
    return this.context.state;
  }

  setState(newState: T) {
    this.context.state = { ...(this.context.state || {}), ...newState };
  }
}
```

Two singletons are created:

- **`appState`** (`State<SharedState>`) — carries config, markdown parser, ignore function, command options
- **`routeState`** (`State<RouteState>`) — carries the list of markdown file paths (needed by the parser for link validation)

`setState` does a shallow merge — it extends the existing state rather than replacing it. `getState` throws if accessed before initialisation.

---

## 3. The `build` Command

### 3.1 Command Handler (`cli/src/lib/commands.ts`)

The `build` handler calls `build()` from `core/build.ts`. If it returns `true`, logs "Completed successfully." If `false`, logs "Failed."

### 3.2 Top-Level Build (`core/build.ts:29-79`)

```
build() → 1. Remove existing target dist directory
          2. Copy pre-built Vite dist (web/dist/) to target outDir
          3. Copy public assets (if publicPath is configured)
          4. Call buildSite()
```

**Step 1 — Clean:** `await rm(targetDist, { recursive: true })` removes the previous build output. Failure is silently caught (first build has nothing to remove).

**Step 2 — Copy Vite dist:** The pre-built web app bundle (`web/dist/`) is copied recursively to `targetDist`. This includes the Vite-built CSS/JS assets. If this copy fails, the build aborts with an error.

**Step 3 — Copy public assets:** If `publicPath` is configured and the directory exists, its contents are copied into `targetDist`. Failure is logged but does not abort the build.

**Step 4 — Build:** `buildSite()` is called with a `Writer` that writes to the filesystem:

```typescript
async (filePath, content) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
};
```

### 3.3 The Build Pipeline (`core/build.ts:82-236`)

`buildSite(options, state, write)` runs six stages:

#### Stage 1: Scan (`getMarkdownFiles`, lines 92-103)

`getMarkdownFiles(directory)` recursively walks the directory tree:

- For each entry, checks whether it should be ignored (via `state.shouldIgnore`) or is the `publicPath` directory
- Directories named `(Name)` are tagged as **groupers** (`isGrouper: true`), with the parentheses stripped from the label
- Regular directories create `RouteTree` nodes with `children: []`
- `.md` files create leaf `RouteTree` nodes with `children: null`
- Non-`.md` files are silently ignored

The result is `{ routeTree, files }`:

- `routeTree`: Nested `RouteTree[]` representing the full directory hierarchy with grouper flags
- `files`: Flat `string[]` of all `.md` file paths

Before returning, `routeState.setState({ files })` is called. This populates the state that the parser will use for link validation (checking whether `.md` links point to existing files).

#### Stage 2: Parse (lines 105-111)

For each file path (derived from `makeRoutesOfNestedPathsRaw(routeTree)`), `parseMD(filepath)` is called:

**`parseMD()` in `processor.ts`:**

1. Reads the file from disk
2. Calls `getPath(filepath)` to derive the final route path (slugified, grouper segments removed, index trimmed)
3. Passes the raw text through `state.mdParser.parse()` to produce markdown-it tokens
4. Processes tokens through a custom token-type dispatch system:

| Token Type                  | Handler               | Effect                                                                                                                   |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `heading_open`              | `processHeadingOpen`  | Injects `id` attribute and anchor link (`<a class="heading-anchor">`) into heading tokens. Adds heading to search index. |
| `link_open`                 | `processLinkOpen`     | Rewrites `.md` links to final route paths via `getRouteFromPath()`. Marks invalid links with `data-invalid-reference`.   |
| `image`                     | `processImage`        | Validates image `src` against `publicPath` assets. Marks invalid sources with `data-invalid-source`.                     |
| `em_open` / `strong_open`   | `processKeywordOpen`  | Tracks emphasis/strong tokens as search keywords                                                                         |
| `em_close` / `strong_close` | `processKeywordClose` | Ends keyword tracking                                                                                                    |
| `code_inline`               | `processCodeInline`   | Extracts inline code content as search keywords                                                                          |
| `text`                      | `processText`         | Accumulates heading text and keyword text into search index                                                              |
| `inline`                    | (recursive)           | Recursively processes child tokens                                                                                       |

5. Renders processed tokens back to HTML via `state.mdParser.renderer.render()`
6. Returns `{ route: { path, content, identifier }, searchIndex }`

The `identifier` is a sequentially-generated base-62 string from `utils/index.ts`'s `identifierGenerator()` — guaranteed unique within a single build.

All parsing happens concurrently via `Promise.all(parsePromises)`.

#### Stage 3: Clean (line 115)

`cleanNestedPaths(routeTree)` transforms the route tree:

- If `trimIndexFromPath` is set, strips numeric prefixes from labels (e.g., `"1. Getting Started"` → `"Getting Started"`)
- Applies `cleanName()`: strips `.md` extension, converts `index.md` to `""`
- Applies `getPath()` on each `pathSegment`: slugify, remove grouper segments, trim index
- If a directory has exactly one child and that child is `""` or `"index.md"`, collapses the directory into a leaf node (no collapsible in sidebar)

#### Stage 4: Assemble (lines 119-167)

1. Collects all search index entries and routes from parsed promises
2. Groups routes by path using `Object.groupBy`
3. Builds a flat route list by matching cleaned paths (`makeRoutesOfNestedPaths(routeTree)`) against grouped routes
4. Prepends `baseRoute` to each route path
5. Links each route to its next/previous route (for keyboard navigation)
6. Constructs `StaticMeta` from config values (title, description, theme, fonts, etc.)

#### Stage 5: Write JSON Artifacts (lines 169-209)

The following files are written via the `Writer`:

| File                                 | Content                      | Purpose                                    |
| ------------------------------------ | ---------------------------- | ------------------------------------------ |
| `page_data/paths.json`               | Serialized `RouteTree[]`     | Sidebar navigation structure               |
| `page_data/meta.json`                | Serialized `StaticMeta`      | Site title, theme, fonts, baseRoute, etc.  |
| `page_data/registry.json`            | `[{ path, identifier }]`     | Maps route paths to route file identifiers |
| `page_data/search_index.json`        | Serialized `SearchIndex`     | Per-section keywords and headings          |
| `page_data/routes/{identifier}.json` | Serialized `Route`           | Per-route HTML content and metadata        |
| `index.html`                         | Generated HTML from template | Home page with pre-rendered content        |

The route files and `index.html` are written concurrently via `Promise.all`.

#### Stage 6: Generate Static HTML (lines 228-233)

`buildDistRoutesFromRouteTree(routeTree, groupedRoutes, targetDist, write)` recursively walks the cleaned route tree:

- For **grouper nodes** (`isGrouper: true`): skips HTML generation, recurses into children with the same URL prefix
- For **directory nodes**: creates a URL prefix including the path segment, recurses into children
- For **leaf nodes**: generates a standalone `.html` file

Each HTML file is produced by `generateHtml(distPath, routeContent)`:

1. Reads the template `index.html` (located at the package root, sibling of `bin/`)
2. Removes HTML comments from the template
3. Scans `distPath/assets/` for CSS and JS files (uses `readdirSync`)
4. Replaces template placeholders:

| Placeholder       | Replaced With                                              |
| ----------------- | ---------------------------------------------------------- |
| `{{content}}`     | `STATIC_TEMP_CONTENT_PREFIX` + route HTML content          |
| `{{distAssets}}`  | `<link>` and `<script>` tags pointing to Vite-built assets |
| `{{title}}`       | `finalConfig.rootTitle`                                    |
| `{{description}}` | `finalConfig.description`                                  |
| `{{favicon}}`     | `<link rel="icon">` tag                                    |
| `{{fonts}}`       | `<link rel="stylesheet">` tags for configured fonts        |
| `{{og}}`          | Open Graph `<meta>` tags from `finalConfig.og`             |

5. Removes the `<script type="module" src="/src/main.tsx">` tag (dev-only reference)

The output path for each leaf node is:

- Empty pathSegment → `{prefix}/index.html`
- Non-empty pathSegment → `{prefix}/{segment}.html`

---

## 4. The `dev` Command

### 4.1 Command Handler

The `dev` handler calls `dev()` from `core/dev.ts`. Errors are caught and logged but do not crash the process.

### 4.2 Dev Server Initialisation (`core/dev.ts:42-86`)

```
dev() → 1. Create VirtualFileRegistry (in-memory Map)
        2. Create HTTP server with devHandler
        3. Create WebSocket server (for reload broadcast)
        4. Start chokidar watcher on target directory
        5. Initial population: buildSite() → VirtualFileRegistry
        6. Register publicPath files in VirtualFileRegistry
        7. Register distDir files (Vite assets) in VirtualFileRegistry
        8. Listen on specified port
```

### 4.3 VirtualFileRegistry

The `VirtualFileRegistry` is a `Map<string, VirtualFileEntry>` where:

```typescript
type VirtualFileEntry = {
  content: Buffer | string | (() => VirtualFileEntry);
  contentType: string;
};
```

Entries can be:

- **Eager**: `content` is a `Buffer` or `string` already in memory
- **Lazy**: `content` is a factory function that reads from disk and optionally replaces itself with the eager form (for files under 10MB)

### 4.4 Initial Population

`buildVirtualFileRegistry()` calls `buildSite()` with a `Writer` that stores content in the `VirtualFileRegistry` instead of writing to disk:

```typescript
async (filePath, content, contentType) => {
  virtualFileRegistry.set(path.join("/", path.relative(targetDist, filePath)), {
    content,
    contentType,
  });
};
```

After `buildSite()` completes, additional files are registered:

1. **publicPath files** — recursively scanned and registered with lazy loading
2. **distDir files** (Vite assets) — recursively scanned and registered with lazy loading

### 4.5 Request Handling

The `devHandler` function returns a standard Node.js `http` request handler:

1. Checks if the request URL starts with `baseRoute`; if not, redirects (301)
2. Strips `baseRoute` prefix from the URL
3. Tries three path variations against the `VirtualFileRegistry`:
   - The exact path
   - The path + `.html`
   - The path + `/index.html`
4. If found, serves the content with the correct MIME type
5. If the entry has a lazy factory function, calls it (and replaces the registry entry if under 10MB)
6. If not found, returns 404

### 4.6 File Watching

A `chokidar` watcher monitors the target directory:

```
watcher.on("all", (_event, _path) => {
  clearTimeout(timeout);
  timeout = setTimeout(async () => {
    virtualFileRegistry.clear();
    await buildVirtualFileRegistry(directory, state, virtualFileRegistry);
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) client.send("reload");
    });
  }, 300);
});
```

On any file change:

1. Debounces 300ms
2. Clears the entire `VirtualFileRegistry`
3. Re-runs the full `buildSite()` pipeline
4. Broadcasts a "reload" message to all connected WebSocket clients
5. Clients receive the message and call `location.reload()`

The WebSocket injection script is served as part of the HTML response (injected into each page).

---

## 5. Key Data Structures

### RouteTree

```typescript
type RouteTree = {
  label: string; // Display name (cleaned)
  children: RouteTree[] | null; // null = leaf (file), array = directory
  pathSegment: string; // URL path segment (cleaned)
  isGrouper?: boolean; // true if directory is a grouper (Name)
};
```

Built during scanning, transformed during cleaning, serialised for the web app. Grouper nodes have their path segments excluded from URL construction at every stage.

### Route

```typescript
interface Route {
  path: string; // Final URL path (e.g., "/getting-started")
  content: string; // Rendered HTML content
  identifier: string; // Opaque file identifier (sequential base-62)
  next?: string; // Path of next page (for keyboard nav)
  prev?: string; // Path of previous page
}
```

### SearchIndexPage

```typescript
interface SearchIndexPage {
  route: string; // Route path
  title: string; // Page title (from first heading)
  sections: {
    // Per-heading sections
    title: string;
    anchor: string;
    preview: string;
    keywords: string[];
  }[];
}
```

### Writer

```typescript
type Writer = (
  filePath: string,
  content: string,
  contentType: string,
) => Promise<void>;
```

The output abstraction. Two implementations:

- **Production**: `mkdir + writeFile`
- **Dev server**: `Map.set` into `VirtualFileRegistry`

### SharedState

```typescript
type SharedState = CommandState & UtilState;
// CommandState: { command, handler, options }
// UtilState: { finalConfig: SmmConfig, mdParser: MarkdownIt, shouldIgnore: (string) => boolean }
```

### SmmConfig

| Option              | Type        | Default                                       | Effect                                  |
| ------------------- | ----------- | --------------------------------------------- | --------------------------------------- |
| `rootTitle`         | `string`    | `"Serve My MD"`                               | HTML `<title>`                          |
| `description`       | `string`    | `"A simple markdown to static site builder."` | `<meta name="description">`             |
| `markdownItOptions` | `object`    | (see smm.config.json)                         | Passed to MarkdownIt constructor        |
| `baseRoute`         | `string`    | `"/"`                                         | URL prefix for all routes               |
| `outDir`            | `string`    | `"dist"`                                      | Output directory name                   |
| `publicPath`        | `string`    | `undefined`                                   | Directory to copy as public assets      |
| `defaultTheme`      | `string`    | `"dark"`                                      | Initial theme for web app               |
| `favicon`           | `string`    | `""`                                          | Favicon URL                             |
| `logo`              | `string`    | `""`                                          | Logo URL                                |
| `name`              | `string`    | `"Serve My MD"`                               | Site name                               |
| `showNameWithLogo`  | `boolean`   | `true`                                        | Display name alongside logo             |
| `og`                | `OpenGraph` | `undefined`                                   | Open Graph meta tags                    |
| `sortRoutes`        | `boolean`   | `true`                                        | Sort route tree alphabetically          |
| `trimIndexFromPath` | `boolean`   | `false`                                       | Strip numeric prefixes from route names |
| `version`           | `string`    | `undefined`                                   | Version string                          |
| `fonts`             | `object`    | `undefined`                                   | Title/body/mono font config             |

---

## 6. Sort Order Rules

When `sortRoutes: true` (default), entries at each directory level are sorted:

1. `index.md` always first
2. Regular files and directories second (by label via `localeCompare`)
3. Grouper directories last (by label via `localeCompare`)
4. Within each tier, numeric prefixes in filenames control ordering

Grouper sort indices never collide with regular file/directory indices because groupers are always sorted after regular items.

---

## 7. Grouper Mechanics

Directories named `(Name)` trigger special behaviour at every pipeline stage:

| Stage                                                        | Behaviour                                                                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Scanning** (`getMarkdownFiles:97`)                         | Detected by pattern `startsWith("(") && endsWith(")")`. `isGrouper` flag set to `true`. Label is parentheses-stripped text. |
| **Path building** (`makeRoutesOfNestedPaths:127-141`)        | Grouper path segments are excluded from URL construction                                                                    |
| **Path cleaning** (`getPath:203-206`)                        | `(Name)` segments are filtered out of the path                                                                              |
| **HTML generation** (`buildDistRoutesFromRouteTree:306-313`) | Grouper nodes are skipped — no HTML file generated. Children inherit the parent's URL prefix.                               |
| **Sidebar rendering** (web app)                              | Grouper renders as a labeled section (not collapsible)                                                                      |

---

## 8. Ignore System (`.smmignore`)

Glob-based ignore rules parsed in `parseSmmIgnore()`:

- Lines starting with `#` are comments
- Empty lines are ignored
- Lines starting with `!` negate the pattern
- Patterns are evaluated top-to-bottom with `minimatch`
- The last matching rule wins

The resulting `shouldIgnore(targetPath)` function is called during filesystem scanning (`getMarkdownFiles:90`). The `targetPath` is the file path relative to the docs root directory.

The `publicPath` directory is also explicitly excluded from scanning (line 91-92), independent of `.smmignore`.

---

## 9. File Layout

### Published npm Package

```
serve-my-md/
  bin/index.js          ← bundled CLI (tsup output)
  web/
    dist/               ← pre-built Vite output (CSS + JS)
    src/                ← web app source (for dev references)
    vite.config.ts
  shared/
    index.d.ts          ← shared type declarations
    constants.json      ← shared constants (STATIC_TEMP_CONTENT_PREFIX)
  index.html            ← HTML template with {{placeholders}}
  package.json
  README.md
  LICENSE
```

### Build Output (in target directory)

```
{outDir}/
  index.html              ← home page (pre-rendered)
  getting-started.html    ← per-route static pages
  guides/
    index.html
    setup.html
  page_data/
    paths.json            ← serialised RouteTree
    meta.json             ← serialised StaticMeta
    registry.json         ← path → identifier mapping
    search_index.json     ← search keywords per section
    routes/
      a3f.json            ← per-route content (identifier-based filename)
      b7d.json
  assets/
    index-abc123.css      ← Vite-built CSS
    index-abc123.js       ← Vite-built JS
```

---

## 10. Configuration Loading

```
1. CLI flags (commander) → options.directory
2. Read built-in defaults (cli/src/smm.config.json, statically imported)
3. Read smm.config.json from target directory (JSON.parse, try/catch → {} on failure)
4. Shallow merge: { ...defaults, ...userConfig } → finalConfig
5. If publicPath is set: resolve to absolute path
```

Config values are accessed throughout the pipeline via `appState.getState().finalConfig`.

---

## 11. Module Dependency Graph

```
index.ts (entry)
  │
  ├── lib/commands.ts
  │     ├── core/build.ts (build command)
  │     └── core/dev.ts (dev command)
  │
  ├── core/index.ts (readConfig, parseSmmIgnore)
  │
  └── lib/context.ts (appState, routeState)

core/build.ts
  ├── core/index.ts (getMarkdownFiles, cleanNestedPaths, generateHtml, buildDistRoutesFromRouteTree)
  ├── core/processor.ts (parseMD)
  ├── utils/index.ts (makeRoutesOfNestedPaths, makeRoutesOfNestedPathsRaw)
  └── lib/context.ts (appState, routeState)

core/dev.ts
  ├── core/build.ts (buildSite)
  ├── core/index.ts (none — builds uses buildSite → build.ts)
  ├── lib/context.ts (appState)
  └── utils/index.ts (traverseRecursive)

core/processor.ts
  ├── core/index.ts (getPath, getRouteFromPath)
  ├── utils/index.ts (getIdentifier, slugifyText, traverseRecursive)
  └── lib/context.ts (appState, routeState)

core/index.ts
  ├── utils/index.ts (cleanName, makeRoutesOfNestedPaths, ogToHtml, slugify, trimIndexFromPath)
  └── lib/context.ts (appState)

utils/index.ts
  └── (fs/promises — only for traverseRecursive, FileOrDirectoryExists)
```

---

## 12. Test Infrastructure

Tests are in `cli/tests/` with two categories:

**Unit tests** (`tests/unit/utils.spec.ts`): Data-driven tests for pure utility functions (`slugify`, `trimIndexFromPath`, `ogToHtml`, `makeRoutesOfNestedPaths`, `cleanName`, `makeRoutesOfNestedPathsRaw`). Test cases come from `tests/fixtures/cases/utils.unit.json`.

**E2E tests** (`tests/e2e/e2e.spec.ts`): Snapshot-based tests. Each fixture directory under `tests/fixtures/md/` contains a mock docs structure. Before tests run (`tests/pretest.ts`), the CLI builds each fixture and captures snapshots of `output.json`, `paths.json`, and `index.html`. E2E tests compare actual output against expected files in `{fixture}/.expect/`.

The test environment sets `DEBUG=true` and `VITEST=true` (from `.env.test`) to enable debug logging and test-specific code paths.
