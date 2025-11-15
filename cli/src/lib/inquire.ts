import { options } from "./commander.js";
import * as inquirer from "@inquirer/prompts";

if(options.interactive) {
  const res = await inquirer.input({
    message: `Enter root directory: `,
    default: options.directory || './'
  })
  options.directory = res.trim();
}