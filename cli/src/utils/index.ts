import fs from "fs/promises";
import path from "path";
import { finalConfig, mdParser } from "../index.js";
import { options } from "../lib/commander.js";
import type { NestedPair } from "../types/index.js";
import type { OpenGraph } from "../types/og.js";
import { shouldIgnore } from "../index.js";

export const nestedPaths: NestedPair<string>[] = [];

export async function getMarkdownFiles(
  baseUrl: string,
  pairChildren?: NestedPair<string>[],
): Promise<string[]> {
  const files = await fs.readdir(baseUrl, { withFileTypes: true });

  const promises = [];
  for (const file of files) {
    const filePath = path.join(baseUrl, file.name);
    if (shouldIgnore(filePath.slice(options.directory.length))) continue;
    if (file.isDirectory()) {
      const dirPair: NestedPair<string> = [getPath(file.name), []];
      if (pairChildren) pairChildren.push(dirPair);
      else nestedPaths.push(dirPair);
      promises.push(
        getMarkdownFiles(filePath, dirPair[1] as NestedPair<string>[]),
      );
    } else if (file.name.endsWith(".md")) {
      if (pairChildren) pairChildren.push([getPath(file.name), null]);
      else nestedPaths.push([getPath(filePath), null]);
      promises.push(Promise.resolve([filePath]));
    }
  }

  if (finalConfig.sortRoutes)
    if (pairChildren) pairChildren.sort((a, b) => a[0].localeCompare(b[0]));
    else nestedPaths.sort((a, b) => a[0].localeCompare(b[0]));

  return finalConfig.trimIndex
    ? (await Promise.all(promises)).flat().map(trimIndexFromPath)
    : (await Promise.all(promises)).flat();
}

const indexTokens = "1234567890.";

export function trimIndexFromPath(filePath: string): string {
  let offset = filePath.lastIndexOf("/") + 1;
  while (offset < filePath.length && indexTokens.includes(filePath[offset]!))
    offset++;

  return (
    filePath.slice(0, filePath.lastIndexOf("/") + 1) + filePath.slice(offset)
  );
}

export function cleanNestedPaths(np: typeof nestedPaths = nestedPaths) {
  for (const pair of np) {
    if (finalConfig.trimIndex) {
      pair[0] = trimIndexFromPath(pair[0]);
    }
    if (pair[1]) {
      cleanNestedPaths(pair[1]);
      if (pair[1]?.length === 1 && pair[1]?.[0]?.[0] === "") {
        pair[1] = null;
      }
    }
  }
}

export function getPath(filepath: string): string {
  return (
    (options.directory.endsWith("/") ? "/" : "") +
    filepath
      .replace(options.directory, "")
      .replace(/\\/g, "/")
      .replace(/\.md$/, "")
      .replace(/\/index$/, "")
      .replace(/index$/, "")
  );
}

export async function FileOrDirectoryExists(
  filepath: string,
): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

export async function parseMD(
  filepath: string,
): Promise<{ path: string; content: string }> {
  const path = getPath(filepath);
  return {
    path,
    content: mdParser.render(await fs.readFile(filepath, "utf-8")),
  };
}

export function ogToHtml(og: OpenGraph): string {
  const tags: string[] = [];

  for (const [key, value] of Object.entries(og)) {
    if (value == null) continue;
    if (["images", "videos", "audios"].includes(key)) continue;
    if (Array.isArray(value)) {
      // Only used for "locale:alternate"
      for (const v of value) {
        tags.push(`<meta property="og:${key}" content="${v}">`);
      }
    } else {
      tags.push(`<meta property="og:${key}" content="${value}">`);
    }
  }

  [...(og.images ?? []), ...(og.videos ?? []), ...(og.audios ?? [])].forEach(
    (img) => {
      Object.entries(img).forEach(([k, v]) => {
        if (v == null) return;
        tags.push(`<meta property="og:${k}" content="${v}">`);
      });
    },
  );

  return tags.join("\n");
}
