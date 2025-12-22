import { execSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixtures = path.join(__dirname, "..", "..", "fixtures", "md");
const SNAPSHOT_DIRECTORY = ".ss";

export default function takeSnapshots() {
  readdirSync(fixtures).forEach((dir) => {
    execSync(
      [
        `yarn start -d ${path.join(fixtures, dir)}`,
        `mkdir -p ${path.join(fixtures, dir, SNAPSHOT_DIRECTORY)}`,
        `cp ${path.join(__dirname, "..", "..", "..", "..", "web", "src", "output.json")} ${path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "output.json")}`,
        `cp ${path.join(__dirname, "..", "..", "..", "..", "web", "src", "paths.json")} ${path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "paths.json")}`,
        `cp ${path.join(__dirname, "..", "..", "..", "..", "web", "index.html")} ${path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "index.html")}`,
      ].join(" && "),
      process.env.DEBUG
        ? {
            stdio: "inherit",
          }
        : undefined,
    );
  });
}
