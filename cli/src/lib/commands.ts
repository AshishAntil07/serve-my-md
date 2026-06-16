import build from "@/core/build.js";
import { logger } from "./index.js";

const commands = {
  async build() {
    if (await build()) {
      logger.log("Completed successfully.");
    } else {
      logger.error("Failed.");
    }
  },
  async dev() {
    //todo
  },
};

export default commands;
