import fs from "fs/promises";

export async function getMarkdownFiles(baseUrl: string) {
  const files = await fs.readdir(baseUrl);
  console.log(files);
  return files.filter((file) => file.endsWith(".md"));
}