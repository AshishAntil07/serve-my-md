import fs from "fs/promises";
import logger from "@/lib/logger.js";
import type { IgnoreRule } from "@/types/index.js";
import type { Route, RouteTree } from "@shared/index.js";
import path from "path";
import { minimatch } from "minimatch";
import { finalConfig, mdParser, shouldIgnore } from "@/shared.js";
import {
  cleanName,
  ogToHtml,
  slugify,
  trimIndexFromPath,
} from "@/utils/index.js";
import { options } from "@/lib/commander.js";
import { readdir, readdirSync } from "fs";
import constants from "@shared/constants.json" with { type: "json" };

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
  const files = await fs.readdir(baseUrl, { withFileTypes: true });
  const routeTree = pairChildren || [];

  const promises = [];
  for (const file of files) {
    const filePath = path.join(baseUrl, file.name);
    if (
      shouldIgnore(filePath.slice(options.directory.length)) ||
      filePath.slice(options.directory.length) === finalConfig.publicPath
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

  if (finalConfig.sortRoutes)
    routeTree.sort((a, b) => {
      if (a.label === "index.md") return -1;
      if (b.label === "index.md") return 1;

      if (a.isGrouper && !b.isGrouper) return 1;
      if (b.isGrouper && !a.isGrouper) return -1;

      return a.label.localeCompare(b.label);
    });

  const filess = finalConfig.trimIndexFromPath
    ? (await Promise.all(promises))
        .flat()
        .map((val) => trimIndexFromPath(val as string))
    : ((await Promise.all(promises)).flat() as string[]);

  return pairChildren ? filess : { routeTree, files: filess };
}

export function cleanNestedPaths(routeTree: RouteTree[]): void {
  for (const pair of routeTree) {
    if (finalConfig.trimIndexFromPath) {
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
  let transformedPath = filepath
    .replace(options.directory, "")
    .replace(/\\/g, "/")
    .replace(/\/index.md$/, "")
    .replace(/\.md$/, "");

  if (finalConfig.trimIndexFromPath) {
    transformedPath = trimIndexFromPath(transformedPath);
  }

  return (
    slugify(transformedPath)
      .split("/")
      .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
      .join("/") || "/"
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

export async function generateHtml(
  distDir?: string,
  routeContent?: string,
): Promise<string> {
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
      const prefix = distDir.slice(path.join(import.meta.dirname, options.directory).length);
      htmlTemplate = htmlTemplate.replace(`<script type="module" src="/src/main.tsx"></script>`, "");

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
      .replace("{{og}}", ogToHtml(finalConfig.og ?? {}))
      .replace("{{title}}", finalConfig.rootTitle ?? "Serve My MD")
      .replace("{{description}}", finalConfig.description ?? "")
      .replace(
        "{{favicon}}",
        finalConfig.favicon
          ? `<link rel="icon" href="${finalConfig.favicon}" />`
          : "",
      )
      .replace(
        "{{fonts}}",
        finalConfig.fonts
          ? (finalConfig.fonts.title && finalConfig.fonts.title.url
              ? `<link rel="stylesheet" href="${finalConfig.fonts.title.url}" />`
              : "") +
              (finalConfig.fonts.body && finalConfig.fonts.body.url
                ? `<link rel="stylesheet" href="${finalConfig.fonts.body.url}" />`
                : "") +
              (finalConfig.fonts.mono && finalConfig.fonts.mono.url
                ? `<link rel="stylesheet" href="${finalConfig.fonts.mono.url}" />`
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
  prefix: string = "/",
): Promise<void> {
  for (const node of routeTree) {
    if (node.children && node.isGrouper) {
      await buildDistRoutesFromRouteTree(
        node.children,
        groupedRoutes,
        distPath,
        prefix,
      );
    } else {
      const distRoutePath =
        path.join(distPath, prefix, node.pathSegment.replace("/", "")) +
        (node.pathSegment === "" ? "/index.html" : ".html");

      await fs.mkdir(path.dirname(distRoutePath), { recursive: true });
      const html = await generateHtml(
        distPath,
        groupedRoutes[path.posix.join(prefix, node.pathSegment)]?.[0]?.content,
      );
      await fs.writeFile(distRoutePath, html, "utf-8");

      if (node.children) {
        await buildDistRoutesFromRouteTree(
          node.children,
          groupedRoutes,
          distPath,
          path.join(prefix, node.pathSegment),
        );
      }
    }
  }
}
