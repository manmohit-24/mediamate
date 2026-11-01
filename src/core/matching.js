export const normalize = (value) =>
    (value ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();

/**
 * Pick a candidate only when it is unambiguous: exact (normalized) title and,
 * when a year is known, exactly one candidate with that year. Otherwise null,
 * meaning "ask the user".
 * Candidates look like { title, year } (year is a string like "2014" or null).
 */
export function pickConfident(candidates, { title, year }) {
    const wanted = normalize(title);
    if (!wanted) return null;

    const exact = candidates.filter((c) => normalize(c.title) === wanted);

    if (year) {
        const sameYear = exact.filter((c) => c.year === String(year));
        return sameYear.length === 1 ? sameYear[0] : null;
    }

    return exact.length === 1 ? exact[0] : null;
}

/**
 * Find the episode a parsed filename refers to. The explicit episode number
 * wins; the episode title is only a fallback when the number is not found.
 */
export function matchEpisode(episodes, parsed) {
    const byNumber = episodes.filter((e) => Number(e.number) === Number(parsed.episode));
    if (byNumber.length === 1) return byNumber[0];

    const wanted = normalize(parsed.episodeTitle);
    if (!wanted) return null;

    const byTitle = episodes.filter((e) => normalize(e.title) === wanted);
    return byTitle.length === 1 ? byTitle[0] : null;
}
