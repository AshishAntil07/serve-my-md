import * as inquirer from "@inquirer/prompts";
import config from "../config.json" with { type: "json" };
import { Command } from "commander";
import type { Args } from "@/types/index.js";

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
console.log("vitest", process.env.VITEST);

program.parse(process.argv);

export const options: Args = program.opts();

if (options.interactive || options.directory === undefined) {
  const res = await inquirer.input({
    message: `Enter root directory: `,
    default: options.directory || "./",
  });
  options.directory = res.trim();
}

export default program;
