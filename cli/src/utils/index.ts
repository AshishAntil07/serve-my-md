/**
 * All these are pure functions with no side effects or dependency.
 */



import fs from "fs/promises";
import type { OpenGraph } from "@/types/og.js";
import type { RouteTree } from "@shared/index.js";

const indexTokens = "1234567890.";

export function trimIndexFromPath(filePath: string): string {
  return filePath
    .split("/")
    .map((segment) => {
      let offset = 0;
      let encountered = false;

      while (
        offset < segment.length &&
        (indexTokens.includes(segment[offset]!) ||
          (segment[offset] === " " && !encountered))
      )
        if (segment[offset++] !== " ") encountered = true;

      return segment.slice(offset).trim();
    })
    .join("/");
}

function* identifierGenerator() {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let length = 1;

  while (true) {
    const max = Math.pow(chars.length, length);
    for (let i = 0; i < max; i++) {
      let id = "";
      let num = i;
      for (let j = 0; j < length; j++) {
        id = chars[num % chars.length] + id;
        num = Math.floor(num / chars.length);
      }
      yield id;
    }
    length++;
  }
}

/**
 * Doesn't respect .smmignore
 */
export async function traverseRecursive(directory: string, callback: (filePath: string) => Promise<void>) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      await traverseRecursive(fullPath, callback);
    } else {
      await callback(fullPath);
    }
  }
}

export async function promiseAll<T, U>(arr: Array<T>, callback: (item: T, index?: number) => Promise<U>): Promise<Array<U>> {
  const promises: Array<Promise<U>> = [], n = arr.length;
  for (let i = 0; i < n; i++)
    promises.push(callback(arr[i], i));
  return Promise.all(promises);
}

export const getIdentifier = (() => {
  const idGen = identifierGenerator();
  return () => idGen.next().value!;
})();

export function cleanName(filename: string): string {
  return filename === "index.md" ? "" : filename.replace(/\.md$/, "");
}

export function optional(prop: string, val: any) {
  return val ? { [prop]: val } : {};
}

export function slugify(filepath: string) {
  return filepath
    .toLowerCase()
    .split("")
    .map((c) => {
      if (".,;\"'\\:<>`?!".includes(c)) return "";
      if (c === " " || c === "_") return "-";
      return c;
    })
    .join("");
}

export function slugifyText(text: string) {
  return text
    .toLowerCase()
    .split("")
    .map((c) => {
      if (".,;\"'\\:<>`?!*^%&#@$()[]{}|".includes(c)) return "";
      if (" _/".includes(c)) return "-";
      return c;
    })
    .join("");
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

export function makeRoutesOfNestedPaths(
  nestedPaths: RouteTree[],
  prefix: string = "/",
): string[] {
  return nestedPaths.reduce((acc, { pathSegment, children, isGrouper }) => {
    return [
      ...acc,
      ...(isGrouper || !children ? [] : [prefix + pathSegment]),
      ...(children
        ? makeRoutesOfNestedPaths(
            children,
            prefix + (!isGrouper ? pathSegment + "/" : ""),
          )
        : isGrouper
          ? []
          : [prefix + pathSegment]),
    ];
  }, [] as string[]);
}

/**
 * Only useful for getting accurate paths of markdown files as is, but **before** cleaning the nestedPaths.
 *
 * If you wanna get a clean path resembling final route, use the function without "Raw" postfix.
 */
export function makeRoutesOfNestedPathsRaw(
  nestedPaths: RouteTree[],
  prefix: string = "/",
): string[] {
  return nestedPaths.reduce((acc, { pathSegment, children }) => {
    return [
      ...acc,
      ...(children
        ? makeRoutesOfNestedPathsRaw(children, prefix + pathSegment + "/")
        : [prefix + pathSegment]),
    ];
  }, [] as string[]);
}

export function cacheBoundary<T, U>(callback: (state: T | null, param: U) => void) {
  let state: T | null = null;
  return (param: U) => callback(state, param);
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
