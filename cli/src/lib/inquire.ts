import path from "path";
import { options } from "./commander.js";
import * as inquirer from "@inquirer/prompts";

export default async function() {
  if (options.interactive || options.directory === undefined) {
    const res = await inquirer.input({
      message: `Enter root directory: `,
      default: options.directory || "./",
    });
    options.directory = res.trim();
  }
}
