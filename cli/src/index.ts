import * as inquirer from "@inquirer/prompts";
import config from "./config.json" with { type: "json" };
import { Command } from "commander";
import { type SharedState } from "@/types/index.js";
import path from "path";
import fs from "fs";
import commands from "./lib/commands.js";
import { logger } from "./lib/index.js";
import MarkdownIt from "markdown-it";
import Prism from "prismjs";
import defaultSmmConfig from "@/smm.config.json" with { type: "json" };
import type { CommandState, SmmConfig } from "./types/index.js";
import MarkdownItFootNote from "markdown-it-footnote";
import MarkdownItTasks from "markdown-it-task-lists";
import loadLanguages from "prismjs/components/index.js";
import { appState } from "./lib/context.js";
import { parseSmmIgnore, readConfig } from "./core/config.js";

const partialState = await new Promise<CommandState>(async (resolve) => {
  const program = new Command();

  program
    .name(config.name)
    .description(config.description)
    .version(config.version);

  const buildCommand = program.command("build");
  
  buildCommand
    .option(
      "-d, --directory <path>",
      "Directory to scan for markdown files",
      ".",
    )
    .option("-i, --interactive", "Enable interactive mode")
    .description("Build the site from markdown files")
    .action(async (options) => {
      await makeOptions(options);

      resolve({
        command: "build",
        handler: commands.build,
        options,
      });
    });

  program
    .command("dev")
    .option(
      "-p, --port <port>",
      "Port to run the development server on",
      "3000",
    )
    .option(
      "-d, --directory <path>",
      "Directory to scan for markdown files",
      ".",
    )
    .description("Start the development server")
    .action(async (options) => {
      await makeOptions(options);

      resolve({
        command: "dev",
        handler: commands.dev,
        options,
      });
    });

  async function makeOptions(options: any) {
    if (options.interactive || options.directory === undefined) {
      const res = await inquirer.input({
        message: `Enter root directory: `,
        default: options.directory || "./",
      });
      options.directory = res.trim();
    }

    options.directory = path.resolve(options.directory);
    fs.existsSync(options.directory) ||
      (() => {
        console.error("Directory does not exist: " + options.directory);
        process.exit(1);
      })();
  }

  program.parseAsync(process.argv);
});

const { shouldIgnore } = await parseSmmIgnore(
  path.join(partialState.options.directory, config.defaultIgnorePath),
);

const finalConfig: SmmConfig = {
  ...defaultSmmConfig,
  ...(await readConfig(path.join(partialState.options.directory, config.defaultConfigPath))),
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

if (finalConfig.publicPath)
  finalConfig.publicPath = path.resolve(partialState.options.directory, finalConfig.publicPath);

const state: SharedState = {
  ...partialState,
  finalConfig,
  mdParser: md,
  shouldIgnore,
};

appState.setState(state);

state.handler().catch((err) => {
  logger.error("Error executing command: " + JSON.stringify(err));
  process.exit(1);
});
