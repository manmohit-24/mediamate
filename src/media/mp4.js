import { chmod, rename, unlink } from "node:fs/promises";
import { execute } from "../util/execute.js";
import { ToolMissingError } from "../util/errors.js";
import { TEMP_MARKER } from "../core/constants.js";

// The cover is added as the second video stream (the first is the real video).
const COVER_STREAM = 1;

/** Remux with ffmpeg into a temp file, then replace the original. */
export async function writeMp4(filePath, { metadata, cover }, stats) {
    const temp = `${filePath}${TEMP_MARKER}mp4`;

    const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", filePath];
    if (cover) args.push("-i", cover.tempPath);

    args.push("-map", "0");
    if (cover) args.push("-map", "-0:v:disp:attached_pic", "-map", "1:0");
    args.push("-map_metadata", "0", "-c", "copy");

    if (metadata) {
        args.push("-metadata", `title=${metadata.title}`);
        if (metadata.date) args.push("-metadata", `date=${metadata.date}`);

        // MP4 keeps a track's name in handler_name; also set title for players that read it.
        // Languages are left as they are (MP4 needs 3-letter codes, mediainfo gives 2-letter).
        const named = (kind, tracks) =>
            tracks.forEach((track, i) =>
                args.push(
                    `-metadata:s:${kind}:${i}`,
                    `title=${track.name}`,
                    `-metadata:s:${kind}:${i}`,
                    `handler_name=${track.name}`
                )
            );
        named("a", metadata.audio);
        named("s", metadata.subtitles);
    }

    if (cover) {
        args.push(
            `-disposition:v:${COVER_STREAM}`,
            "attached_pic",
            `-metadata:s:v:${COVER_STREAM}`,
            "title=Cover"
        );
    }

    args.push("-f", "mp4", temp);

    try {
        await execute("ffmpeg", args);
        await chmod(temp, stats.mode);
        await rename(temp, filePath);
    } catch (error) {
        await unlink(temp).catch(() => {});
        if (error instanceof ToolMissingError) throw error;

        const detail = String(error.stderr ?? "")
            .trim()
            .split("\n")
            .at(-1);
        throw new Error(`ffmpeg failed${detail ? `: ${detail}` : ""}`);
    }
}
