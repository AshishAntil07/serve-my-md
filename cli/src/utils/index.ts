import fs from "fs/promises";
import path from "path";
import { mdParser } from "../lib/index.js";
import { options } from "../lib/commander.js";

export async function getMarkdownFiles(baseUrl: string): Promise<string[]> {
  const files = await fs.readdir(baseUrl, { withFileTypes: true });
  
  const promises = [];
  for (const file of files) {
    const filePath = path.join(baseUrl, file.name);
    if (file.isDirectory()) {
      promises.push(getMarkdownFiles(filePath));
    } else if (file.name.endsWith(".md")) {
      promises.push(Promise.resolve([filePath]));
    }
  }

  const results = await Promise.all(promises);
  return results.flat();
}

export function getPath(filepath: string): string {
  return (options.directory.endsWith("/")?"/":"") + filepath.replace(options.directory, "").replace(/\\/g, "/").replace(/\.md$/, "").replace(/\/index$/, "").replace(/index$/, "");
}

export async function parseMD(filepath: string): Promise<{path: string, content: string}> {
  const path = getPath(filepath);
  return {path, content: mdParser.render(await fs.readFile(filepath, "utf-8"))};
}

export async function readConfig(filepath: string): Promise<object> {
  try {
    const data = JSON.parse(await fs.readFile(filepath, "utf-8"));

    return data;
  } catch(err) {
    // throw new Error(`Failed to read config file at ${filepath}: ${err}`);
    return {};
  }
}