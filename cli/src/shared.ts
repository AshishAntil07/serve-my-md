import MarkdownIt from "markdown-it";
import path from "path";
import Prism from "prismjs";
import { parseSmmIgnore, readConfig } from "./core/index.js";
import { options } from "./lib/commander.js";
import defaultSmmConfig from "@/smm.config.json" with { type: "json" };
import config from "@/config.json" with { type: "json" };
import type { SmmConfig } from "./types/index.js";
import MarkdownItFootNote from "markdown-it-footnote";
import MarkdownItTasks from "markdown-it-task-lists";
import loadLanguages from "prismjs/components/index.js";

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
    if (!Object.hasOwn(Prism.languages, lang)) {
      loadLanguages([lang]);
    }
    
    const highlighted = Prism.highlight(str, Prism.languages[lang], lang);
    return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
  },
})
  .use(MarkdownItFootNote)
  .use(MarkdownItTasks);

md.linkify.set({ fuzzyEmail: false });

export const mdParser = md;
