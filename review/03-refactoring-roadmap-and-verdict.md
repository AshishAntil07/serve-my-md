# Refactoring Roadmap and Final Verdict

> Ordered from highest return on investment to lowest.
> Every item is incremental — no rewrites.

---

## 1. Refactoring Roadmap

| #   | Change                                                                                 | Problem Solved                                                                                        | Difficulty            | Risk   | Incremental?                       |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------- | ------ | ---------------------------------- |
| 1   | Move `getPath` and `getRouteFromPath` from `core/index.ts` to `utils/`                 | Breaks processor→core dependency. Parser becomes independent of scanner.                              | **Easy** (2 hours)    | Low    | Yes                                |
| 2   | Fix processor IIFE — pass `publicAssets` as parameter to `parseMD()`                   | Image validation works correctly. Async is properly handled. State not captured at import time.       | **Easy** (4 hours)    | Low    | Yes                                |
| 3   | Split `core/index.ts` into `scanner.ts`, `template.ts`, `config.ts`, `routes.ts`       | Eliminates god module. Clear module boundaries. Reduced merge conflict surface.                       | **Medium** (1 day)    | Low    | Yes                                |
| 4   | Switch to deterministic route identifiers (hash-based)                                 | Eliminates registry fetch (one fewer HTTP request). Enables incremental builds. Stable across builds. | **Medium** (1-2 days) | Medium | Yes                                |
| 5   | Extract route sorting from `getMarkdownFiles` into separate `sortRouteTree()`          | Clearer pipeline stages. No unexpected mutation inside scanner.                                       | **Easy** (2 hours)    | Low    | Yes                                |
| 6   | Move `traverseRecursive` and `FileOrDirectoryExists` from `utils/` to new `core/fs.ts` | Upholds utils purity contract. Clear separation of I/O code.                                          | **Easy** (1 hour)     | Low    | Yes                                |
| 7   | Cache parsed markdown output per file (hash-based skip in dev mode)                    | Partial incremental builds. Dev server skips unchanged files.                                         | **Medium** (2 days)   | Medium | Yes (#1, #2, #4 are prerequisites) |
| 8   | Add file-level incremental parsing to dev server (parse only changed files)            | Dev server scales to large doc sets. Full rebuilds become rare.                                       | **Hard** (3-5 days)   | High   | Yes (after #7)                     |
| 9   | Replace global state access with explicit parameter passing throughout the pipeline    | Reduces implicit coupling. Enables isolated unit testing. Eliminates import-order sensitivity.        | **Hard** (1-2 weeks)  | High   | Yes (module by module)             |

### Detailed Rationale

#### Item 1: Move path functions to utils (Easy, Low Risk)

`getPath` and `getRouteFromPath` are pure transformations: they take a string and return a string. They depend on `utils/` functions (`slugify`, `trimIndexFromPath`, `cleanName`, `makeRoutesOfNestedPaths`) and on `appState` (for config). They do NOT depend on filesystem scanning or file I/O.

Moving them to `utils/` breaks the `processor.ts → core/index.ts` dependency, which is the most significant coupling issue in the current architecture.

#### Item 2: Fix processor IIFE (Easy, Low Risk)

The `image` handler IIFE at `processor.ts:59-70` has three bugs:

1. It captures `appState` at import time (may not be initialized)
2. It calls `traverseRecursive` without awaiting it (set is likely empty)
3. It never refreshes the `publicAssets` set

Fix: Remove the IIFE. Build the `publicAssets` set in `buildSite()` and pass it to `parseMD()` as a parameter. Or validate images lazily (check filesystem on access).

#### Item 3: Split core/index.ts (Medium, Low Risk)

This is a mechanical split. Create four files from the existing `core/index.ts`:

- `core/scanner.ts` — `getMarkdownFiles`, `getRouteFromPath`, `cleanNestedPaths`
- `core/template.ts` — `generateHtml`, `buildDistRoutesFromRouteTree`
- `core/config.ts` — `readConfig`, `parseSmmIgnore`
- `core/routes.ts` — `getPath` (or keep in `utils/` after Item 1)

Update imports in `build.ts`, `processor.ts`, `dev.ts`, and `index.ts`. No behavioral changes.

#### Item 4: Deterministic identifiers (Medium, Medium Risk)

Replace:

```typescript
// Current: sequential base-62
function* identifierGenerator() {
  /* sequential */
}
export const getIdentifier = (() => {
  const gen = identifierGenerator();
  return () => gen.next().value;
})();
```

With:

```typescript
// New: deterministic hash of route path
function getIdentifier(routePath: string): string {
  return createHash("sha256").update(routePath).digest("base64url").slice(0, 8);
}
```

Update the web app to compute the same hash. Remove `registry.json` generation and the corresponding fetch on the web side.

Risk: Existing builds with sequential identifiers will not match. This is a breaking change for the `page_data/` contract. Coordinate with a version bump.

---

## 2. Final Verdict

| Metric                         | Rating   | Notes                                                                                                     |
| ------------------------------ | -------- | --------------------------------------------------------------------------------------------------------- |
| **CLI architecture**           | **6/10** | Strong core abstractions (Writer, RouteTree, pipeline stages) weakened by god modules and global coupling |
| **Build engine**               | **5/10** | Pipeline is clear but not incremental. Dev server can't scale.                                            |
| **Producer/consumer contract** | **7/10** | Flat JSON files are the right approach. Registry indirection is unnecessary overhead.                     |
| **Extensibility**              | **4/10** | Writer is the only clean extension point. Adding features requires modifying god modules.                 |
| **Technical debt**             | **5/10** | Moderate. Three high-severity issues (IIFE, dev server rebuilds, god module).                             |

### Biggest Strengths

1. **Writer abstraction** — clean output decoupling. Strongest abstraction in the CLI.
2. **RouteTree** — single recursive representation for document hierarchy. Drives scanning, sidebar rendering, and HTML generation.
3. **Flat-file producer/consumer contract** — no server, no RPC, no database. Static files as an API.
4. **Grouper convention** — filesystem-as-configuration for sidebar organization. No extra config files needed.

### Biggest Risks

1. **Processor IIFE** — async not awaited, state captured at wrong time. Image validation is silently broken.
2. **Dev server full rebuilds** — will not scale beyond small doc sets. Core UX failure for the dev command.
3. **God module `core/index.ts`** — merge conflict magnet. Will not survive team growth.
4. **Non-deterministic route identifiers** — unnecessary CDN cache invalidation. Blocks incremental builds.

### Top Five Changes for Highest Long-Term ROI

1. **Fix processor IIFE** — low effort, fixes silently broken validation
2. **Split `core/index.ts`** — mechanical, low-risk, immediate benefit for team development
3. **Switch to deterministic route identifiers** — removes a failure point and an HTTP request. Prerequisite for incremental builds.
4. **Move path functions out of `core/index.ts`** — breaks processor→core dependency
5. **Cache parsed output in dev server** — enables incremental rebuilds. Prerequisites are items 3 and 4.

### Would I maintain this build engine for 5 years?

**Yes**, but only with the god module split and the dev server incremental rebuild improvements. The core ideas (Writer, RouteTree, flat-file contract) are sound and will age well. The execution details (module organization, state management, rebuild strategy) need attention but are mechanical improvements, not conceptual redesigns.

The producer/consumer architecture is the right foundation for a static site generator. The flat JSON contract between build-time and run-time is simple, debuggable, cacheable, and deployable anywhere. The specific implementation details that need improvement (registry indirection, sequential identifiers, data duplication) have clear incremental migration paths.

The most urgent issue is the processor IIFE — it is currently broken in a way that silently produces incorrect output. Everything else is a maintainability or scalability concern that can be addressed incrementally.
