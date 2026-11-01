import { execute } from "../util/execute.js";

const validId = (track) => Number.isFinite(track.id);

/** In-place edit with mkvpropedit (fast, no remux). */
export async function writeMkv(filePath, { metadata, cover }) {
    const args = [];

    if (metadata) {
        args.push("--edit", "info", "--set", `title=${metadata.title}`);
        if (metadata.date) args.push("--set", `date=${metadata.date}`);
        args.push("--tags", "all:");

        for (const track of [...metadata.audio, ...metadata.subtitles].filter(validId)) {
            args.push("--edit", `track:${track.id}`, "--set", `name=${track.name}`);
        }
    }

    if (cover) {
        args.push(
            "--delete-attachment",
            "mime-type:image/jpeg",
            "--delete-attachment",
            "mime-type:image/png",
            "--attachment-name",
            cover.filename,
            "--attachment-mime-type",
            cover.mime,
            "--add-attachment",
            cover.tempPath
        );
    }

    if (!args.length) return;

    try {
        await execute("mkvpropedit", [filePath, ...args]);
    } catch (error) {
        // Exit code 1 means "warnings only". Anything else (including a missing
        // mkvpropedit, whose code is a string) is a real failure.
        if (error.code !== 1) throw error;
    }
}
