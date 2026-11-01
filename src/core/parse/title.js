import path from "node:path";
import { SUPPORTED_EXTENSIONS } from "../constants.js";

// Tokens that mark the start of release info ("Movie 1080p BluRay x264-GRP").
const HARD_WORDS = new Set([
    "bluray",
    "blu-ray",
    "brrip",
    "bdrip",
    "bdremux",
    "remux",
    "webdl",
    "web-dl",
    "webrip",
    "web-rip",
    "hdrip",
    "dvdrip",
    "hdtv",
    "hdcam",
    "camrip",
    "dvdscr",
    "hdts",
    "uhd",
    "amzn",
    "dsnp",
    "hmax",
    "atvp",
    "hevc",
    "avc",
    "av1",
    "xvid",
    "divx",
    "dts",
    "dtshd",
    "truehd",
    "atmos",
    "flac",
    "mp3",
]);

const HARD_PATTERNS = [
    /^(?:2160|1440|1080|720|576|480)[pi]$/,
    /^[hx]\.?26[45]$/,
    /^(?:8|10|12)bit$/,
    /^dd(?:p|\+)?\d*$/,
    /^(?:e?ac3|aac)\d*$/,
    /^hdr\d*\+?$/,
];

// Ambiguous words: only release info when followed by more release info (or last).
const SOFT_WORDS = new Set([
    "proper",
    "repack",
    "remastered",
    "extended",
    "criterion",
    "uncut",
    "imax",
    "unrated",
    "theatrical",
]);

const bare = (token) => token.replace(/^[[(]+|[\])]+$/g, "").toLowerCase();

function isHard(token) {
    const word = bare(token);
    if (!word) return false;

    // "x264-GROUP" -> also test the part before the first hyphen.
    return [word, word.split("-")[0]].some(
        (w) => HARD_WORDS.has(w) || HARD_PATTERNS.some((p) => p.test(w))
    );
}

function isReleaseInfo(tokens, i) {
    if (isHard(tokens[i])) return true;
    if (SOFT_WORDS.has(bare(tokens[i])))
        return i === tokens.length - 1 || isReleaseInfo(tokens, i + 1);
    return false;
}

export function removeExtension(text) {
    const ext = path.extname(text);
    return SUPPORTED_EXTENSIONS.has(ext.toLowerCase()) ? text.slice(0, -ext.length) : text;
}

export function removeWebsite(text) {
    return text
        .replace(/^[^|]*\.(?:com|net|org|in|mx|cc|to|me|tv|co|io|xyz|pro)\b[^|]*\|\s*/i, "")
        .replace(/\bwww\.[^\s]+/gi, "");
}

export function normalizeSeparators(text) {
    return text
        .replace(/[._]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\bweb[ -](dl|rip)\b/gi, "web$1")
        .replace(/\bblu ray\b/gi, "bluray")
        .trim();
}

/**
 * Cut everything from the first release-info token on. By default the first
 * word is always kept, so a title like "Extended Family" survives.
 */
export function truncateReleaseInfo(text, { keepFirst = true } = {}) {
    const tokens = text.split(/\s+/).filter(Boolean);
    const kept = [];

    for (let i = 0; i < tokens.length; i++) {
        if ((i > 0 || !keepFirst) && isReleaseInfo(tokens, i)) break;
        kept.push(tokens[i]);
    }

    return kept.join(" ");
}

export function cleanTitle(text) {
    let title = text
        .replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, "")
        .replace(/\s+/g, " ")
        .trim();

    // Trailing release-group tags such as "[YTS MX]" (only when a title precedes them).
    while (/\S\s+\[[^\]]*\]$/.test(title)) title = title.replace(/\s+\[[^\]]*\]$/, "");

    return title.replace(/^[\s\-|:]+|[\s\-|:]+$/g, "");
}

/**
 * Find the release year in a name. Prefers "(2014)" / "[2014]", otherwise the
 * last plausible year. A lone year at the very start ("2012", "1917 1080p") is
 * treated as part of the title.
 */
export function findYear(text, maxYear = new Date().getFullYear() + 1) {
    const found = [];

    for (const m of text.matchAll(/(?<!\d)((?:19|20)\d{2})(?![\dxX])/g)) {
        const value = Number(m[1]);
        if (value > maxYear) continue;

        const before = text[m.index - 1];
        const after = text[m.index + 4];
        found.push({
            value,
            index: m.index,
            bracketed: (before === "(" && after === ")") || (before === "[" && after === "]"),
        });
    }

    if (!found.length) return null;

    const bracketed = found.filter((f) => f.bracketed);
    if (bracketed.length) return bracketed.at(-1);

    const last = found.at(-1);
    if (found.length === 1 && last.index === 0) return null;
    return last;
}

/** "Interstellar.2014.1080p.BluRay.x264-GRP.mkv" -> { title: "Interstellar", year: 2014 } */
export function parseTitleAndYear(input) {
    if (!input) return { title: "", year: null };

    let text = removeWebsite(removeExtension(input));

    const found = findYear(text);
    if (found) {
        text =
            text.slice(0, found.index).replace(/[([]\s*$/, "") +
            " " +
            text.slice(found.index + 4).replace(/^\s*[)\]]/, "");
    }

    text = truncateReleaseInfo(normalizeSeparators(text));

    return { title: cleanTitle(text), year: found?.value ?? null };
}
