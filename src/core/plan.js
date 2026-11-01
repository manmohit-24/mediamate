import { getLanguageName, normalizeLanguage } from "./language.js";
import { movieFileName, episodeFileName, episodeDisplayTitle, episodeTag } from "./naming.js";

/**
 * Which parts of a file a run changes.
 * `organize` does everything; `cover` only replaces the embedded poster.
 */
export const ORGANIZE_STEPS = Object.freeze({ tags: true, rename: true, cover: true, dates: true });
export const COVER_STEPS = Object.freeze({ tags: false, rename: false, cover: true, dates: false });

function audioTrack(track) {
    const language = normalizeLanguage(track.language);
    return {
        id: track.id,
        language,
        name: track.title ?? getLanguageName(language),
        default: track.default,
        forced: track.forced,
    };
}

function subtitleTrack(track) {
    const language = normalizeLanguage(track.language);
    const flags = `${track.default ? "(Default) " : ""}${track.forced ? "(Forced)" : ""}`;
    return {
        id: track.id,
        language,
        name: `${getLanguageName(language)} ${flags}`.trim(),
        default: track.default,
        forced: track.forced,
    };
}

/**
 * Turn a match (+ probe info) into a plan: plain data describing exactly what
 * the apply phase will do. No I/O happens here.
 *
 * match: { kind: "movie", movie } | { kind: "episode", series, season, episode }
 */
export function buildPlan({ match, info, steps }) {
    if (steps.tags && !info) throw new Error("Media info is required to update tags");

    const tracks = steps.tags
        ? { audio: info.audio.map(audioTrack), subtitles: info.subtitles.map(subtitleTrack) }
        : null;

    if (match.kind === "movie") {
        const { movie } = match;
        const name = movieFileName(movie);

        return {
            label: name,
            newName: steps.rename ? name : null,
            metadata: tracks && { title: movie.title, date: movie.releaseDate, ...tracks },
            coverUrl: steps.cover ? movie.poster : null,
            date: steps.dates ? movie.releaseDate : null,
            group: null,
        };
    }

    const { series, season, episode } = match;
    const parts = {
        series: series.title,
        season: episode.season ?? season.number,
        episode: episode.number,
        title: episode.title ?? `Episode ${episode.number}`,
    };
    const date = episode.airDate || series.firstAirDate || null;
    const name = episodeFileName(parts);

    return {
        label: `${series.title} ${episodeTag(parts.season, parts.episode)} - ${parts.title}`,
        newName: steps.rename ? name : null,
        metadata: tracks && { title: episodeDisplayTitle(parts), date, ...tracks },
        coverUrl: steps.cover ? episode.poster : null,
        date: steps.dates ? date : null,
        group: { key: `${series.id}:${season.number}`, series, season },
    };
}
