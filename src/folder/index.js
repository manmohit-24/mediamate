import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderFolderIcon } from "./artwork.js";
import { setFolderIcon } from "./icon.js";
import { renameFolder } from "../fsops/rename.js";
import { listSubfolders } from "../fsops/scan.js";
import { exists } from "../util/exists.js";
import { UserError } from "../util/errors.js";
import { log, progress } from "../ui/terminal.js";

/**
 * Rename a folder (optional), refresh its poster/logo art (optional) and set
 * its icon. Without `posterUrl` the existing `.poster.png` (and `.logo.png`)
 * in the folder are used. Returns the folder's final path.
 */
export async function applyFolder(
    ctx,
    folderPath,
    { name = null, posterUrl = null, logoUrl = null } = {}
) {
    let folder = path.resolve(folderPath);

    if (name) {
        progress.update("Renaming folder");
        folder = await renameFolder(folder, name);
    }

    const posterPath = path.join(folder, ".poster.png");
    const logoPath = path.join(folder, ".logo.png");

    if (posterUrl) {
        progress.update("Downloading artwork");
        await writeFile(posterPath, (await ctx.downloadImage(posterUrl)).data);

        if (logoUrl) await writeFile(logoPath, (await ctx.downloadImage(logoUrl)).data);
        else await unlink(logoPath).catch(() => {}); // do not reuse a stale logo
    }

    if (!(await exists(posterPath))) throw new UserError("Poster image not found as '.poster.png'");

    progress.update("Generating icon");
    const iconPath = await renderFolderIcon({
        poster: posterPath,
        logo: (await exists(logoPath)) ? logoPath : null,
        output: path.join(folder, ".icon.png"),
    });

    progress.update("Updating folder icon");
    await setFolderIcon(folder, iconPath);
    await refreshChildIcons(folder);

    return folder;
}

// Renaming a folder breaks the icon link of folders inside it; set them again.
async function refreshChildIcons(folder) {
    for (const child of await listSubfolders(folder)) {
        const iconPath = path.join(child, ".icon.png");
        if (!(await exists(iconPath))) continue;

        try {
            await setFolderIcon(child, iconPath);
        } catch (error) {
            log.warn(`Could not refresh icon of ${path.basename(child)}: ${error.message}`);
        }
    }
}
