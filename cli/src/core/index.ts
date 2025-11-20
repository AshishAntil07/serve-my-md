import fs from "fs/promises";
import logger from "../lib/logger.js";
import type { IgnoreRule } from "../types/index.js";
import path from "path";
import { minimatch } from "minimatch";
import { finalConfig } from "../index.js";
import { ogToHtml } from "../utils/index.js";

export async function readConfig(filepath: string): Promise<object> {
  try {
    const data = JSON.parse(await fs.readFile(filepath, "utf-8"));

    return data;
  } catch (err) {
    // throw new Error(`Failed to read config file at ${filepath}: ${err}`);
    logger.log(
      `No config file found at ${filepath}, proceeding with defaults.`,
      "info"
    );
    return {};
  }
}

export async function parseSmmIgnore(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");

    const rules: IgnoreRule[] = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .map((line) => {
        const negated = line.startsWith("!");
        const pattern = negated ? line.slice(1) : line;

        return { pattern, negated };
      });

    function shouldIgnore(targetPath: string): boolean {
      const p = targetPath.replace(/\\/g, "/");

      let ignored = false;

      for (const rule of rules) {
        if (minimatch(p, rule.pattern, { dot: true })) {
          ignored = !rule.negated;
        }
      }

      return ignored;
    }

    return { rules, shouldIgnore };
  } catch (err) {
    logger.log(
      `No .smmignore file found at ${filePath}, proceeding without ignore rules.`,
      "info",
    );
    return {
      rules: [] as IgnoreRule[],
      shouldIgnore: (_: string) => false,
    };
  }
}

export async function generateHtml() {
  try {
    const htmlTemplate = await fs.readFile(path.join(import.meta.dirname, '..', '..', 'index.html'), 'utf-8');

    return htmlTemplate.replace("{{og}}", ogToHtml(finalConfig.og ?? {})).replace("{{title}}", finalConfig.rootTitle ?? "Serve My MD").replace("{{description}}", finalConfig.description ?? "").replace("{{favicon}}", finalConfig.favicon ?? "");
  } catch (err) {
    throw new Error(`Failed to generate HTML: ${err}`);
  }
}

