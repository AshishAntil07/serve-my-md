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
  let offset = filePath.lastIndexOf("/") + 1;
  let encountered = false;
  while (offset < filePath.length && (indexTokens.includes(filePath[offset]) || filePath[offset] === " " && !encountered))
    if (filePath[offset++] !== " ") encountered = true;
  return filePath.slice(0, filePath.lastIndexOf("/") + 1) + filePath.slice(offset).trim();
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
  return nestedPaths.reduce((acc, [path4, children]) => {
    const isGrouper = path4.startsWith("(") && path4.endsWith(")");
    const slugified = slugify(path4);
    return [
      ...acc,
      ...isGrouper || !children ? [] : [prefix + slugified],
      ...children ? makeRoutesOfNestedPaths(
        children,
        prefix + (!isGrouper ? slugified + "/" : "")
      ) : isGrouper ? [] : [prefix + slugified]
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
  const nestedPaths = pairChildren || [];
  const promises = [];
  for (const file of files) {
    const filePath = path.join(baseUrl, file.name);
    if (shouldIgnore(filePath.slice(options.directory.length)) || filePath.slice(options.directory.length) === finalConfig.publicPath)
      continue;
    if (file.isDirectory()) {
      const dirPair = [cleanName(file.name), []];
      nestedPaths.push(dirPair);
      promises.push(
        getMarkdownFiles(filePath, dirPair[1])
      );
    } else if (file.name.endsWith(".md")) {
      nestedPaths.push([cleanName(file.name), null]);
      promises.push(Promise.resolve([filePath]));
    }
  }
  if (finalConfig.sortRoutes)
    nestedPaths.sort((a, b) => {
      const awrapper = a[0].startsWith("(") && a[0].endsWith(")");
      const bwrapper = b[0].startsWith("(") && b[0].endsWith(")");
      if (awrapper && !bwrapper) return 1;
      if (bwrapper && !awrapper) return -1;
      return a[0].localeCompare(b[0]);
    });
  const filess = finalConfig.trimIndexFromPath ? (await Promise.all(promises)).flat().map((val) => trimIndexFromPath(val)) : (await Promise.all(promises)).flat();
  return pairChildren ? filess : { nestedPaths, files: filess };
}
function cleanNestedPaths(nestedPaths) {
  for (const pair of nestedPaths) {
    if (finalConfig.trimIndexFromPath) {
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
function getPath(filepath) {
  const transformedPath = filepath.replace(options.directory, "").replace(/\\/g, "/").replace(/\/index.md$/, "").replace(/\.md$/, "");
  return slugify(transformedPath).split("/").filter((s) => !(s.startsWith("(") && s.endsWith(")"))).join("/") || "/";
}
async function parseMD(filepath) {
  const path4 = getPath(filepath);
  return {
    path: path4,
    content: mdParser.render(await fs2.readFile(filepath, "utf-8"))
  };
}
async function generateHtml() {
  try {
    const htmlTemplate = await fs2.readFile(
      path.join(import.meta.dirname, "..", "index.html"),
      "utf-8"
    );
    return htmlTemplate.replace("{{og}}", ogToHtml(finalConfig.og ?? {})).replace("{{title}}", finalConfig.rootTitle ?? "Serve My MD").replace("{{description}}", finalConfig.description ?? "").replace("{{favicon}}", finalConfig.favicon ?? "").replace(
      "{{fonts}}",
      finalConfig.fonts ? (finalConfig.fonts.title && finalConfig.fonts.title.url ? `<link rel="stylesheet" href="${finalConfig.fonts.title.url}" />` : "") + (finalConfig.fonts.body && finalConfig.fonts.body.url ? `<link rel="stylesheet" href="${finalConfig.fonts.body.url}" />` : "") + (finalConfig.fonts.mono && finalConfig.fonts.mono.url ? `<link rel="stylesheet" href="${finalConfig.fonts.mono.url}" />` : "") : ""
    );
  } catch (err) {
    throw new Error(`Failed to generate HTML: ${err}`);
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
    if (lang && Prism.languages[lang]) {
      const highlighted = Prism.highlight(str, Prism.languages[lang], lang);
      return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
    }
    return `<pre class="language-plaintext"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
}).use(MarkdownItFootNote).use(MarkdownItTasks);
md.linkify.set({ fuzzyEmail: false });
var mdParser = md;

// cli/src/core/build.ts
import { cp, writeFile } from "fs/promises";
import path3, { resolve } from "path";
import { fileURLToPath } from "url";
import { build as viteBuild } from "vite";
import { mkdirSync } from "fs";
async function build(options2) {
  const skipBuild = ("skipBuild" in options2 && options2.skipBuild) ?? false;
  const { nestedPaths, files: markdownFiles } = await getMarkdownFiles(
    options2.directory
  );
  cleanNestedPaths(nestedPaths);
  const parsePromises = [];
  Logger.log("Processing routes...");
  for (const file of markdownFiles) {
    parsePromises.push(parseMD(file));
  }
  const groupedRoutes = Object.groupBy(
    await Promise.all(parsePromises),
    (route) => route.path
  );
  const routes = makeRoutesOfNestedPaths(nestedPaths).reduce(
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
  const webDir = path3.join(__dirname, "..", "web");
  const distDir = path3.join(webDir, "dist");
  mkdirSync(path3.join(webDir, "src", ".generated"), { recursive: true });
  await writeFile(
    path3.join(webDir, "src", ".generated", "output.json"),
    JSON.stringify(out)
  );
  await writeFile(
    path3.join(webDir, "src", ".generated", "paths.json"),
    JSON.stringify(nestedPaths)
  );
  Logger.log("\nParsed MDs");
  await writeFile(path3.join(webDir, "index.html"), await generateHtml());
  Logger.log("Generated HTML from template");
  if (finalConfig.publicPath) {
    if (await FileOrDirectoryExists(
      path3.join(options2.directory, finalConfig.publicPath)
    )) {
      Logger.log(`Copying public assets from ${finalConfig.publicPath}...`);
      await cp(
        path3.join(options2.directory, finalConfig.publicPath),
        path3.join(webDir, "public"),
        { recursive: true }
      );
    } else {
      Logger.error(`Public path "${finalConfig.publicPath}" does not exist!`);
    }
  }
  if (!skipBuild) {
    Logger.log("Building the app...");
    await viteBuild({
      configFile: resolve(webDir, "vite.config.ts")
    });
    Logger.log("Built the app, copying results...");
    return cp(distDir, options2.directory).then(() => {
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
