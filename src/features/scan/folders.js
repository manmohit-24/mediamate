import fs from "node:fs/promises";
import path from "node:path";

export async function scanFolders(inputPath) {
  if (!inputPath) throw new Error("Path is required.");

  const stat = await fs.stat(inputPath);

  if (!stat.isDirectory()) {
    throw new Error("Path must be a directory.");
  }

  const folders = [];

  async function walkDirectory(directory) {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const fullPath = path.join(directory, entry.name);
      folders.push(fullPath);

      await walkDirectory(fullPath);
    }
  }

  await walkDirectory(inputPath);

  return folders;
}
