import logger from "@/lib/logger.js";
import type { BuildArgs, SharedState, Writer } from "@/types/index.js";
import type {
  Route,
  StaticMeta,
  RouteTree,
  SearchIndex,
} from "@shared/index.js";
import {
  FileOrDirectoryExists,
  makeRoutesOfNestedPaths,
  makeRoutesOfNestedPathsRaw,
  optional,
  promiseAll,
} from "@/utils/index.js";
import { cp, mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import {
  getMarkdownFiles,
  cleanNestedPaths,
  generateHtml,
  buildDistRoutesFromRouteTree,
  getRouteFromPath,
} from "./index.js";
import { parseMD } from "./processor.js";
import { appState, routeState } from "@/lib/context.js";
import { DIST_DIRNAME, distDir } from "@/constants.js";

export default async function build(): Promise<boolean> {
  const state = appState.getState();
  const options = state.options as BuildArgs;

  const targetDist = path.join(
    options.directory,
    state.finalConfig.outDir || DIST_DIRNAME,
  );

  await rm(targetDist, { recursive: true }).catch(() => {});

  const isCopied = await cp(distDir, targetDist, { recursive: true })
    .then(() => {
      return true;
    })
    .catch((err) => {
      logger.error("Error copying dist files: " + err);
      return false;
    });

  if (state.finalConfig.publicPath) {
    if (
      await FileOrDirectoryExists(
        state.finalConfig.publicPath,
      )
    ) {
      logger.log(
        `Copying public assets from ${state.finalConfig.publicPath}...`,
      );
      cp(
        state.finalConfig.publicPath,
        targetDist,
        { recursive: true },
      ).catch((err) => {
        logger.error("Error copying public files: " + err);
      });
    } else {
      logger.error(
        `Public path "${state.finalConfig.publicPath}" does not exist!`,
      );
    }
  }

  if (!isCopied) {
    return Promise.reject(
      new Error("Failed to copy built files to target directory."),
    );
  }

  return buildSite(
    options,
    state,
    async (filePath: string, content: string) => {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
    },
  );
}

export async function buildSite(
  options: BuildArgs,
  state: SharedState,
  write: Writer,
): Promise<boolean> {
  const targetDist = path.join(
    options.directory,
    state.finalConfig.outDir || DIST_DIRNAME,
  );

  const { routeTree, files } = (await getMarkdownFiles(options.directory)) as {
    routeTree: RouteTree[];
    files: string[];
  };

  //? keep this thing above the parseMD thingy, cuz the parser NEEDS a routeState populated with data well before.
  routeState.setState({
    // routes: files.map((item) => {
    //   return getRouteFromPath(item);
    // }),
    files
  });

  const parsePromises: ReturnType<typeof parseMD>[] = [];
  logger.log("Processing routes...");
  for (const file of makeRoutesOfNestedPathsRaw(routeTree)) {
    parsePromises.push(parseMD(path.join(options.directory, file)));
  }

  logger.log("parsed routes", "debug");

  //? all operations on routeTree before this comment are when routeTree is still in its raw state, with pathSegments and labels as they were read from the filesystem.

  cleanNestedPaths(routeTree);

  logger.log("cleaned routeTree", "debug");

  const { searchIndex: _searchIndex, parsedRoutes } = (
    await Promise.all(parsePromises)
  ).reduce(
    (acc, { searchIndex, route }) => {
      acc.searchIndex.push(searchIndex);
      acc.parsedRoutes.push(route);
      return acc;
    },
    { searchIndex: [] as SearchIndex, parsedRoutes: [] as Route[] },
  );

  const groupedRoutes = Object.groupBy(parsedRoutes, (route) => route.path);

  const routes = makeRoutesOfNestedPaths(routeTree).reduce(
    (acc, pth) => [
      ...acc,
      ...(groupedRoutes[pth] ?? []).map((r) => ({
        ...r,
        path: path.join(state.finalConfig.baseRoute || "/", r.path),
      })), //? groupedRoutes[pth] is an array of a single route object.
    ],
    [] as Route[],
  );
  for (let i = 0; i < routes.length; i++) {
    routes[i].next = routes[i + 1]?.path;
    routes[i].prev = routes[i - 1]?.path;
  }

  logger.log("made routes", "debug");

  const staticMeta: StaticMeta = {
    rootTitle: state.finalConfig.rootTitle ?? "Documentation",
    description: state.finalConfig.description ?? "Documentation",
    baseRoute: state.finalConfig.baseRoute ?? "/",
    defaultTheme: state.finalConfig.defaultTheme ?? "dark",
    name: state.finalConfig.name ?? "Serve My MD",
    showNameWithLogo: state.finalConfig.showNameWithLogo ?? false,
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

  await write(
    path.join(targetDist, "page_data", "paths.json"),
    JSON.stringify(routeTree),
    "application/json",
  );
  await write(
    path.join(targetDist, "page_data", "meta.json"),
    JSON.stringify(staticMeta),
    "application/json",
  );

  //? route registry, maps route path to json file identifier name.
  await write(
    path.join(targetDist, "page_data", "registry.json"),
    JSON.stringify(
      routes.map((r) => ({ path: r.path, identifier: r.identifier })),
    ),
    "application/json",
  );

  const writePromises = [];
  for (const route of routes) {
    writePromises.push(
      write(
        path.join(
          targetDist,
          "page_data",
          "routes",
          `${route.identifier}.json`,
        ),
        JSON.stringify(route),
        "application/json",
      ),
    );
  }

  writePromises.push(
    write(
      path.join(targetDist, "index.html"),
      await generateHtml(targetDist),
      "text/html",
    ),
  );

  try {
    await Promise.all(writePromises);
  } catch (error) {
    logger.error("Error writing route files: " + error);
    throw error;
  }

  logger.log("\nParsed MDs");

  await buildDistRoutesFromRouteTree(
    routeTree,
    groupedRoutes,
    targetDist,
    write,
  );

  return Promise.resolve(true);
}
