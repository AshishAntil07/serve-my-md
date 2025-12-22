import fs from "fs/promises";
import type { OpenGraph } from "@/types/og.js";

const indexTokens = "1234567890.";

export function trimIndexFromPath(filePath: string): string {
  let offset = filePath.lastIndexOf("/") + 1;
  let encountered = false;
  while (
    offset < filePath.length &&
    (indexTokens.includes(filePath[offset]!) ||
      (filePath[offset] === " " && !encountered))
  )
    if (filePath[offset++] !== " ") encountered = true;

  return (
    filePath.slice(0, filePath.lastIndexOf("/") + 1) +
    filePath.slice(offset).trim()
  );
}

export function cleanName(filename: string): string {
  return filename === "index.md" ? "" : filename.replace(/\.md$/, "");
}

export function slugify(filepath: string) {
  return filepath
    .toLowerCase()
    .split("")
    .map((c) => {
      if ('./,;"\'\\:<>`?!'.includes(c)) return "";
      if (c === " " || c === "_") return "-";
      return c;
    })
    .join("");
}

export async function FileOrDirectoryExists(
  filepath: string,
): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

export function ogToHtml(og: OpenGraph): string {
  const tags: string[] = [];

  for (const [key, value] of Object.entries(og)) {
    if (value == null) continue;
    if (["images", "videos", "audios"].includes(key)) continue;
    if (Array.isArray(value)) {
      // Only used for "locale:alternate"
      for (const v of value) {
        tags.push(`<meta property="og:${key}" content="${v}">`);
      }
    } else {
      tags.push(`<meta property="og:${key}" content="${value}">`);
    }
  }

  [...(og.images ?? []), ...(og.videos ?? []), ...(og.audios ?? [])].forEach(
    (img) => {
      Object.entries(img).forEach(([k, v]) => {
        if (v == null) return;
        tags.push(`<meta property="og:${k}" content="${v}">`);
      });
    },
  );

  return tags.join("\n");
}
