import type { RouteTree } from "@shared/index.js";
import fs from "fs/promises";
import { appState } from "@/lib/context.js";
import path from "path";
import { makeRoutesOfNestedPaths, cleanName, trimIndexFromPath, slugify } from "@/utils/index.js";

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
      filePath ===
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

  const filess = ((await Promise.all(promises)).flat() as string[]);

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


/**
 * if you want a full-fledged final output route/path string use `getRouteFromPath` instead.
 */
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
