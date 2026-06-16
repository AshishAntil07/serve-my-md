import { exec, execSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixtures = path.join(__dirname, "..", "..", "fixtures", "md");
const SNAPSHOT_DIRECTORY = ".ss";
const WEB_DIR = path.join(__dirname, "..", "..", "..", "..", "web");

export default async function takeSnapshots() {
  const dirs = readdirSync(fixtures);

  execSync(
    [
      ...dirs.reduce(
        (acc, dir) => [
          ...acc,
          `pnpm start build -d ${path.join(fixtures, dir)} --skip-build`,
          `mkdir -p ${path.join(fixtures, dir, SNAPSHOT_DIRECTORY)}`,
          `cp ${path.join(WEB_DIR, "src", ".generated", "output.json")} ${path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "output.json")}`,
          `cp ${path.join(WEB_DIR, "src", ".generated", "paths.json")} ${path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "paths.json")}`,
          `cp ${path.join(WEB_DIR, "index.html")} ${path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "index.html")}`,
        ],
        [] as string[],
      ),
    ].join(" && "),
    process.env.DEBUG
      ? {
          stdio: "inherit",
        }
      : {},
  );
}
