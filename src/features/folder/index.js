import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { downloadPoster } from "../../providers/media/index.js";
import { renderFolderPosters } from "./folderPoster.js";
import { writeFile } from "node:fs/promises";
import { renameFolder } from "./rename.js";

const execFileAsync = promisify(execFile);

export async function updateTvSeasonFolder(
  folderPath,
  folderName,
  posterUrl,
  logoUrl,
) {
  const newFolderPath = await renameFolder(folderPath, folderName);
  const { iconPath } = await generatePosters(newFolderPath, posterUrl, logoUrl);

  // Apply the poster as the GNOME folder icon.
  await execFileAsync("gio", [
    "set",
    "-t",
    "string",
    newFolderPath,
    "metadata::custom-icon",
    pathToFileURL(iconPath).href,
  ]);

  return newFolderPath;
}

export async function generatePosters(folderPath, posterUrl, logoUrl) {
  const posterPath = path.join(folderPath, ".poster.png");
  const poster = await downloadPoster(posterUrl);

  await writeFile(posterPath, poster.data);

  let logoPath = null;

  if (logoUrl) {
    logoPath = path.join(folderPath, ".logo.png");
    const logo = await downloadPoster(logoUrl);
    writeFile(logoPath, logo.data);
  }

  const iconPath = await renderFolderPosters(folderPath, posterPath, logoPath);

  return { posterPath, logoPath, iconPath };
}
