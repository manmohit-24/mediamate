import { pathToFileURL } from "node:url";
import { execute } from "../util/execute.js";

/** Set a custom folder icon (GNOME / gio). Isolated here so it is the only place to change for another desktop. */
export async function setFolderIcon(folderPath, iconPath) {
    await execute("gio", [
        "set",
        "-t",
        "string",
        folderPath,
        "metadata::custom-icon",
        pathToFileURL(iconPath).href,
    ]);
}
