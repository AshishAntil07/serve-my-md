# serve-my-md CLI Architecture Review

> Focused on CLI architecture and build engine.
> Web app treated as a consumer of build artifacts.
> Date: 2026-07-28

---

## 1. High-Level Architecture Summary

**What the CLI does:** It is a four-stage pipeline:

```
Entry → Scan → Parse → Transform → Write JSON → Generate HTML
```

Each stage produces an intermediate data structure consumed by the next stage. The final output is a set of static JSON files and HTML pages that form a deployable documentation site.

**The build pipeline concretely:**

| Stage         | Function                                            | Input                          | Output                                       |
| ------------- | --------------------------------------------------- | ------------------------------ | -------------------------------------------- |
| Entry         | `index.ts`                                          | CLI args, filesystem config    | `SharedState` (appState + mdParser + config) |
| Scan          | `getMarkdownFiles()`                                | Directory path                 | `RouteTree[]` + `string[]` (file paths)      |
| Parse         | `parseMD()` per file                                | File path (string)             | `{ Route, SearchIndexPage }` per file        |
| Clean         | `cleanNestedPaths()`                                | Raw `RouteTree[]`              | Cleaned `RouteTree[]`                        |
| Assemble      | `build.ts` lines 119-167                            | Route[] + RouteTree[]          | Flat routes with prev/next, StaticMeta       |
| Write JSON    | `build.ts` lines 169-209                            | Routes, RouteTree, SearchIndex | `page_data/*.json` files                     |
| Generate HTML | `generateHtml()` + `buildDistRoutesFromRouteTree()` | Route content + template       | Static `.html` files                         |

**How responsibilities are divided within the CLI:**

| Module                      | Responsibility                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cli/src/index.ts`          | Application entry. Owns config loading, MarkdownIt initialization, Prism setup, state assembly, command dispatch. Does not participate in the build pipeline itself.                |
| `cli/src/core/build.ts`     | Build orchestrator. Calls each pipeline stage in sequence, manages the `Writer` abstraction, coordinates file output. Contains NO scanning, parsing, or template logic directly.    |
| `cli/src/core/index.ts`     | God module. Filesystem scanning, route tree manipulation, HTML template generation, config/ignore parsing. Seven distinct responsibilities in one file.                             |
| `cli/src/core/processor.ts` | Markdown token processing. Custom token-type dispatch, heading anchor injection, link rewriting (.md → resolved route), keyword extraction for search index.                        |
| `cli/src/core/dev.ts`       | Dev HTTP server + WebSocket hot reload. Calls the same `buildSite()` pipeline for initial build and every rebuild. In-memory `VirtualFileRegistry` as an alternative output target. |
| `cli/src/utils/index.ts`    | Pure transformation functions (slugify, trim, path builders). Contains I/O functions that violate the documented purity contract.                                                   |
| `cli/src/lib/context.ts`    | Global state containers. `appState` carries config + parser + ignore function. `routeState` carries the file list needed by the parser for link validation.                         |
| `cli/src/lib/commands.ts`   | Thin command dispatch. Maps "build"/"dev" string to handler function.                                                                                                               |

**The producer/consumer architecture:**

```
CLI (producer)                          Web app (consumer)

  page_data/meta.json ───────────────────→ Api.fetchMeta()
  page_data/registry.json ───────────────→ Api.fetchRegistry()
  page_data/paths.json ──────────────────→ Api.fetchRouteTree()
  page_data/search_index.json ──────────→ (not consumed — commented out)
  page_data/routes/{id}.json ───────────→ Api.fetchRoute(identifier)
  {path}.html (pre-rendered) ───────────→ Initial page load
  assets/*.css, assets/*.js ────────────→ Initial page load (Vite bundle)
```

The web app uses a lazy-fetch pattern: it fetches metadata and the route tree once on mount, then fetches individual route content on navigation. The `registry.json` maps route paths (e.g., `/getting-started`) to opaque identifiers (e.g., `a3f`) which are the filenames under `page_data/routes/`.

**Where the architecture is strongest:**

- The `Writer` abstraction cleanly separates the pipeline from output targets
- The `RouteTree` is a single recursive structure driving scanning, sidebar rendering, and HTML generation
- The producer/consumer contract (flat JSON files) is simple, debuggable, and cacheable
- Each pipeline stage produces typed data consumed by the next

**Where complexity lives:**

- `core/index.ts` is a god module with 7+ unrelated responsibilities
- `build.ts` is the central orchestrator but has no error boundaries for individual stages
- The dev server calls the full build pipeline on every file change — no incremental capability
- Global state (`appState`, `routeState`) creates implicit coupling between modules

---

## 2. Strengths

### 2.1 Writer Abstraction

**What:** `Writer = (filePath, content, contentType) => Promise<void>` is injected into `buildSite()`.

**Why it's good:** It decouples the entire pipeline from where output goes. The production build writes to the filesystem; the dev server writes to an in-memory `Map<string, VirtualFileEntry>`. The pipeline code (`build.ts`, `buildDistRoutesFromRouteTree`, `generateHtml`) has zero knowledge of the output target.

**Future problems prevented:** New output targets (cloud storage, CI artifact archives, database) require only a new `Writer` implementation — zero pipeline changes.

**Keep:** Absolutely. This is the strongest abstraction in the CLI.

### 2.2 RouteTree as Universal Document Hierarchy

**What:** The nested `RouteTree` type (`{ label, children, pathSegment, isGrouper? }`) is built during filesystem scanning and drives every downstream stage: path construction, sorting, HTML generation, and consumed by the web app for sidebar rendering.

**Why it's good:** A single recursive walk of `RouteTree` produces all static HTML pages (`buildDistRoutesFromRouteTree`). The same structure serialized as `paths.json` is the sole source of truth for the web app's navigation hierarchy.

**Keep:** Absolutely.

### 2.3 Pipeline Stage Separation

**What:** `buildSite()` runs discrete stages in order: scan → parse → clean → assemble → write JSON → generate HTML. Each stage's output feeds the next.

**Why it's good:** The pipeline is explicit and linear. A developer can understand the build flow by reading `buildSite()` top to bottom. The comment at line 113 marks a clear phase boundary: operations before it use raw route tree; operations after use cleaned route tree.

**Keep:** Yes. The pipeline is the right abstraction. The issue is that individual stages are too large and coupled internally, not that the pipeline structure is wrong.

### 2.4 Flat JSON Producer/Consumer Contract

**What:** The CLI writes flat JSON files under `page_data/` that the web app fetches via standard HTTP GET. No RPC, no database, no shared state at runtime.

**Why it's good:** The output is self-contained and debuggable. A developer can inspect `page_data/routes/a3f.json` directly. The contract is a file format, not an API — there is no server to deploy, no protocol to negotiate. CDN caching works natively.

**Keep:** Yes. This is the right design for a static site generator.

### 2.5 Grouper Convention

**What:** Directories named `(Name)` act as sidebar grouping sections. Detection, path exclusion, sort isolation, and HTML generation skipping are all handled in the scanner and downstream stages.

**Why it's good:** The filesystem IS the configuration. No additional config file needed for sidebar organization. The logic is concentrated in `getMarkdownFiles()` (detection + isGrouper flag), `makeRoutesOfNestedPaths()` (URL exclusion), and `buildDistRoutesFromRouteTree()` (skip HTML generation for grouper nodes).

**Keep:** Absolutely. A clean convention-over-configuration design.

---

## 3. Weaknesses

### 3.1 God Module: `core/index.ts` (7+ Responsibilities)

**Issue:** This file handles config reading, ignore parsing, filesystem scanning, route path derivation, route tree cleaning, path slugification, HTML template generation, and static HTML emission. These are at least 5 distinct responsibilities in one file.

**Evidence:**

| Lines   | Function                       | Responsibility                                                    |
| ------- | ------------------------------ | ----------------------------------------------------------------- |
| 21-33   | `readConfig`                   | JSON file I/O                                                     |
| 35-75   | `parseSmmIgnore`               | Text parsing + glob matching                                      |
| 77-139  | `getMarkdownFiles`             | Recursive filesystem scanning + route tree construction + sorting |
| 141-163 | `getRouteFromPath`             | Route path derivation from source path                            |
| 165-185 | `cleanNestedPaths`             | Route tree transformation                                         |
| 190-209 | `getPath`                      | Path slugification with grouper removal                           |
| 211-296 | `generateHtml`                 | HTML template rendering                                           |
| 298-330 | `buildDistRoutesFromRouteTree` | Recursive HTML file emission                                      |

**Why it matters:** Every change to scanning, path derivation, HTML generation, or config parsing touches this file. With 5+ contributors, merge conflicts are inevitable. The file's 330 lines contain 8 exported functions with no unifying theme beyond "things the build engine needs."

**When this becomes a problem:** Now. Adding more features (sitemap generation, per-page OG, RSS) will be added here because it's where "core stuff" lives.

**Recommended improvement:** Split into at least:

- `core/scanner.ts` — `getMarkdownFiles`, `getRouteFromPath`, `cleanNestedPaths`
- `core/template.ts` — `generateHtml`, `buildDistRoutesFromRouteTree`
- `core/config.ts` — `readConfig`, `parseSmmIgnore`
- `core/routes.ts` — `getPath` (could also go in `utils/` since it's a pure transformation)

### 3.2 Dev Server Does Full Rebuilds on Every Change

**Issue:** The dev server calls `buildSite()` — the same function used for production builds — on every file change. A change to a single markdown file triggers: full filesystem rescan, full parse of ALL markdown files, full route tree cleaning and assembly, full JSON artifact writing, full HTML generation for every route.

**Evidence:** `dev.ts:98` calls `buildSite()` with the same arguments as a production build. No incremental parsing or partial update logic exists.

**Why it matters:** With 10-20 markdown files, the full rebuild is fast enough (sub-second). With 200+ files, each file save triggers a multi-second rebuild. The 300ms debounce helps with rapid saves but doesn't reduce the work.

**Realistic consequences:** The dev server becomes unusable with large documentation sets.

**Recommended improvement:** At minimum, cache parsed markdown output and only re-parse changed files. The `chokidar` watcher provides the changed file path — use it. At best, implement incremental route tree updates.

### 3.3 Processor IIFE Captures Global State at Module Load Time

**Issue:** The `image` handler in `processor.ts:59-70` is defined as an IIFE that reads `appState.getState()` and starts traversing `publicPath` at import time — not at parse time. The `traverseRecursive` call is async but not awaited.

```typescript
image: (() => {
    const state = appState.getState();    // captured at import time
    const publicAssets: Set<string> = new Set();
    if (state.finalConfig.publicPath) {
      traverseRecursive(state.finalConfig.publicPath, async (item) => {
        publicAssets.add(item.slice(state.finalConfig.publicPath!.length));
      });  // never awaited — set may be empty
    }
    return (token, _) => processImage(token, publicAssets);
  })(),
```

**Why it matters:** Three problems:

1. `appState` may not be initialized when this module is imported
2. The async `traverseRecursive` is never awaited — the `publicAssets` set is likely empty when `processImage` is called
3. The set is captured once and never refreshed, even if `publicPath` changes

**Realistic consequences:** Image validation is broken. Every `data-invalid-source` attribute is unreliable. This is likely why no consumer reads these attributes.

**Recommended improvement:** Pass `publicAssets` as a parameter to `parseMD()` or build it lazily when processing images.

### 3.4 Route Tree Sorting as Side Effect Inside Scanner

**Issue:** `getMarkdownFiles` mutates the `routeTree` array in place via `routeTree.sort(...)` (line 119-128). Sorting happens inside the recursive scanner, meaning nested directories are sorted at every level. When called with `pairChildren`, the function mutates the caller's array.

**Evidence:**

```typescript
const routeTree = pairChildren || [];
// ... later:
routeTree.sort((a, b) => { ... });
```

**Why it matters:** The function's name (`getMarkdownFiles`) suggests it returns discovered files. The side effect of sorting the caller's route tree is unexpected. If a caller passes a non-empty `pairChildren`, the sort reorders existing entries plus newly discovered ones.

**Recommended improvement:** Extract sorting into a separate `sortRouteTree()` function. Pipeline stage: scan → sort → clean.

### 3.5 Processor Depends on Core (Wrong Dependency Direction)

**Issue:** `processor.ts:5` imports `getPath` and `getRouteFromPath` from `core/index.ts`. This means the markdown parser depends on the filesystem scanning module.

**Evidence:** `processor.ts` line 5:

```typescript
import { getPath, getRouteFromPath } from "./index.js";
```

Both `getPath` and `getRouteFromPath` are path transformation functions (slugify, clean, remove groupers). They do NOT depend on scanning or file I/O. They are in the wrong module.

**Why it matters:** You cannot use the parser without importing the scanner module. The dependency graph is: `processor → core/index → utils/ + context`. It should be: `processor → utils/ + routes/`.

**Recommended improvement:** Move `getPath` and `getRouteFromPath` to `utils/` or a dedicated `core/routes.ts` module.

### 3.6 No Incremental Build Capability

**Issue:** Every build is a full build. `build.ts:29` starts with `await rm(targetDist, { recursive: true })` — clean slate every time. `dev.ts` calls the same `buildSite()` function on every file change.

**Why it matters:** As the doc set grows, build time becomes a bottleneck. There is no mechanism to rebuild only changed pages, update only the affected JSON files, or append to the search index incrementally.

**Recommended improvement:** First, decouple parsing from the rest of the pipeline so individual files can be re-parsed. Then add a file hash cache to skip unchanged files.

### 3.7 Global State is Implicitly Coupled

**Issue:** `appState` and `routeState` are imported by nearly every module. The pattern is always `appState.getState().something`.

**Evidence:**

- `core/index.ts:81` — `appState.getState()`
- `core/processor.ts:11` — `appState.getState()`
- `core/dev.ts:43` — `appState.getState()`
- `core/processor.ts:60` — `appState.getState()` in an IIFE

**Why it matters:** Testing any of these modules in isolation requires setting up the global state first. The `pretest.ts` script runs the full initialization chain before tests. Module behavior depends on import order.

**Recommended improvement:** Pass dependencies as function parameters rather than reaching into global state. `buildSite()` already accepts `state` and `write` as parameters — extend this pattern downward.

### 3.8 `utils/index.ts` Purportedly Pure but Contains I/O

**Issue:** The file header claims "All these are pure functions with no side effects or dependency" (line 1-3). But `traverseRecursive` (line 55) and `FileOrDirectoryExists` (line 112) import `fs/promises` and perform I/O.

**Why it matters:** The documented contract is wrong. A developer relying on the purity guarantee for testing will be surprised. It also means `utils/` cannot be used in contexts where `fs` is unavailable.

**Recommended improvement:** Move `traverseRecursive` and `FileOrDirectoryExists` to a dedicated `core/fs.ts` module.

---

## 4. Severity Ranking

| #   | Issue                                            | Severity   | Rationale                                                                  |
| --- | ------------------------------------------------ | ---------- | -------------------------------------------------------------------------- |
| 1   | Processor IIFE captures state at import time     | **High**   | Async not awaited. Captured at wrong time. Image validation broken.        |
| 2   | Dev server does full rebuilds on every change    | **High**   | Will not scale beyond small doc sets. Core UX failure for the dev command. |
| 3   | God module `core/index.ts` (7+ responsibilities) | **Medium** | Already an issue at current scale. Gets worse with every feature addition. |
| 4   | Route sorting as side effect inside scanner      | **Medium** | Unexpected mutation. Pipeline stage bleed.                                 |
| 5   | Processor depends on core/index.ts (coupling)    | **Medium** | Parser cannot be used independently. Wrong dependency direction.           |
| 6   | Global state implicit coupling                   | **Medium** | Hinders isolated testing. Import-order sensitivity.                        |
| 7   | No incremental build capability                  | **Medium** | Not yet a bottleneck, but architecture makes it hard to add later.         |
| 8   | `utils/` purity contract broken                  | **Low**    | Misleading documentation. Low risk of bugs.                                |
| 9   | `readdirSync` in async `generateHtml`            | **Low**    | Blocks event loop briefly. Minor inconsistency.                            |

---

## 5. Producer/Consumer Contract Analysis

### Why It Is Sound

1. **No server required.** Every piece of data is a static file. Deploy to a CDN, S3, or any static host.
2. **Lazy data loading.** The web app only fetches route content on demand. Initial page load is fast.
3. **Cacheable.** Every JSON file can be cached indefinitely by the browser/CDN.
4. **Debuggable.** Every artifact is a plain JSON file. Open it in any editor to verify content.
5. **Versionable.** Old builds coexist.

### Limitations

1. **Data duplication.** Route content exists in two places: the static HTML and the JSON route file. This doubles storage.
2. **Lazy fetch latency.** Every navigation requires an HTTP round-trip for route JSON. The `IntentLink` hover preloading mitigates this but doesn't eliminate it on cold load.
3. **Registry indirection.** The web app cannot derive the route filename from the path — it needs `registry.json`. If registry fails to load, all navigation breaks.
4. **Search index is generated but never consumed.** The CLI builds a structured `search_index.json`. The web app's search UI is commented out.
5. **Non-deterministic identifiers.** Route identifiers are sequential base-62. Different builds of the same content produce different identifiers — CDN caches invalidate unnecessarily.
6. **Pre-rendered hydration check.** The web app checks for `STATIC_TEMP_CONTENT_PREFIX` before hydrating. If this mechanism breaks, React either double-renders or skips hydration.
