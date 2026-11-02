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

// Dice coefficient on character bigrams: 1 = identical, 0 = nothing in common.
export function similarity(a, b) {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigrams = (text) => {
        const counts = new Map();
        for (let i = 0; i < text.length - 1; i++) {
            const pair = text.slice(i, i + 2);
            counts.set(pair, (counts.get(pair) ?? 0) + 1);
        }
        return counts;
    };

    const first = bigrams(a);
    const second = bigrams(b);
    let shared = 0;
    for (const [pair, n] of first) shared += Math.min(n, second.get(pair) ?? 0);

    return (2 * shared) / (a.length - 1 + (b.length - 1));
}

const CLOSE_ENOUGH = 0.88; // best candidate must be at least this similar...
const CLEAR_WINNER = 0.05; // ...and this much better than the runner-up

/**
 * Find episodes by title (for when numbering differs between providers).
 * Returns { match, candidates }: `match` is set when one episode clearly fits
 * (exact normalized title, or a close one with a clear winner); otherwise it is
 * null and `candidates` holds the plausible ones, best first.
 */
export function findByTitle(episodes, title) {
    const wanted = normalize(title);
    if (!wanted) return { match: null, candidates: [] };

    const titled = episodes.filter((e) => normalize(e.title));

    const exact = titled.filter((e) => normalize(e.title) === wanted);
    if (exact.length === 1) return { match: exact[0], candidates: exact };
    if (exact.length > 1) return { match: null, candidates: exact };

    const scored = titled
        .map((episode) => ({ episode, score: similarity(wanted, normalize(episode.title)) }))
        .filter((entry) => entry.score >= 0.7)
        .sort((a, b) => b.score - a.score);

    const [best, runnerUp] = scored;
    const clear =
        best &&
        best.score >= CLOSE_ENOUGH &&
        (!runnerUp || best.score - runnerUp.score >= CLEAR_WINNER);

    return { match: clear ? best.episode : null, candidates: scored.map((entry) => entry.episode) };
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
