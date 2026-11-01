import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { SUPPORTED_EXTENSIONS, TEMP_MARKER } from "../core/constants.js";
import { UserError } from "../util/errors.js";

const isMedia = (name) =>
    SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()) && !name.includes(TEMP_MARKER);

const natural = (a, b) =>
    a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" });

async function statOrThrow(target) {
    try {
        return await stat(target);
    } catch (error) {
        if (error.code === "ENOENT") throw new UserError(`Path not found: ${target}`);
        throw error;
    }
}

export async function isDirectory(target) {
    return (await statOrThrow(target)).isDirectory();
}

const toFile = (filePath) => ({
    path: filePath,
    name: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
});

/** Media files at `target` (a file or a folder), naturally sorted. */
export async function scanMedia(target, recursive = false) {
    const root = path.resolve(target);
    const info = await statOrThrow(root);

    if (info.isFile()) {
        if (!isMedia(root)) throw new UserError(`Not a supported media file: ${root}`);
        return [toFile(root)];
    }

    const files = [];

    async function walk(dir) {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (recursive) await walk(full);
            } else if (entry.isFile() && isMedia(entry.name)) {
                files.push(toFile(full));
            }
        }
    }

    await walk(root);
    return files.sort(natural);
}

/** All folders below `target` (any depth). */
export async function listSubfolders(target) {
    const folders = [];

    async function walk(dir) {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const full = path.join(dir, entry.name);
            folders.push(full);
            await walk(full);
        }
    }

    await walk(target);
    return folders;
}
