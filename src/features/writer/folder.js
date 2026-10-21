import path from "node:path";
import { rename } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { downloadPoster } from "../../providers/media/index.js";

const execFileAsync = promisify(execFile);

export async function updateTvSeasonFolder(folderPath, folderName, posterUrl) {
  folderPath = path.resolve(folderPath);

  const parentPath = path.dirname(folderPath);
  const newFolderPath = path.join(parentPath, folderName);
  const posterPath = path.join(newFolderPath, ".icon.jpg");

  // Rename the folder if necessary.
  if (folderPath !== newFolderPath) await rename(folderPath, newFolderPath);

  // Download the poster permanently into the folder.
  const poster = await downloadPoster(posterUrl);

  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(posterPath, poster.data),
  );

  // Apply the poster as the GNOME folder icon.
  await execFileAsync("gio", [
    "set",
    "-t",
    "string",
    newFolderPath,
    "metadata::custom-icon",
    pathToFileURL(posterPath).href,
  ]);

  return newFolderPath;
}
