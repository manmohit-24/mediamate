import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { downloadPoster } from "../../providers/media/index.js";
import { renderFolderPosters } from "./folderPoster.js";
import { writeFile } from "node:fs/promises";
import { renameFolder } from "./rename.js";
import { prompt } from "../../shared/input/utils.js";
import { spinner } from "../../app/spinner.js";
import { exists } from "../../shared/exists.js";
import { logger } from "../../shared/logger.js";

const execFileAsync = promisify(execFile);

export async function updateTvSeasonFolder(
  folderPath,
  folderName,
  posterUrl,
  logoUrl,
) {
  const newFolderPath = await renameFolder(folderPath, folderName);
  const { iconPath } = await generatePosters(newFolderPath, posterUrl, logoUrl);

  await updateFolderIcon(newFolderPath, iconPath);

  return newFolderPath;
}

export async function updateFolderIcon(folderPath, iconPath) {
  await execFileAsync("gio", [
    "set",
    "-t",
    "string",
    folderPath,
    "metadata::custom-icon",
    pathToFileURL(iconPath).href,
  ]);
}

export async function manualUpdateFolder(folderPath) {
  let newFolderPath = folderPath;

  try {
    const name = await prompt("Enter a name for folder :");
    if (name) newFolderPath = await renameFolder(folderPath, name);
  } catch (error) {}

  spinner.step("Searching for .poster.png in folder");
  const posterPath = path.join(newFolderPath, ".poster.png");

  if (!(await exists(posterPath)))
    throw new Error("Poster image not found as '.poster.png'");

  logger.success("Poster Found");

  spinner.step("Searching for .logo.png in folder");
  const logoPath = path.join(newFolderPath, ".logo.png");

  if (!(await exists(logoPath)))
    logger.error(
      "Logo image not found as '.poster.png', processing without logo",
    );
  else logger.success("Logo Found");

  const iconPath = await renderFolderPosters(folderPath, posterPath, logoPath);
  logger.success("Folder icon generated as .icon.png");

  await updateFolderIcon(folderPath, iconPath);
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
