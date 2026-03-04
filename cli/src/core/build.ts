import logger from "@/lib/logger.js";
import { finalConfig } from "@/shared.js";
import type { Args } from "@/types/index.js";
import type { Route, Out, NestedPair } from "@shared/index.js";
import { FileOrDirectoryExists } from "@/utils/index.js";
import { execSync } from "child_process";
import { cp, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  getMarkdownFiles,
  cleanNestedPaths,
  parseMD,
  generateHtml,
} from "./index.js";
import { mkdirSync } from "fs";

export default async function build(options: Args): Promise<boolean> {
  const { nestedPaths, files: markdownFiles } = (await getMarkdownFiles(
    options.directory,
  )) as { nestedPaths: NestedPair<string>[]; files: string[] };
  cleanNestedPaths(nestedPaths);

  const parsePromises: Promise<Route>[] = [];
  logger.log("Processing routes...");
  for (const file of markdownFiles) {
    parsePromises.push(parseMD(file));
  }

  const out: Out = {
    rootTitle: finalConfig.rootTitle ?? "Documentation",
    description: finalConfig.description ?? "Documentation",
    baseRoute: finalConfig.baseRoute ?? "/",
    defaultTheme: finalConfig.defaultTheme ?? "dark",
    name: finalConfig.name ?? "Serve My MD",
    showNameWithLogo: finalConfig.showNameWithLogo ?? false,
    routes: await Promise.all(parsePromises),
    fonts: {
      title: finalConfig.fonts?.title?.name || "serif",
      body: finalConfig.fonts?.body.name || "sans-serif",
    },
    ...(finalConfig.favicon ? { favicon: finalConfig.favicon } : {}),
  };
  out.routes.forEach((o) => {
    logger.log(o.path);
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const webDir = path.join(__dirname, "..", "..", "web");
  const distDir = path.join(webDir, "dist");

  mkdirSync(path.join(webDir, "src", ".generated"), { recursive: true });

  await writeFile(path.join(webDir, "src", ".generated", "output.json"), JSON.stringify(out));
  await writeFile(
    path.join(webDir, "src", ".generated", "paths.json"),
    JSON.stringify(nestedPaths),
  );
  logger.log("\nParsed MDs");
  await writeFile(path.join(webDir, "index.html"), await generateHtml());
  logger.log("Generated HTML from template");

  if (finalConfig.publicPath) {
    if (
      await FileOrDirectoryExists(
        path.join(options.directory, finalConfig.publicPath),
      )
    ) {
      logger.log(`Copying public assets from ${finalConfig.publicPath}...`);
      await cp(
        path.join(options.directory, finalConfig.publicPath),
        path.join(webDir, "public"),
        { recursive: true }
      );
    } else {
      logger.error(`Public path "${finalConfig.publicPath}" does not exist!`);
    }
  }

  logger.log("Installing dependencies...");
  try {
    execSync("npm install", { cwd: webDir });
  } catch(err) {
    logger.error("npm install failed: " + err);
    return false;
  }

  logger.log("Building the app...");
  try {
    execSync("npm run build", { cwd: webDir });
  } catch(err) {
    logger.error("Build failed: " + err);
    return false;
  }


  logger.log("Built the app, copying results...");
  return cp(distDir, options.directory)
    .then(() => {
      logger.log("Done successfully!");
      return true;
    })
    .catch((err) => {
      logger.error("Error copying files: " + err);
      return false;
    });
}
