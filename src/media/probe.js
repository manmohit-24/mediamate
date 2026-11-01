import { execute } from "../util/execute.js";

/** Read tracks and embedded title/cover with mediainfo. */
export async function probe(filePath) {
    const { stdout } = await execute("mediainfo", ["--Output=JSON", filePath]);
    const tracks = JSON.parse(stdout).media?.track ?? [];

    const ofType = (type) => tracks.filter((t) => t["@type"] === type);
    const general = ofType("General")[0];
    const cover = tracks.find((t) => t["@type"] === "Image" && t.Type === "Cover");

    const parseTrack = (t) => ({
        id: parseInt(t.ID, 10),
        language: t.Language,
        title: t.Title ?? null,
        default: t.Default === "Yes",
        forced: t.Forced === "Yes",
    });

    return {
        title: general?.Title ?? null,
        cover: cover ? { name: cover.Title } : null,
        audio: ofType("Audio").map(parseTrack),
        subtitles: ofType("Text").map(parseTrack),
    };
}
