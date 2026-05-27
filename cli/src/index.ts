import build from "./core/build.js";
import { options } from "./lib/commander.js";
import { logger } from "./lib/index.js";

if(await build(options)) {
  logger.log("Completed successfully.");
} else {
  logger.error("Failed.");
}
