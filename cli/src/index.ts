import { getMarkdownFiles, parseMD } from "./utils/index.js";
import { options } from "./lib/commander.js";
import type { Out } from "./types/index.js";
import { writeFile } from "fs/promises";
import { logger } from "./lib/index.js";
import "./lib/inquire.js";
import { execSync } from "child_process";
import { fileURLToPath } from 'url';
import path from 'path';

const markdownFiles = await getMarkdownFiles(options.directory);

const parsePromises: Promise<Out>[] = [];
logger.log("Processing routes...");
for(const file of markdownFiles) {
  parsePromises.push(parseMD(file));
}

const out = await Promise.all(parsePromises);
out.forEach(o => {
  logger.log(o.path);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const webDir = path.join(__dirname, '..', '..', 'web');
const distDir = path.join(webDir, 'dist');

await writeFile(path.join(webDir, 'src', 'output.json'), JSON.stringify(out));
logger.log("\nParsed MDs, building the app...");

execSync('npm run build', { cwd: webDir });
logger.log("Built the app, copying results...");
execSync(`cp -r "${distDir}" "${options.directory}"`);
logger.log("Done successfully!");

