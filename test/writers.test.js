import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat, utimes, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { writeMedia } from "../src/media/index.js";

const has = (cmd) => {
    try {
        execFileSync("which", [cmd], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
};

// 1x1 red PNG
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
);

test(
    "mp4: writes title, track names and cover; keeps mtime; leaves no temp file",
    { skip: !has("ffmpeg") },
    async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), "mm-mp4-"));
        try {
            const file = path.join(dir, "clip.mp4");
            execFileSync("ffmpeg", [
                "-v",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=black:s=64x64:d=1",
                "-f",
                "lavfi",
                "-i",
                "sine=d=1",
                "-shortest",
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                file,
            ]);
            const old = new Date("2015-05-05T00:00:00Z");
            await utimes(file, old, old);

            await writeMedia(file, {
                metadata: {
                    title: "Test Movie",
                    date: "2014-11-05",
                    audio: [{ language: "en", name: "English" }],
                    subtitles: [],
                },
                cover: { data: PNG, mime: "image/png" },
            });

            const probe = JSON.parse(
                execFileSync("ffprobe", [
                    "-v",
                    "error",
                    "-show_format",
                    "-show_streams",
                    "-of",
                    "json",
                    file,
                ]).toString()
            );
            assert.equal(probe.format.tags.title, "Test Movie");
            assert.ok(
                probe.streams.some((s) => s.disposition?.attached_pic === 1),
                "cover stream present"
            );
            assert.equal(
                probe.streams.find((s) => s.codec_type === "audio").tags.handler_name,
                "English"
            );
            assert.equal((await stat(file)).mtime.toISOString(), old.toISOString());
            assert.deepEqual(await readdir(dir), ["clip.mp4"]);

            // Cover-only on a file that already has a cover keeps the title.
            await writeMedia(file, { cover: { data: PNG, mime: "image/png" } });
            const again = JSON.parse(
                execFileSync("ffprobe", [
                    "-v",
                    "error",
                    "-show_format",
                    "-of",
                    "json",
                    file,
                ]).toString()
            );
            assert.equal(again.format.tags.title, "Test Movie");
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    }
);

test("unsupported cover type and file type are rejected before touching the file", async () => {
    await assert.rejects(
        () =>
            writeMedia("/nope/x.mkv", {
                cover: { data: Buffer.from("GIF89a"), mime: null },
            }),
        /Unsupported poster/
    );
    await assert.rejects(
        () =>
            writeMedia("/nope/x.avi", {
                cover: { data: PNG, mime: "image/png" },
            }),
        /Unsupported file type/
    );
});
