import fs from "node:fs/promises";
import path from "node:path";

import { SUPPORTED_EXTENSIONS } from "../../app/constants.js";

function isSupportedMedia(extension) {
  return SUPPORTED_EXTENSIONS.has(extension.toLowerCase());
}

export async function scanFiles(inputPath, recursive) {
  if (!inputPath) throw new Error("Path is required.");

  const files = [];
  const stat = await fs.stat(inputPath);

  if (stat.isFile()) {
    const extension = path.extname(inputPath);

    if (!isSupportedMedia(extension))
      throw new Error("Not a supported media file.");

    files.push({
      path: inputPath,
      name: path.basename(inputPath),
      extension,
    });

    return files;
  }

  if (stat.isDirectory()) {
    await walkDirectory(inputPath, files, recursive);
    return files;
  }

  throw new Error("Invalid path.");
}

async function walkDirectory(directory, files, recursive) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (recursive && entry.isDirectory()) {
      await walkDirectory(fullPath, files, true);
      continue;
    }

    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name);
    if (!isSupportedMedia(extension)) continue;

    files.push({
      path: fullPath,
      name: entry.name,
      extension,
    });
  }
}
