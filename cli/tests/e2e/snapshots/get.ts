import { readdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixtures = path.join(__dirname, "..", "..", "fixtures", "md");
const SNAPSHOT_DIRECTORY = ".ss";

export default function getSnapshots(): {
  [key: string]: {
    output: string;
    paths: string;
    html: string;
  };
} {
  return Object.fromEntries(
    readdirSync(fixtures).map((dir) => [
      dir,
      {
        output: readFileSync(path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "output.json"), "utf-8"),
        paths: readFileSync(path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "paths.json"), "utf-8"),
        html: readFileSync(path.join(fixtures, dir, SNAPSHOT_DIRECTORY, "index.html"), "utf-8"),
      },
    ]),
  );
}
