import fs from "fs/promises";
import logger from "@/lib/logger.js";
import type { IgnoreRule, NestedPair } from "@/types/index.js";
import path from "path";
import { minimatch } from "minimatch";
import { finalConfig, mdParser, shouldIgnore } from "@/index.js";
import { ogToHtml, slugify, trimIndexFromPath } from "@/utils/index.js";
import { options } from "@/lib/commander.js";

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
  const transformedPath = filepath
    .replace(options.directory, "")
    .replace(/\\/g, "/")
    .replace(/\/index.md$/, "")
    .replace(/\.md$/, "");

  return (
    (options.directory.endsWith("/") ? "/" : "") +
    transformedPath.slice(0, transformedPath.lastIndexOf("/") + 1) +
    slugify(transformedPath.slice(transformedPath.lastIndexOf("/") + 1))
  );
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

export async function generateHtml() {
  try {
    const htmlTemplate = await fs.readFile(
      path.join(import.meta.dirname, "..", "index.html"),
      "utf-8",
    );

    return htmlTemplate
      .replace("{{og}}", ogToHtml(finalConfig.og ?? {}))
      .replace("{{title}}", finalConfig.rootTitle ?? "Serve My MD")
      .replace("{{description}}", finalConfig.description ?? "")
      .replace("{{favicon}}", finalConfig.favicon ?? "")
      .replace(
        "{{fonts}}",
        finalConfig.fonts
          ? (finalConfig.fonts.title
              ? `<link rel="preconnect" href="${finalConfig.fonts.title.url}" />`
              : "") +
              (finalConfig.fonts.body
                ? `<link rel="preconnect" href="${finalConfig.fonts.body.url}" />`
                : "")
          : "",
      );
  } catch (err) {
    throw new Error(`Failed to generate HTML: ${err}`);
  }
}
