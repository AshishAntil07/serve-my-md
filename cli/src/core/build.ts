import logger from "@/lib/logger.js";
import type { Args } from "@/types/index.js";
import type { Route, Out, RouteTree } from "@shared/index.js";
import {
  FileOrDirectoryExists,
  makeRoutesOfNestedPaths,
  makeRoutesOfNestedPathsRaw,
  optional,
} from "@/utils/index.js";
import { cp, readdir, rm, writeFile } from "fs/promises";
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
import { mkdirSync, existsSync, mkdir } from "fs";
import { getState } from "@/lib/context.js";


export default async function build(): Promise<boolean> {
  const state = getState();

  const DIST_DIRNAME = state.finalConfig.outDir || "dist";
  const WEB_DIRNAME = "web";
  const PUBLIC_DIRNAME = "public";


  const options = state.options as Args;

  const skipBuild = ("skipBuild" in options && options.skipBuild) ?? false;

  const { routeTree, files: markdownFiles } = (await getMarkdownFiles(
    options.directory,
    options,
  )) as { routeTree: RouteTree[]; files: string[] };

  const parsePromises: Promise<Route>[] = [];
  logger.log("Processing routes...");
  for (const file of makeRoutesOfNestedPathsRaw(routeTree)) {
    parsePromises.push(parseMD(path.join(options.directory, file), options));
  }

  cleanNestedPaths(routeTree, options);

  const groupedRoutes = Object.groupBy(
    await Promise.all(parsePromises),
    (route) => route.path,
  );

  const routes = makeRoutesOfNestedPaths(routeTree).reduce(
    (acc, pth) => [
      ...acc,
      ...(groupedRoutes[pth] ?? []).map((r) => ({
        ...r,
        path: path.join(state.finalConfig.baseRoute || "/", r.path),
      })),
    ],
    [] as Route[],
  );

  const out: Out = {
    rootTitle: state.finalConfig.rootTitle ?? "Documentation",
    description: state.finalConfig.description ?? "Documentation",
    baseRoute: state.finalConfig.baseRoute ?? "/",
    defaultTheme: state.finalConfig.defaultTheme ?? "dark",
    name: state.finalConfig.name ?? "Serve My MD",
    showNameWithLogo: state.finalConfig.showNameWithLogo ?? false,
    routes,
    outDir: DIST_DIRNAME,
    fonts: {
      title: state.finalConfig.fonts?.title?.name || "serif",
      body: state.finalConfig.fonts?.body?.name || "sans-serif",
      mono: state.finalConfig.fonts?.mono?.name || "monospace",
    },
    ...optional("favicon", state.finalConfig.favicon),
    ...optional("version", state.finalConfig.version),
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
    if(existsSync(path.join(webDir, PUBLIC_DIRNAME))) {
      const entries = await readdir(path.join(webDir, PUBLIC_DIRNAME));
  
      for (const entry of entries) {
        await rm(path.join(webDir, PUBLIC_DIRNAME, entry), {
          recursive: true,
          force: true,
        });
      }
    } else {
      mkdirSync(path.join(webDir, PUBLIC_DIRNAME));
    }

    if (state.finalConfig.publicPath) {
      if (
        await FileOrDirectoryExists(
          path.join(options.directory, state.finalConfig.publicPath),
        )
      ) {
        logger.log(`Copying public assets from ${state.finalConfig.publicPath}...`);
        await cp(
          path.join(options.directory, state.finalConfig.publicPath),
          path.join(webDir, PUBLIC_DIRNAME),
          { recursive: true },
        );
      } else {
        logger.error(`Public path "${state.finalConfig.publicPath}" does not exist!`);
      }
    }

    logger.log("Building the app...");
    await viteBuild({
      configFile: resolve(webDir, "vite.config.ts"),
    });

    await buildDistRoutesFromRouteTree(routeTree, groupedRoutes, distDir, options);

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
