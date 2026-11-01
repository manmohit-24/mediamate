import { mkdtemp, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeMkv } from "./mkv.js";
import { writeMp4 } from "./mp4.js";
import { imageExtension } from "../core/image.js";

const WRITERS = {
    ".mkv": (file, edit) => writeMkv(file, edit),
    ".mp4": (file, edit, stats) => writeMp4(file, edit, stats),
    ".m4v": (file, edit, stats) => writeMp4(file, edit, stats),
};

/**
 * Write tags and/or an embedded cover into a media file.
 *   metadata: { title, date, audio: [{id, language, name}], subtitles: [...] } | null
 *   cover:    { data: Buffer, mime } | null
 * The file's access/modification times are preserved; setting a release-date
 * timestamp is a separate step.
 */
export async function writeMedia(filePath, { metadata = null, cover = null } = {}) {
    if (!metadata && !cover) return;

    const writer = WRITERS[path.extname(filePath).toLowerCase()];
    if (!writer) throw new Error(`Unsupported file type: ${path.extname(filePath)}`);

    if (cover && cover.mime !== "image/jpeg" && cover.mime !== "image/png") {
        throw new Error(
            `Unsupported poster image type: ${cover.mime ?? "unknown"} (need JPEG or PNG)`
        );
    }

    const stats = await stat(filePath);
    let tempDir = null;
    let tempCover = null;

    try {
        if (cover) {
            tempDir = await mkdtemp(path.join(os.tmpdir(), "mediamate-"));
            const filename = `cover.${imageExtension(cover.mime)}`;
            const tempPath = path.join(tempDir, filename);
            await writeFile(tempPath, cover.data);
            tempCover = { tempPath, filename, mime: cover.mime };
        }

        await writer(filePath, { metadata, cover: tempCover }, stats);
    } finally {
        if (tempDir) await rm(tempDir, { recursive: true, force: true });
        await utimes(filePath, stats.atime, stats.mtime).catch(() => {});
    }
}
