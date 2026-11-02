import {
    parseTitleAndYear,
    normalizeSeparators,
    truncateReleaseInfo,
    cleanTitle,
    removeExtension,
} from "./title.js";

// Show.S01E03 / Show S01.E03 / Show.S01E03E04 / Show.S01E03-E04
const SXXEXX = /(?<![A-Za-z])S(\d{1,2})[ ._-]*E(\d{1,3})(?:[ ._-]*E(\d{1,3}))?(?!\d)/i;
// Show.1x03
const NXNN = /(?<=[ ._-])(\d{1,2})x(\d{1,3})(?!\d)/i;

function cleanEpisodeTitle(rest) {
    const text = normalizeSeparators(rest).replace(/^[\s\-–]+/, "");
    return cleanTitle(truncateReleaseInfo(text, { keepFirst: false }));
}

/**
 * Parse a TV episode filename (or embedded title).
 * Returns null when it does not look like an episode. `title` may be "" when
 * the name starts directly with SxxExx.
 */
export function parseEpisode(name) {
    if (!name) return null;

    const base = removeExtension(name);

    for (const pattern of [SXXEXX, NXNN]) {
        const m = pattern.exec(base);
        if (!m) continue;

        const { title, year } = parseTitleAndYear(base.slice(0, m.index));

        return {
            title,
            year,
            season: Number(m[1]),
            episode: Number(m[2]),
            episodeEnd: m[3] ? Number(m[3]) : null,
            episodeTitle: cleanEpisodeTitle(base.slice(m.index + m[0].length)),
        };
    }

    return null;
}

// "Show - 06 - Title", "06 - Title", "06. Title"
const LOOSE_TITLE_PATTERNS = [/-\s*\d{1,3}\s*-\s*(.+)$/, /^\s*\d{1,3}\s*[-.)]\s*(.+)$/];

/** Episode title from a name that may lack SxxExx (used with --season). Returns "" if none. */
export function parseEpisodeTitle(name) {
    if (!name) return "";

    const fromSxxExx = parseEpisode(name)?.episodeTitle;
    if (fromSxxExx) return fromSxxExx;

    const base = removeExtension(name);
    for (const pattern of LOOSE_TITLE_PATTERNS) {
        const m = pattern.exec(base);
        if (m) return cleanEpisodeTitle(m[1]);
    }

    return "";
}

const NUMBER_PATTERNS = [
    /(?<![A-Za-z])S\d{1,2}[ ._-]*E(\d{1,3})(?!\d)/i, // S01E06
    /(?<=[ ._-])\d{1,2}x(\d{1,3})(?!\d)/i, //            1x06
    /(?:^|[ ._[(-])(?:episode|ep?)[ ._-]?(\d{1,3})(?!\d)/i, // E06, Ep06, Episode 6
    /-\s*(\d{1,3})\s*-/, //                              Show - 06 - Title
    /-\s*(\d{1,3})$/, //                                 Show - 06
];

/** Episode number only, for files inside a season folder ("--season" mode). */
export function parseEpisodeNumber(name) {
    if (!name) return null;

    const base = removeExtension(name);

    for (const pattern of NUMBER_PATTERNS) {
        const m = pattern.exec(base);
        if (m) return Number(m[1]);
    }

    return null;
}
