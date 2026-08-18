# Alternative Architectures for Build Artifact Sharing

> Case studies exploring different approaches to the producer/consumer contract between the CLI and web app.
> These are not recommendations to rewrite. Each alternative identifies independently adoptable ideas.

---

## Alternative A: Bundled Route Registry

**How it works:** Instead of generating individual JSON files per route, embed all route data into a single JavaScript file (or into the main JS bundle). The registry, route tree, and all route content are loaded as part of the initial JS payload.

**Directory structure:**

```
{outDir}/
  page_data/
    bundle.js             ← all routes + meta + registry + tree, single file
  index.html
  getting-started.html
  assets/
```

**Dependency flow:** CLI generates `bundle.js` instead of 5+ individual JSON files. Web app imports `bundle.js` as a script tag. No runtime HTTP fetches for navigation.

**Strengths:**

- Zero network requests for navigation. Every route is in memory after initial load.
- Simpler web app code (no fetch/retry/cache logic)
- No registry indirection — route paths map directly to in-memory data
- Simpler cache invalidation (one file changes or it doesn't)

**Weaknesses:**

- Every user downloads ALL route content on every page load. Wasted bandwidth for all but the smallest doc sets.
- Initial JS payload grows linearly with content size. A 500-page doc set could be megabytes of JSON.
- Works against Vite's code splitting and tree-shaking optimization.

**Comparison with current:** Current architecture is better for large doc sets (lazy per-route loading). Alternative A is better for small doc sets (<50 pages) where the network overhead of individual fetches exceeds the cost of loading everything upfront.

**Independently adoptable ideas:**

- The registry indirection can be eliminated without bundling everything. Replace the registry with deterministic identifiers (e.g., content hash of the route path) so the web app can construct the route file URL directly without a fetch.

---

## Alternative B: Deterministic Route Identifiers (Content-Addressed Routes)

**How it works:** Replace the sequential `identifierGenerator()` with a deterministic identifier derived from the route path (e.g., base64url of the SHA-256 hash of the path). The web app computes the identifier client-side instead of fetching a registry.

**Directory structure:**

```
{outDir}/
  page_data/
    routes/
      getting-started.a3f8c2.json    ← hash-of-path-based filename
      guides.setup.b7d1e4.json
    meta.json
    paths.json
    search_index.json
```

**Dependency flow:** CLI generates deterministic filenames. Web app derives `identifier = hash(pathname)` and fetches `page_data/routes/{identifier}.json` directly. No `registry.json` fetch needed.

**Strengths:**

- Eliminates the registry fetch (one fewer startup HTTP request)
- Eliminates the registry as a failure point — if the web app knows the path, it can compute the identifier
- Content-addressed filenames are cache-friendly (identical builds produce identical filenames)
- Removes `registry.json` from the produced artifacts (simpler build output)
- Prerequisite for incremental builds (stable identifiers across builds)

**Weaknesses:**

- Requires the web app to implement the same hashing function as the CLI (must be shared code)
- The `shared/` directory would need a runtime hashing function, not just types
- Not suitable for content that can have path conflicts

**Comparison with current:** Strict improvement over the current architecture. Removes one artifact, one network request, and one failure point.

**Independently adoptable ideas:**

- This is the most incremental improvement in the entire analysis. The change is: (1) replace `getIdentifier()` with a deterministic hash function in the CLI, (2) remove the registry fetch from the web app, (3) stop generating `registry.json`.

---

## Alternative C: Embedded Route Data in Static HTML

**How it works:** Instead of generating separate JSON files for route content, embed the route's content JSON directly in the static HTML page (in a `<script type="application/json">` tag). The web app reads it from the DOM instead of making a network request.

**Directory structure:**

```
{outDir}/
  index.html              ← contains its own route data in <script> tag
  getting-started.html    ← contains its own route data in <script> tag
  page_data/
    meta.json
    paths.json
  assets/
```

**Dependency flow:** CLI embeds route content JSON in each HTML page. Web app reads it from the DOM on initial load. For navigation to other pages, the web app fetches the target page's script tag content.

**Strengths:**

- Zero additional network requests for the initial route — content is in the HTML
- Reduces the number of generated files (no `page_data/routes/` directory needed)
- Simpler deployment (HTML files are self-contained units)
- Graceful degradation: if the web app doesn't load, the HTML still has the pre-rendered content

**Weaknesses:**

- Every HTML page is larger (duplicates content as JSON + pre-rendered HTML)
- Navigation to a new page still requires fetching route data. Embedding adjacent pages' data means each HTML file grows by linked neighbors' content.
- Data in HTML cannot be cached independently from the HTML
- Harder to inspect/debug (content is in a script tag, not a standalone JSON file)

**Comparison with current:** Current architecture is better for caching and inspection. Alternative C is better for initial load performance. The two can be combined: embed the current page's route data in the HTML AND generate standalone JSON files for navigation fetches.

**Independently adoptable ideas:**

- Embed the current page's route identifier in the HTML as a meta tag or data attribute. The web app skips the registry for the initial route and uses the embedded identifier to fetch the first route. This eliminates one fetch on cold load.

---

## Alternative D: Streaming / Incremental Build Pipeline

**How it works:** Replace the batch pipeline (scan all → parse all → write all) with a streaming pipeline where individual files are processed as they become available. Each file goes through scan → parse → generate independently, and only the aggregate stages (search index, route tree) need a global view.

**Pipeline:**

```
                    ┌─→ parseMD(file1) → write JSON → generate HTML → emit
File change event ──┼─→ parseMD(file2) → write JSON → generate HTML → emit
                    └─→ parseMD(file3) → write JSON → generate HTML → emit

Collect: updated route tree, updated search index
→ rewrite paths.json (partial update)
→ rewrite search_index.json (append only)
```

**Dependency flow:** Build pipeline is a stream processor. Each file is an independent unit. Only the aggregate files (route tree, search index) need the full picture.

**Strengths:**

- Dev server rebuilds are O(changed_files) instead of O(total_files)
- Production builds can parallelize parsing across CPU cores
- Adding a file to a 10,000-page doc set rebuilds in milliseconds, not minutes
- Clear pipeline stages with one responsibility each

**Weaknesses:**

- Requires careful state management for aggregate artifacts (route tree ordering, search index deduplication)
- The current `RouteTree` is built during scanning — incremental tree updates require tree diffing
- The `getIdentifier()` sequential generator produces different IDs in different build orders — must switch to deterministic identifiers
- Significant refactoring of the build pipeline

**Comparison with current:** Fundamental architectural change. The current batch pipeline is simple and correct. A streaming pipeline is more complex but necessary for large doc sets. Only implement when batch becomes a bottleneck.

**Independently adoptable ideas (prerequisites):**

1. Switch to deterministic identifiers now (prerequisite for any incremental system)
2. Isolate file parsing so individual files can be re-parsed without rebuilding the entire pipeline
3. Add a file hash cache to skip unchanged files (reduces work without restructuring the pipeline)

---

## Alternative E: Service Worker Caching Layer

**How it works:** Add a service worker that intercepts fetches to `page_data/routes/*.json`. On first access, the worker caches the response. On subsequent navigations, it serves from cache instantly. Optional: preload adjacent routes in the background.

**Directory structure:**

```
{outDir}/
  page_data/
    meta.json
    registry.json
    paths.json
    search_index.json
    routes/
      a3f.json
  sw.js                 ← service worker script (generated by CLI)
  index.html
```

**Dependency flow:** Web app registers the service worker. The worker handles caching transparently — the web app's fetch-based API code doesn't change.

**Strengths:**

- No changes to the build pipeline or web app API code
- Eliminates network latency for repeated navigations
- Preloading can be implemented independently in the service worker
- Works with the existing architecture — purely additive
- Progressive enhancement: browsers without service worker support fall back to network fetches

**Weaknesses:**

- Service worker lifecycle complexity (registration, activation, update)
- Cache invalidation strategy needed (when does the worker know new content is available?)
- Development/debugging complexity (service workers behave differently in incognito, hard refresh)
- The current web app doesn't register a service worker — would need to add `sw.js` generation to the CLI

**Comparison with current:** Most additive alternative. No rewrite required. The CLI would need to generate a `sw.js` and add a registration script to the HTML template.

**Independently adoptable ideas:**

- This can be added at any time without changing the build pipeline or web app data fetching code. Pure performance enhancement on top of the existing architecture.

---

## Alternative F: Static Navigation Data Bundle

**How it works:** Instead of fetching `page_data/routes/{id}.json` on each navigation, embed ALL routes' content into the JavaScript bundle during the build phase. The CLI generates a single JavaScript file that exports a `Map<path, content>`, loaded as part of the initial JS bundle.

**Directory structure:**

```
{outDir}/
  page_data/
    smm.data.js           ← All routes in a single JS module
    meta.json
    paths.json
  index.html              ← <script src="page_data/smm.data.js">
```

**Dependency flow:** CLI generates `smm.data.js` as part of the build. The web app imports it as a module. No runtime data fetching at all.

**Strengths:**

- Zero network requests for navigation
- Simplest possible web app data layer (a single import)
- No fetch/retry/error-handling code needed for route content
- No cache layer needed

**Weaknesses:**

- Every user downloads all route content on every visit. A 500-page doc site could be 10-50MB of JSON in the initial JS payload.
- Cannot tree-shake — bundler doesn't know which routes the user will visit
- Cache granularity is all-or-nothing
- Content is not independently cacheable by CDN

**Comparison with current:** Opposite extreme from the current architecture. Current is lazy (fetch per route). This is eager (all routes upfront). For small doc sets (<50 pages), this is simpler. For large doc sets, this is impractical.

**Independently adoptable ideas:**

- Instead of bundling all routes, generate a "hot path" bundle with the most common first few routes (index + first-level children). Middle ground between lazy and eager.
