import ask from "@/lib/inquire.js";
import {
  cleanNestedPaths,
  getMarkdownFiles,
  nestedPaths,
  parseMD,
  parseSmmIgnore,
} from "@/core/index.js";
import config from "@/config.json" with { type: "json" };
import { FileOrDirectoryExists } from "@/utils/index.js";
import { generateHtml } from "@/core/index.js";
import { options } from "@/lib/commander.js";
import type { Out, Route, SmmConfig } from "@/types/index.js";
import { writeFile } from "fs/promises";
import { logger } from "@/lib/index.js";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import MarkdownIt from "markdown-it";
import Prism from "prismjs";
import defaultSmmConfig from "@/smm.config.json" with { type: "json" };
import { readConfig } from "@/core/index.js";
import path from "path";
import MarkdownItFootNote from "markdown-it-footnote";
import MarkdownItTasks from "markdown-it-task-lists";

await ask();

export const { shouldIgnore } = await parseSmmIgnore(
  path.join(options.directory, config.defaultIgnorePath),
);

export const finalConfig: SmmConfig = {
  ...defaultSmmConfig,
  ...(await readConfig(path.join(options.directory, config.defaultConfigPath))),
};

const md = new MarkdownIt({
  ...finalConfig.markdownItOptions,
  highlight: function (str, lang): string {
    if (lang && Prism.languages[lang]) {
      const highlighted = Prism.highlight(str, Prism.languages[lang], lang);
      return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
    }

    return `<pre class="language-plaintext"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
})
  .use(MarkdownItFootNote)
  .use(MarkdownItTasks);

md.linkify.set({ fuzzyEmail: false });

export const mdParser = md;

const markdownFiles = await getMarkdownFiles(options.directory);
cleanNestedPaths();

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

await writeFile(path.join(webDir, "src", "output.json"), JSON.stringify(out));
await writeFile(
  path.join(webDir, "src", "paths.json"),
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
    execSync(
      `cp -r "${path.join(options.directory, finalConfig.publicPath)}/*" "${webDir}/public/"`,
    );
    logger.log("Copied public assets");
  } else {
    logger.error(`Public path "${finalConfig.publicPath}" does not exist!`);
  }
}

logger.log("Building the app...");
execSync("npm run build", { cwd: webDir });
logger.log("Built the app, copying results...");
execSync(`cp -r "${distDir}" "${options.directory}"`);
logger.log("Done successfully!");
