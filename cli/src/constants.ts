import path from "path";
import { fileURLToPath } from "url";

export const DIST_DIRNAME = "dist";
export const WEB_DIRNAME = "web";
export const PUBLIC_DIRNAME = "public";
export const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const webDir = path.join(__dirname, "..", WEB_DIRNAME);
export const distDir = path.join(webDir, DIST_DIRNAME);
