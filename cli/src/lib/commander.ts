import * as inquirer from "@inquirer/prompts";
import config from "../config.json" with { type: "json" };
import { Command } from "commander";
import type { Args } from "@/types/index.js";
import path from "path";
import fs from "fs";

const program = new Command();

program
  .name(config.name)
  .description(config.description)
  .version(config.version);

program.option("-d, --directory <path>", "Directory to scan for markdown files", ".");
program.option("-i, --interactive", "Enable interactive mode");
if(process.env.VITEST) {
  program.option("--skip-build", "Skip the build step");
}

program.parse(process.argv);

export const options: Args = program.opts();

if (options.interactive || options.directory === undefined) {
  const res = await inquirer.input({
    message: `Enter root directory: `,
    default: options.directory || "./",
  });
  options.directory = res.trim();
}

options.directory = path.resolve(options.directory);
fs.existsSync(options.directory) || (() => { console.error("Directory does not exist: " + options.directory); process.exit(1); })();

export default program;
