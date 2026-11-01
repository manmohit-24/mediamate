const INVALID_FILENAME = /[<>:"/\\|?*\x00-\x1F]/g;

export const pad2 = (n) => String(n).padStart(2, "0");

export const episodeTag = (season, episode) => `S${pad2(season)}E${pad2(episode)}`;

/** Make text safe for a file name (colons are dropped, as before). */
export function sanitizeFileName(text) {
    return text.replace(INVALID_FILENAME, "").replace(/\s+/g, " ").trim();
}

/** Make text safe for a folder name (colons become " -"). */
export function sanitizeFolderName(text) {
    return text
        .replace(/:/g, " -")
        .replace(/[<>"/\\|?*\x00-\x1F]/g, "")
        .trim()
        .replace(/[. ]+$/, "");
}

/** "Interstellar (2014)" */
export function movieFileName({ title, year }) {
    return `${sanitizeFileName(title)}${year ? ` (${year})` : ""}`;
}

/** "Breaking Bad - S01E03 - ...And the Bag's in the River" */
export function episodeFileName({ series, season, episode, title }) {
    return `${sanitizeFileName(series)} - ${episodeTag(season, episode)} - ${sanitizeFileName(title)}`;
}

/** Title stored inside the file (not sanitized). */
export function episodeDisplayTitle({ series, season, episode, title }) {
    return `${series} - ${episodeTag(season, episode)} - ${title}`;
}
