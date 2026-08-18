import { appState } from "@/lib/context.js";
import fs from "fs/promises";
import path from 'path';
import type { RouteTree, Route } from "@shared/index.js";
import constants from "@shared/constants.json" with {type: "json"};
import type { Writer } from "@/types/index.js";
import { ogToHtml } from "@/utils/index.js";
import { logger } from "@/lib/index.js";

const STATIC_TEMP_CONTENT_PREFIX = constants.STATIC_TEMP_CONTENT_PREFIX;

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
      const files = await fs.readdir(path.join(distDir, "assets"));

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
