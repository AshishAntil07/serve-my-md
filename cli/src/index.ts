import build from "./core/build.js";
import { options } from "./lib/commander.js";
import { logger } from "./lib/index.js";

if(await build(options)) {
  logger.log("Build completed successfully.");
} else {
  logger.error("Build failed.");
}
