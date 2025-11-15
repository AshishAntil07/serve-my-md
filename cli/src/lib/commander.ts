import config from "../config.json" with { type: "json" };
import { Command } from "commander";

const program = new Command();

program
  .name(config.name)
  .description(config.description)
  .version(config.version);

program.option("-d, --directory <path>", "Directory to scan for markdown files", ".");
program.option("-i, --interactive", "Enable interactive mode");


program.parse(process.argv);

export const options = program.opts();

export default program;