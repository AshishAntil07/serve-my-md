import fs from "fs/promises";
import logger from "@/lib/logger.js";
import type { IgnoreRule } from "@/types/index.js";
import type { Route, RouteTree, SearchIndex, SearchIndexPage } from "@shared/index.js";
import path from "path";
import { minimatch } from "minimatch";
import {
  cleanName,
  makeRoutesOfNestedPaths,
  ogToHtml,
  slugify,
  trimIndexFromPath,
} from "@/utils/index.js";
import { readdirSync } from "fs";
import constants from "@shared/constants.json" with { type: "json" };
import { appState } from "@/lib/context.js";
import type { Writer } from "@/types/index.js";

const STATIC_TEMP_CONTENT_PREFIX = constants.STATIC_TEMP_CONTENT_PREFIX;

export async function readConfig(filepath: string): Promise<object> {
  try {
    const data = JSON.parse(await fs.readFile(filepath, "utf-8"));

    return data;
  } catch (err) {
    logger.log(
      `No config file found at ${filepath}, proceeding with defaults.`,
      "info",
    );
    return {};
  }
}

export async function parseSmmIgnore(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");

    const rules: IgnoreRule[] = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .map((line) => {
        const negated = line.startsWith("!");
        const pattern = negated ? line.slice(1) : line;

        return { pattern, negated };
      });

    function shouldIgnore(targetPath: string): boolean {
      const p = targetPath.replace(/\\/g, "/");

      let ignored = false;

      for (const rule of rules) {
        if (minimatch(p, rule.pattern, { dot: true })) {
          ignored = !rule.negated;
        }
      }

      return ignored;
    }

    return { rules, shouldIgnore };
  } catch (err) {
    logger.log(
      `No .smmignore file found at ${filePath}, proceeding without ignore rules.`,
      "info",
    );
    return {
      rules: [] as IgnoreRule[],
      shouldIgnore: (_: string) => false,
    };
  }
}

export async function getMarkdownFiles(
  baseUrl: string,
  pairChildren?: RouteTree[],
): Promise<string[] | { routeTree: RouteTree[]; files: string[] }> {
  const state = appState.getState();

  const files = await fs.readdir(baseUrl, { withFileTypes: true });
  const routeTree = pairChildren || [];

  const promises = [];
  for (const file of files) {
    const filePath = path.join(baseUrl, file.name);
    if (
      state.shouldIgnore(filePath.slice(state.options.directory.length)) ||
      filePath.slice(state.options.directory.length) ===
        state.finalConfig.publicPath
    )
      continue;

    if (file.isDirectory()) {
      const isGrouper = file.name.startsWith("(") && file.name.endsWith(")");

      const dirPair: RouteTree = {
        label: isGrouper ? file.name.slice(1, -1) : file.name,
        children: [],
        pathSegment: file.name,
        isGrouper,
      };
      routeTree.push(dirPair);
      promises.push(
        getMarkdownFiles(filePath, dirPair.children as RouteTree[]),
      );
    } else if (file.name.endsWith(".md")) {
      routeTree.push({
        label: file.name,
        children: null,
        pathSegment: file.name,
      });
      promises.push(Promise.resolve([filePath]));
    }
  }

  if (state.finalConfig.sortRoutes)
    routeTree.sort((a, b) => {
      if (a.label === "index.md") return -1;
      if (b.label === "index.md") return 1;

      if (a.isGrouper && !b.isGrouper) return 1;
      if (b.isGrouper && !a.isGrouper) return -1;

      return a.label.localeCompare(b.label);
    });

  const filess = state.finalConfig.trimIndexFromPath
    ? (await Promise.all(promises))
        .flat()
        .map((val) => trimIndexFromPath(val as string))
    : ((await Promise.all(promises)).flat() as string[]);

  return pairChildren ? filess : { routeTree, files: filess };
}

export function getRouteFromPath(sourcePath: string): string {
  const pathSegments = sourcePath.split("/").filter((segment) => !!segment);

  const routeTree: RouteTree = {
    label: "dummy",
    pathSegment: "",
    children: [],
  };

  let currentNode = routeTree;

  pathSegments.forEach((segment, i) => {
    currentNode.children!.push({
      label: segment,
      pathSegment: segment,
      children: i === pathSegments.length - 1 ? null : [],
    });
    currentNode = currentNode.children![0];
  });

  cleanNestedPaths(routeTree.children!);
  return makeRoutesOfNestedPaths(routeTree.children!)[0];
}

export function cleanNestedPaths(routeTree: RouteTree[]): void {
  const state = appState.getState();

  for (const pair of routeTree) {
    if (state.finalConfig.trimIndexFromPath) {
      pair.label = trimIndexFromPath(pair.label);
    }
    pair.label = cleanName(pair.label);
    pair.pathSegment = getPath(cleanName(pair.pathSegment)).replaceAll("/", "");

    if (pair.children) {
      cleanNestedPaths(pair.children);
      if (
        pair.children?.length === 1 &&
        ["", "index.md"].includes(pair.children?.[0]?.label)
      ) {
        pair.children = null;
      }
    }
  }
}

export function getPath(filepath: string): string {
  const state = appState.getState();

  let transformedPath = filepath
    .replace(state.options.directory, "")
    .replace(/\\/g, "/")
    .replace(/\/index.md$/, "")
    .replace(/\.md$/, "");

  if (state.finalConfig.trimIndexFromPath) {
    transformedPath = trimIndexFromPath(transformedPath);
  }

  return (
    slugify(transformedPath)
      .split("/")
      .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
      .join("/") || "/"
  );
}

export async function generateHtml(
  distDir?: string,
  routeContent?: string,
): Promise<string> {
  const state = appState.getState();

  try {
    let htmlTemplate = await fs.readFile(
      path.join(import.meta.dirname, "..", "index.html"),
      "utf-8",
    );

    const commentStart = htmlTemplate.indexOf("<!--");
    htmlTemplate = htmlTemplate.replace(
      htmlTemplate.slice(
        commentStart,
        htmlTemplate.indexOf("-->", commentStart) + 3,
      ),
      "",
    );

    if (distDir) {
      const files = readdirSync(path.join(distDir, "assets"));

      const cssFile = files.find((file) => file.endsWith(".css"));
      const jsFile = files.find((file) => file.endsWith(".js"));
      const prefix = distDir.slice(
        path.join(import.meta.dirname, state.options.directory).length,
      );
      htmlTemplate = htmlTemplate.replace(
        `<script type="module" src="/src/main.tsx"></script>`,
        "",
      );

      if (cssFile && jsFile) {
        htmlTemplate = htmlTemplate.replace(
          "{{distAssets}}",
          `<link rel="stylesheet" href="${path.join(
            prefix,
            "assets",
            cssFile,
          )}" />
             <script type="module" src="${path.join(
               prefix,
               "assets",
               jsFile,
             )}"></script>`,
        );
      } else {
        logger.error(`Could not find CSS and JS files in dist assets.`);
        htmlTemplate = htmlTemplate.replace("{{distAssets}}", "");
      }
    } else {
      htmlTemplate = htmlTemplate.replace("{{distAssets}}", "");
    }

    return htmlTemplate
      .replace("{{og}}", ogToHtml(state.finalConfig.og ?? {}))
      .replace("{{title}}", state.finalConfig.rootTitle ?? "Serve My MD")
      .replace("{{description}}", state.finalConfig.description ?? "")
      .replace(
        "{{favicon}}",
        state.finalConfig.favicon
          ? `<link rel="icon" href="${state.finalConfig.favicon}" />`
          : "",
      )
      .replace(
        "{{fonts}}",
        state.finalConfig.fonts
          ? (state.finalConfig.fonts.title && state.finalConfig.fonts.title.url
              ? `<link rel="stylesheet" href="${state.finalConfig.fonts.title.url}" />`
              : "") +
              (state.finalConfig.fonts.body && state.finalConfig.fonts.body.url
                ? `<link rel="stylesheet" href="${state.finalConfig.fonts.body.url}" />`
                : "") +
              (state.finalConfig.fonts.mono && state.finalConfig.fonts.mono.url
                ? `<link rel="stylesheet" href="${state.finalConfig.fonts.mono.url}" />`
                : "")
          : "",
      )
      .replace("{{content}}", STATIC_TEMP_CONTENT_PREFIX + (routeContent ?? ""))
      .trim();
  } catch (err) {
    throw new Error(`Failed to generate HTML: ${err}`);
  }
}

export async function buildDistRoutesFromRouteTree(
  routeTree: RouteTree[],
  groupedRoutes: Partial<Record<string, Route[]>>,
  distPath: string,
  write: Writer,
  prefix: string = "/",
): Promise<void> {
  for (const node of routeTree) {
    if (node.children) {
      await buildDistRoutesFromRouteTree(
        node.children,
        groupedRoutes,
        distPath,
        write,
        path.join(prefix, node.isGrouper ? "" : node.pathSegment),
      );
    } else {
      const distRoutePath =
        path.join(
          distPath,
          prefix,
          node.pathSegment.replace("/", ""),
          node.pathSegment ? "" : "/index.html",
        ) + (node.pathSegment === "" ? "" : ".html");

      const html = await generateHtml(
        distPath,
        groupedRoutes[path.posix.join(prefix, node.pathSegment)]?.[0]?.content,
      );
      await write(distRoutePath, html, "text/html");
    }
  }
}
