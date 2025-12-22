import path from "path";
import { __dirname, runE2ETests } from "./index.js";
import { readdirSync } from "fs";

readdirSync(path.join(__dirname, "..", "fixtures", "md")).forEach((TEST_NAME) =>
  runE2ETests({
    name: TEST_NAME,
    fixtureDir: path.join(__dirname, "..", "fixtures", "md", TEST_NAME),
  }),
);
