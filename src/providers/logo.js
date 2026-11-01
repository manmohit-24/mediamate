/**
 * Pick the best logo. Input: [{ url, language, score }] where language is an
 * ISO code or null (textless). English first, then textless, then the rest;
 * score (votes) breaks ties.
 */
export function pickBestLogo(logos) {
    const rank = (logo) => {
        if (logo.language === "en") return 2;
        if (!logo.language) return 1;
        return 0;
    };

    return (
        [...logos].sort((a, b) => rank(b) - rank(a) || (b.score ?? 0) - (a.score ?? 0))[0]?.url ??
        null
    );
}
