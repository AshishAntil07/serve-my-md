import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { describe, it, expect, beforeAll } from "vitest";
import { FileOrDirectoryExists } from "@/utils/index.js";
import getSnapshots from "./snapshots/get.js";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

const snapshots = getSnapshots();

export function runE2ETests(options: {
  name: string;
  fixtureDir: string;
}) {
  const { name, fixtureDir } = options;

  describe(`e2e: ${name}`, () => {
    it("matches output.json", () => {
      const expected = readFileSync(
        path.join(fixtureDir, ".expect", "output.json"),
        "utf-8"
      );
      const actual = snapshots[name].output;
      expect(actual).toBe(expected);
    });

    it("matches paths.json", () => {
      const expected = readFileSync(
        path.join(fixtureDir, ".expect", "paths.json"),
        "utf-8"
      );
      const actual = snapshots[name].paths;
      expect(actual).toBe(expected);
    });

    it("matches index.html", () => {
      const expected = readFileSync(
        path.join(fixtureDir, ".expect", "index.html"),
        "utf-8"
      );
      const actual = snapshots[name].html;
      expect(actual).toBe(expected);
    });

    it("produces a build", async () => {
      expect(
        await FileOrDirectoryExists(path.join(fixtureDir, "dist"))
      ).toBe(true);
    });
  });
}
