import logger from "@/lib/logger.js";
import { finalConfig } from "@/shared.js";
import type { Args } from "@/types/index.js";
import type { Route, Out, RouteTree } from "@shared/index.js";
import {
  FileOrDirectoryExists,
  makeRoutesOfNestedPaths,
  makeRoutesOfNestedPathsRaw,
  optional,
} from "@/utils/index.js";
import { cp, rm, writeFile } from "fs/promises";
import path, { resolve } from "path";
import { fileURLToPath } from "url";
import { build as viteBuild } from "vite";
import {
  getMarkdownFiles,
  cleanNestedPaths,
  parseMD,
  generateHtml,
  buildDistRoutesFromRouteTree,
} from "./index.js";
import { mkdirSync } from "fs";

const DIST_DIRNAME = "dist";
const WEB_DIRNAME = "web";
const PUBLIC_DIRNAME = "public";

export default async function build(options: Args): Promise<boolean> {
  const skipBuild = ("skipBuild" in options && options.skipBuild) ?? false;

  const { routeTree, files: markdownFiles } = (await getMarkdownFiles(
    options.directory,
  )) as { routeTree: RouteTree[]; files: string[] };

  const parsePromises: Promise<Route>[] = [];
  logger.log("Processing routes...");
  for (const file of makeRoutesOfNestedPathsRaw(routeTree)) {
    parsePromises.push(parseMD(path.join(options.directory, file)));
  }

  cleanNestedPaths(routeTree);

  const groupedRoutes = Object.groupBy(
    await Promise.all(parsePromises),
    (route) => route.path,
  );

  const routes = makeRoutesOfNestedPaths(routeTree).reduce(
    (acc, path) => [...acc, ...(groupedRoutes[path] ?? [])],
    [] as Route[],
  );

  const out: Out = {
    rootTitle: finalConfig.rootTitle ?? "Documentation",
    description: finalConfig.description ?? "Documentation",
    baseRoute: finalConfig.baseRoute ?? "/",
    defaultTheme: finalConfig.defaultTheme ?? "dark",
    name: finalConfig.name ?? "Serve My MD",
    showNameWithLogo: finalConfig.showNameWithLogo ?? false,
    routes,
    fonts: {
      title: finalConfig.fonts?.title?.name || "serif",
      body: finalConfig.fonts?.body?.name || "sans-serif",
      mono: finalConfig.fonts?.mono?.name || "monospace",
    },
    ...optional("favicon", finalConfig.favicon),
    ...optional("version", finalConfig.version),
  };

  routes.forEach((o) => {
    logger.log(o.path);
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const webDir = path.join(__dirname, "..", WEB_DIRNAME);
  const distDir = path.join(webDir, DIST_DIRNAME);

  mkdirSync(path.join(webDir, "src", ".generated"), { recursive: true });

  await writeFile(
    path.join(webDir, "src", ".generated", "output.json"),
    JSON.stringify(out),
  );
  await writeFile(
    path.join(webDir, "src", ".generated", "paths.json"),
    JSON.stringify(routeTree),
  );
  logger.log("\nParsed MDs");
  await writeFile(path.join(webDir, "index.html"), await generateHtml());
  logger.log("Generated HTML from template");

  if (!skipBuild) {
    if (finalConfig.publicPath) {
      if (
        await FileOrDirectoryExists(
          path.join(options.directory, finalConfig.publicPath),
        )
      ) {
        logger.log(`Copying public assets from ${finalConfig.publicPath}...`);
        await cp(
          path.join(options.directory, finalConfig.publicPath),
          path.join(webDir, PUBLIC_DIRNAME),
          { recursive: true },
        );
      } else {
        logger.error(`Public path "${finalConfig.publicPath}" does not exist!`);
      }
    }

    logger.log("Building the app...");
    await viteBuild({
      configFile: resolve(webDir, "vite.config.ts"),
    });

    await buildDistRoutesFromRouteTree(routeTree, groupedRoutes, distDir);

    const targetDist = path.join(options.directory, DIST_DIRNAME);

    await rm(targetDist, { recursive: true }).catch(() => {});

    logger.log("Built the app, copying results...");
    return cp(distDir, targetDist, { recursive: true })
      .then(() => {
        logger.log("Done successfully!");
        return true;
      })
      .catch((err) => {
        logger.error("Error copying files: " + err);
        return false;
      });
  }

  return Promise.resolve(true);
}
