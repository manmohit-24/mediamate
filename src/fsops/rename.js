import { rename } from "node:fs/promises";
import path from "node:path";
import { exists } from "../util/exists.js";
import { sanitizeFolderName } from "../core/naming.js";
import { UserError } from "../util/errors.js";

/**
 * First free name for `base`+`ext` in `dir`: "Name.mkv", "Name (1).mkv", "Name (2).mkv"...
 * If the current file already has the name we would pick, that name is returned
 * (so re-running never shuffles suffixes).
 */
export async function freeName(dir, base, ext, currentPath) {
    for (let n = 0; ; n++) {
        const name = n === 0 ? `${base}${ext}` : `${base} (${n})${ext}`;
        const candidate = path.join(dir, name);

        if (path.resolve(candidate) === path.resolve(currentPath)) return name;
        if (!(await exists(candidate))) return name;
    }
}

/** Rename a file to `base` (extension kept). Returns the new path. */
export async function renameFile(filePath, base) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = await freeName(dir, base, ext, filePath);
    const destination = path.join(dir, name);

    if (path.resolve(destination) !== path.resolve(filePath)) await rename(filePath, destination);
    return destination;
}

/** Rename a folder. Returns the new path. */
export async function renameFolder(folderPath, name) {
    const resolved = path.resolve(folderPath);
    const clean = sanitizeFolderName(name);
    if (!clean) throw new UserError(`Invalid folder name: "${name}"`);

    const dir = path.dirname(resolved);
    const unique = await freeName(dir, clean, "", resolved);
    const destination = path.join(dir, unique);

    if (destination !== resolved) await rename(resolved, destination);
    return destination;
}
