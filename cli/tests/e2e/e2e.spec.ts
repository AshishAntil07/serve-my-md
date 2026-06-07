import path from "path";
import { __dirname, runE2ETests } from "./index.js";
import { readdirSync } from "fs";

const to_skip: string[] = [];

readdirSync(path.join(__dirname, "..", "fixtures", "md")).forEach(
  (TEST_NAME) =>
    !to_skip.includes(TEST_NAME) &&
    runE2ETests({
      name: TEST_NAME,
      fixtureDir: path.join(__dirname, "..", "fixtures", "md", TEST_NAME),
    }),
);
