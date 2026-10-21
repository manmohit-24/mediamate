import path from "node:path";
import { rename } from "node:fs/promises";
import { exists } from "../../shared/exists.js";
import { spinner } from "../../app/spinner.js";

export async function renameFolder(folderPath, folderName) {
  spinner.step("Renaming folder");

  const currentPath = path.resolve(folderPath);
  const parentDir = path.dirname(currentPath);

  const safeName = sanitizeFolderName(folderName);
  if (!safeName) throw new Error("Folder name is empty after sanitization.");

  folderName = safeName;
  let destination = path.join(parentDir, folderName);
  let index = 1;

  while (await exists(destination)) {
    if (path.resolve(destination) === currentPath) return destination;

    folderName = `${safeName} (${index})`;
    destination = path.join(parentDir, folderName);
    index++;
  }

  // Nothing to rename if the sanitized name is unchanged.
  if (destination === currentPath) return destination;

  await rename(currentPath, destination);

  return destination;
}

function sanitizeFolderName(name) {
  return name
    .replace(/:/g, " -")
    .replace(/[<>"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .replace(/[. ]+$/, "");
}
