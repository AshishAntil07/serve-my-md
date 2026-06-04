#!/usr/bin/env node

// cli/src/lib/logger.ts
var Logger = class {
  static log(message, type) {
    console.log(`${type ? `[${type.toUpperCase()}] ` : ""}${message}`);
  }
  static error(message) {
    console.error(`[ERROR] ${message}`);
  }
};

// cli/src/shared.ts
import MarkdownIt from "markdown-it";
import path2 from "path";
import Prism from "prismjs";

// cli/src/core/index.ts
import fs2 from "fs/promises";
import path from "path";
import { minimatch } from "minimatch";

// cli/src/utils/index.ts
import fs from "fs/promises";
var indexTokens = "1234567890.";
function trimIndexFromPath(filePath) {
  return filePath.split("/").map((segment) => {
    let offset = 0;
    let encountered = false;
    while (offset < segment.length && (indexTokens.includes(segment[offset]) || segment[offset] === " " && !encountered))
      if (segment[offset++] !== " ") encountered = true;
    return segment.slice(offset).trim();
  }).join("/");
}
function cleanName(filename) {
  return filename === "index.md" ? "" : filename.replace(/\.md$/, "");
}
function optional(prop, val) {
  return val ? { [prop]: val } : {};
}
function slugify(filepath) {
  return filepath.toLowerCase().split("").map((c) => {
    if (".,;\"'\\:<>`?!".includes(c)) return "";
    if (c === " " || c === "_") return "-";
    return c;
  }).join("");
}
async function FileOrDirectoryExists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}
function makeRoutesOfNestedPaths(nestedPaths, prefix = "/") {
  return nestedPaths.reduce((acc, { pathSegment, children, isGrouper }) => {
    return [
      ...acc,
      ...isGrouper || !children ? [] : [prefix + pathSegment],
      ...children ? makeRoutesOfNestedPaths(
        children,
        prefix + (!isGrouper ? pathSegment + "/" : "")
      ) : isGrouper ? [] : [prefix + pathSegment]
    ];
  }, []);
}
function makeRoutesOfNestedPathsRaw(nestedPaths, prefix = "/") {
  return nestedPaths.reduce((acc, { pathSegment, children }) => {
    return [
      ...acc,
      ...children ? makeRoutesOfNestedPathsRaw(
        children,
        prefix + pathSegment + "/"
      ) : [prefix + pathSegment]
    ];
  }, []);
}
function ogToHtml(og) {
  const tags = [];
  for (const [key, value] of Object.entries(og)) {
    if (value == null) continue;
    if (["images", "videos", "audios"].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        tags.push(`<meta property="og:${key}" content="${v}">`);
      }
    } else {
      tags.push(`<meta property="og:${key}" content="${value}">`);
    }
  }
  [...og.images ?? [], ...og.videos ?? [], ...og.audios ?? []].forEach(
    (img) => {
      Object.entries(img).forEach(([k, v]) => {
        if (v == null) return;
        tags.push(`<meta property="og:${k}" content="${v}">`);
      });
    }
  );
  return tags.join("\n");
}

// cli/src/lib/commander.ts
import * as inquirer from "@inquirer/prompts";

// cli/src/config.json
var config_default = {
  name: "serve-my-md",
  version: "1.0.0",
  description: "A CLI tool to create a ready-to-serve static website from markdown files",
  defaultConfigPath: "./smm.config.json",
  defaultIgnorePath: "./.smmignore"
};

// cli/src/lib/commander.ts
import { Command } from "commander";
var program = new Command();
program.name(config_default.name).description(config_default.description).version(config_default.version);
program.option("-d, --directory <path>", "Directory to scan for markdown files", ".");
program.option("-i, --interactive", "Enable interactive mode");
if (process.env.VITEST) {
  program.option("--skip-build", "Skip the build step");
}
program.parse(process.argv);
var options = program.opts();
if (options.interactive || options.directory === void 0) {
  const res = await inquirer.input({
    message: `Enter root directory: `,
    default: options.directory || "./"
  });
  options.directory = res.trim();
}

// cli/src/core/index.ts
import { readdirSync } from "fs";

// shared/constants.json
var constants_default = {
  STATIC_TEMP_CONTENT_PREFIX: "__smm_static_temp_content__"
};

// cli/src/core/index.ts
var STATIC_TEMP_CONTENT_PREFIX = constants_default.STATIC_TEMP_CONTENT_PREFIX;
async function readConfig(filepath) {
  try {
    const data = JSON.parse(await fs2.readFile(filepath, "utf-8"));
    return data;
  } catch (err) {
    Logger.log(
      `No config file found at ${filepath}, proceeding with defaults.`,
      "info"
    );
    return {};
  }
}
async function parseSmmIgnore(filePath) {
  try {
    let shouldIgnore3 = function(targetPath) {
      const p = targetPath.replace(/\\/g, "/");
      let ignored = false;
      for (const rule of rules) {
        if (minimatch(p, rule.pattern, { dot: true })) {
          ignored = !rule.negated;
        }
      }
      return ignored;
    };
    var shouldIgnore2 = shouldIgnore3;
    const raw = await fs2.readFile(filePath, "utf8");
    const rules = raw.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "" && !line.startsWith("#")).map((line) => {
      const negated = line.startsWith("!");
      const pattern = negated ? line.slice(1) : line;
      return { pattern, negated };
    });
    return { rules, shouldIgnore: shouldIgnore3 };
  } catch (err) {
    Logger.log(
      `No .smmignore file found at ${filePath}, proceeding without ignore rules.`,
      "info"
    );
    return {
      rules: [],
      shouldIgnore: (_) => false
    };
  }
}
async function getMarkdownFiles(baseUrl, pairChildren) {
  const files = await fs2.readdir(baseUrl, { withFileTypes: true });
  const routeTree = pairChildren || [];
  const promises = [];
  for (const file of files) {
    const filePath = path.join(baseUrl, file.name);
    if (shouldIgnore(filePath.slice(options.directory.length)) || filePath.slice(options.directory.length) === finalConfig.publicPath)
      continue;
    if (file.isDirectory()) {
      const isGrouper = file.name.startsWith("(") && file.name.endsWith(")");
      const dirPair = {
        label: isGrouper ? file.name.slice(1, -1) : file.name,
        children: [],
        pathSegment: file.name,
        isGrouper
      };
      routeTree.push(dirPair);
      promises.push(
        getMarkdownFiles(filePath, dirPair.children)
      );
    } else if (file.name.endsWith(".md")) {
      routeTree.push({
        label: file.name,
        children: null,
        pathSegment: file.name
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
  const filess = finalConfig.trimIndexFromPath ? (await Promise.all(promises)).flat().map((val) => trimIndexFromPath(val)) : (await Promise.all(promises)).flat();
  return pairChildren ? filess : { routeTree, files: filess };
}
function cleanNestedPaths(routeTree) {
  for (const pair of routeTree) {
    if (finalConfig.trimIndexFromPath) {
      pair.label = trimIndexFromPath(pair.label);
    }
    pair.label = cleanName(pair.label);
    pair.pathSegment = getPath(cleanName(pair.pathSegment)).replaceAll("/", "");
    if (pair.children) {
      cleanNestedPaths(pair.children);
      if (pair.children?.length === 1 && ["", "index.md"].includes(pair.children?.[0]?.label)) {
        pair.children = null;
      }
    }
  }
}
function getPath(filepath) {
  let transformedPath = filepath.replace(options.directory, "").replace(/\\/g, "/").replace(/\/index.md$/, "").replace(/\.md$/, "");
  if (finalConfig.trimIndexFromPath) {
    transformedPath = trimIndexFromPath(transformedPath);
  }
  return slugify(transformedPath).split("/").filter((s) => !(s.startsWith("(") && s.endsWith(")"))).join("/") || "/";
}
async function parseMD(filepath) {
  const path4 = getPath(filepath);
  return {
    path: path4,
    content: mdParser.render(await fs2.readFile(filepath, "utf-8"))
  };
}
async function generateHtml(distDir, routeContent) {
  try {
    let htmlTemplate = await fs2.readFile(
      path.join(import.meta.dirname, "..", "index.html"),
      "utf-8"
    );
    const commentStart = htmlTemplate.indexOf("<!--");
    htmlTemplate = htmlTemplate.replace(
      htmlTemplate.slice(
        commentStart,
        htmlTemplate.indexOf("-->", commentStart) + 3
      ),
      ""
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
            cssFile
          )}" />
             <script type="module" src="${path.join(
            prefix,
            "assets",
            jsFile
          )}"></script>`
        );
      } else {
        Logger.error(`Could not find CSS and JS files in dist assets.`);
        htmlTemplate = htmlTemplate.replace("{{distAssets}}", "");
      }
    } else {
      htmlTemplate = htmlTemplate.replace("{{distAssets}}", "");
    }
    return htmlTemplate.replace("{{og}}", ogToHtml(finalConfig.og ?? {})).replace("{{title}}", finalConfig.rootTitle ?? "Serve My MD").replace("{{description}}", finalConfig.description ?? "").replace(
      "{{favicon}}",
      finalConfig.favicon ? `<link rel="icon" href="${finalConfig.favicon}" />` : ""
    ).replace(
      "{{fonts}}",
      finalConfig.fonts ? (finalConfig.fonts.title && finalConfig.fonts.title.url ? `<link rel="stylesheet" href="${finalConfig.fonts.title.url}" />` : "") + (finalConfig.fonts.body && finalConfig.fonts.body.url ? `<link rel="stylesheet" href="${finalConfig.fonts.body.url}" />` : "") + (finalConfig.fonts.mono && finalConfig.fonts.mono.url ? `<link rel="stylesheet" href="${finalConfig.fonts.mono.url}" />` : "") : ""
    ).replace("{{content}}", STATIC_TEMP_CONTENT_PREFIX + (routeContent ?? "")).trim();
  } catch (err) {
    throw new Error(`Failed to generate HTML: ${err}`);
  }
}
async function buildDistRoutesFromRouteTree(routeTree, groupedRoutes, distPath, prefix = "/") {
  for (const node of routeTree) {
    if (node.children && node.isGrouper) {
      await buildDistRoutesFromRouteTree(
        node.children,
        groupedRoutes,
        distPath,
        prefix
      );
    } else {
      const distRoutePath = path.join(distPath, prefix, node.pathSegment.replace("/", "")) + (node.pathSegment === "" ? "/index.html" : ".html");
      console.log("distRoutePath: ", distRoutePath);
      console.log("nodeChildren: ", node.children);
      await fs2.mkdir(path.dirname(distRoutePath), { recursive: true });
      const html = await generateHtml(
        distPath,
        groupedRoutes[prefix + node.pathSegment]?.[0]?.content
      );
      await fs2.writeFile(distRoutePath, html, "utf-8");
      if (node.children) {
        await buildDistRoutesFromRouteTree(
          node.children,
          groupedRoutes,
          distPath,
          path.join(prefix, node.pathSegment)
        );
      }
    }
  }
}

// cli/src/smm.config.json
var smm_config_default = {
  rootTitle: "Serve My MD",
  description: "A simple markdown to static site builder.",
  baseRoute: "/",
  defaultTheme: "dark",
  markdownItOptions: {
    html: true,
    xhtmlOut: true,
    breaks: true,
    langPrefix: "language-",
    linkify: true,
    typographer: false
  },
  favicon: "",
  logo: "",
  name: "Serve My MD",
  showNameWithLogo: true,
  sortRoutes: true,
  trimIndexFromPath: false
};

// cli/src/shared.ts
import MarkdownItFootNote from "markdown-it-footnote";
import MarkdownItTasks from "markdown-it-task-lists";
import loadLanguages from "prismjs/components/index.js";
var { shouldIgnore } = await parseSmmIgnore(
  path2.join(options.directory, config_default.defaultIgnorePath)
);
var finalConfig = {
  ...smm_config_default,
  ...await readConfig(path2.join(options.directory, config_default.defaultConfigPath))
};
var md = new MarkdownIt({
  ...finalConfig.markdownItOptions,
  highlight: function(str, lang) {
    if (!Object.hasOwn(Prism.languages, lang)) {
      loadLanguages([lang]);
    }
    const highlighted = Prism.highlight(str, Prism.languages[lang], lang);
    return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
  }
}).use(MarkdownItFootNote).use(MarkdownItTasks);
md.linkify.set({ fuzzyEmail: false });
var mdParser = md;

// cli/src/core/build.ts
import { cp, rm, writeFile } from "fs/promises";
import path3, { resolve } from "path";
import { fileURLToPath } from "url";
import { build as viteBuild } from "vite";
import { mkdirSync } from "fs";
var DIST_DIRNAME = "dist";
var WEB_DIRNAME = "web";
var PUBLIC_DIRNAME = "public";
async function build(options2) {
  const skipBuild = ("skipBuild" in options2 && options2.skipBuild) ?? false;
  const { routeTree, files: markdownFiles } = await getMarkdownFiles(
    options2.directory
  );
  const parsePromises = [];
  Logger.log("Processing routes...");
  for (const file of makeRoutesOfNestedPathsRaw(routeTree)) {
    parsePromises.push(parseMD(path3.join(options2.directory, file)));
  }
  cleanNestedPaths(routeTree);
  const groupedRoutes = Object.groupBy(
    await Promise.all(parsePromises),
    (route) => route.path
  );
  const routes = makeRoutesOfNestedPaths(routeTree).reduce(
    (acc, path4) => [...acc, ...groupedRoutes[path4] ?? []],
    []
  );
  const out = {
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
      mono: finalConfig.fonts?.mono?.name || "monospace"
    },
    ...optional("favicon", finalConfig.favicon),
    ...optional("version", finalConfig.version)
  };
  routes.forEach((o) => {
    Logger.log(o.path);
  });
  const __dirname = path3.dirname(fileURLToPath(import.meta.url));
  const webDir = path3.join(__dirname, "..", WEB_DIRNAME);
  const distDir = path3.join(webDir, DIST_DIRNAME);
  mkdirSync(path3.join(webDir, "src", ".generated"), { recursive: true });
  await writeFile(
    path3.join(webDir, "src", ".generated", "output.json"),
    JSON.stringify(out)
  );
  await writeFile(
    path3.join(webDir, "src", ".generated", "paths.json"),
    JSON.stringify(routeTree)
  );
  Logger.log("\nParsed MDs");
  await writeFile(path3.join(webDir, "index.html"), await generateHtml());
  Logger.log("Generated HTML from template");
  if (!skipBuild) {
    if (finalConfig.publicPath) {
      if (await FileOrDirectoryExists(
        path3.join(options2.directory, finalConfig.publicPath)
      )) {
        Logger.log(`Copying public assets from ${finalConfig.publicPath}...`);
        await cp(
          path3.join(options2.directory, finalConfig.publicPath),
          path3.join(webDir, PUBLIC_DIRNAME),
          { recursive: true }
        );
      } else {
        Logger.error(`Public path "${finalConfig.publicPath}" does not exist!`);
      }
    }
    Logger.log("Building the app...");
    await viteBuild({
      configFile: resolve(webDir, "vite.config.ts")
    });
    await buildDistRoutesFromRouteTree(routeTree, groupedRoutes, distDir);
    const targetDist = path3.join(options2.directory, DIST_DIRNAME);
    await rm(targetDist, { recursive: true }).catch(() => {
    });
    Logger.log("Built the app, copying results...");
    return cp(distDir, targetDist, { recursive: true }).then(() => {
      Logger.log("Done successfully!");
      return true;
    }).catch((err) => {
      Logger.error("Error copying files: " + err);
      return false;
    });
  }
  return Promise.resolve(true);
}

// cli/src/index.ts
if (await build(options)) {
  Logger.log("Completed successfully.");
} else {
  Logger.error("Failed.");
}
