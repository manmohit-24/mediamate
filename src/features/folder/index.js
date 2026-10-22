import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderFolderPosters, generatePosters } from "./folderPoster.js";
import { renameFolder } from "./rename.js";
import { prompt } from "../../shared/input/utils.js";
import { spinner } from "../../app/spinner.js";
import { exists } from "../../shared/exists.js";
import { logger } from "../../shared/logger.js";
import { scanFolders } from "../scan/folders.js";
import { execute } from "../../shared/execute.js";

export async function updateTvSeasonFolder(
  folderPath,
  folderName,
  posterUrl,
  logoUrl,
) {
  const newFolderPath = await renameFolder(folderPath, folderName);
  const { iconPath } = await generatePosters(newFolderPath, posterUrl, logoUrl);

  await updateFolderIcon(newFolderPath, iconPath);

  await cleanChildFolders(newFolderPath);

  return newFolderPath;
}

export async function manualUpdateFolder(folderPath) {
  let newFolderPath = folderPath;

  // Renaming
  try {
    const name = await prompt("Enter a name for folder :");
    if (name.trim()) newFolderPath = await renameFolder(folderPath, name);
  } catch (error) {
    if (error.message === "File Skipped") logger.info("Renaming Skipped");
    else logger.error(`Error renaming folder : ${error.message}`);
  }

  // Checking Poster
  spinner.step("Searching for .poster.png in folder");
  const posterPath = path.join(newFolderPath, ".poster.png");

  if (!(await exists(posterPath)))
    throw new Error("Poster image not found as '.poster.png'");

  logger.success("Poster Found");

  // Checking Logo
  spinner.step("Searching for .logo.png in folder");
  let logoPath = path.join(newFolderPath, ".logo.png");

  if (!(await exists(logoPath))) {
    logger.error(
      "Logo image not found as '.logo.png', processing without logo",
    );
    logoPath = null;
  } else logger.success("Logo Found");

  // Creating icon
  spinner.step("Generating icon");

  const iconPath = await renderFolderPosters(
    newFolderPath,
    posterPath,
    logoPath,
  );
  logger.success("Folder icon generated as .icon.png");

  await updateFolderIcon(newFolderPath, iconPath);

  await cleanChildFolders(newFolderPath);

  return newFolderPath;
}

async function updateFolderIcon(folderPath, iconPath) {
  spinner.step("Updating folder icon");

  await execute("gio", [
    "set",
    "-t",
    "string",
    folderPath,
    "metadata::custom-icon",
    pathToFileURL(iconPath).href,
  ]);
}

async function cleanChildFolders(folderPath) {
  // since we renamed a folder, its child folders might had lost their poster-folder link
  // fix child folders' icons
  spinner.step("Clenuing up...");
  const folders = await scanFolders(folderPath);

  for (const f of folders) {
    const p = path.resolve(f);
    const iconPath = path.join(p, ".icon.png");

    if (await exists(iconPath)) updateFolderIcon(p, iconPath);
  }
}
