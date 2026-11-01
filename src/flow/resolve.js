import { SkipError } from "../util/errors.js";
import { pickConfident } from "../core/matching.js";
import { parseTitleAndYear } from "../core/parse/title.js";
import { parseEpisode } from "../core/parse/episode.js";
import { pickMatch, askText } from "../ui/prompts.js";

const formatTitle = (item) => `${item.title} (${item.year ?? "----"})`;

async function searchWithYearFallback(search, { title, year }) {
    if (year) {
        const results = await search({ title, year });
        if (results.length) return results;
    }
    return search({ title });
}

/**
 * Let the user choose among matches (search again / enter ID / skip included).
 * Returns the chosen item, or null when skipped.
 */
async function chooseInteractively({ message, matches, search, byId, format = formatTitle }) {
    let current = matches;

    for (;;) {
        const action = await pickMatch({ message, items: current, format, allowId: Boolean(byId) });

        switch (action.type) {
            case "pick":
                return action.item;
            case "skip":
                return null;
            case "search":
                current = await search({ title: action.query });
                break;
            case "id":
                return byId(action.id);
            default: // retry
                break;
        }
    }
}

/**
 * Apply the match policy:
 *   auto  -> first result
 *   smart -> accept only unambiguous matches, otherwise ask
 *   ask   -> always ask
 */
async function resolveWithPolicy(ctx, { kind, label, matches, wanted, search, byId, format }) {
    const policy = ctx.options.match;

    if (policy === "auto") {
        if (!matches.length) throw new Error(`No ${kind} match found for "${wanted.title}"`);
        return matches[0];
    }

    if (policy === "smart") {
        const confident = pickConfident(matches, wanted);
        if (confident) return confident;
    }

    const chosen = await chooseInteractively({
        message: matches.length
            ? `Select the ${kind} for ${label}`
            : `No ${kind} found for ${label}`,
        matches,
        search,
        byId,
        format,
    });

    if (!chosen) throw new SkipError("Skipped");
    return chosen;
}

const movieSearch = (ctx) => (query) => ctx.providers.movie.searchMovie(query);
const seriesSearch = (ctx) => (query) => ctx.providers.tv.searchSeries(query);

/** Match a movie file. Tries the embedded title first, then the file name. */
export async function resolveMovie(ctx, file, info) {
    const candidates = [info?.title, file.name]
        .filter(Boolean)
        .map(parseTitleAndYear)
        .filter((parsed) => parsed.title);

    let wanted = candidates[0] ?? { title: "", year: null };
    let matches = [];

    for (const candidate of candidates) {
        matches = await searchWithYearFallback(movieSearch(ctx), candidate);
        wanted = candidate;
        if (matches.length) break;
    }

    return resolveWithPolicy(ctx, {
        kind: "movie",
        label: file.name,
        matches,
        wanted,
        search: movieSearch(ctx),
        byId: (id) => ctx.providers.movie.getMovie(id),
    });
}

/** Match the show of an episode file. Asked/decided once per show (cached). */
export async function resolveSeries(ctx, parsed, fileName) {
    const key = `series:${ctx.providers.tv.name}:${parsed.title.toLowerCase()}:${parsed.year ?? ""}`;

    const series = await ctx.cache.getOrFetch(key, async () => {
        try {
            const matches = await searchWithYearFallback(seriesSearch(ctx), parsed);
            return await resolveWithPolicy(ctx, {
                kind: "TV show",
                label: `"${parsed.title}" (${fileName})`,
                matches,
                wanted: parsed,
                search: seriesSearch(ctx),
                byId: (id) => ctx.providers.tv.getSeries(id),
            });
        } catch (error) {
            if (error instanceof SkipError) return null; // remember the skip for the whole show
            throw error;
        }
    });

    if (!series) throw new SkipError(`Show "${parsed.title}" skipped`);
    return series;
}

/** Fetch a season once per run. */
export function getSeason(ctx, series, number) {
    return ctx.cache.getOrFetch(
        `season:${ctx.providers.tv.name}:${series.id}:${number}`,
        async () => {
            try {
                return await ctx.providers.tv.getSeason(series.id, number);
            } catch (error) {
                if (error.status === 404)
                    throw new Error(`Season ${number} of "${series.title}" was not found`);
                throw error;
            }
        }
    );
}

// ---- Interactive lookups (manual "--season" mode and the folder command) ----

/** Ask for a movie by name or ID. Returns the movie or null (skipped). */
export async function promptMovie(ctx) {
    const input = await askText("Movie name or TMDb ID :");
    if (!input) return null;

    const { movie } = ctx.providers;
    if (/^\d+$/.test(input)) return movie.getMovie(input);

    const parsed = parseTitleAndYear(input);
    return chooseInteractively({
        message: "Select the movie",
        matches: await searchWithYearFallback(movieSearch(ctx), parsed),
        search: movieSearch(ctx),
        byId: (id) => movie.getMovie(id),
    });
}

/**
 * Ask for a show by name or ID. "Breaking Bad S02" also gives the season.
 * Returns { series, seasonNumber } or null (skipped).
 */
export async function promptSeries(ctx) {
    const input = await askText("TV show name or ID (e.g. Breaking Bad S02) :");
    if (!input) return null;

    const tv = ctx.providers.tv;
    let series;
    let seasonNumber = null;

    if (/^\d+$/.test(input)) {
        series = await tv.getSeries(input);
    } else {
        const parsedEpisode = parseEpisode(input);
        const seasonOnly = /^(.*?)[ ._-]+S(\d{1,2})$/i.exec(input);

        if (seasonOnly) seasonNumber = Number(seasonOnly[2]);
        else if (parsedEpisode) seasonNumber = parsedEpisode.season;

        const parsed = parseTitleAndYear(
            seasonOnly ? seasonOnly[1] : (parsedEpisode?.title ?? input)
        );
        series = await chooseInteractively({
            message: "Select the TV show",
            matches: await searchWithYearFallback(seriesSearch(ctx), parsed),
            search: seriesSearch(ctx),
            byId: (id) => tv.getSeries(id),
        });
    }

    return series ? { series, seasonNumber } : null;
}

/** Ask for a show and a season number. Returns { series, season } or null. */
export async function promptSeasonContext(ctx) {
    const found = await promptSeries(ctx);
    if (!found) return null;

    let { seasonNumber } = found;
    while (seasonNumber == null) {
        const answer = await askText("Season number :");
        if (!answer) return null;
        if (/^\d+$/.test(answer)) seasonNumber = Number(answer);
    }

    return { series: found.series, season: await getSeason(ctx, found.series, seasonNumber) };
}

/** Ask for a franchise (TMDb collection). Returns the collection or null. */
export async function promptCollection(ctx) {
    const input = await askText("Franchise name :");
    if (!input) return null;

    const search = (query) => ctx.providers.movie.searchCollection(query);
    return chooseInteractively({
        message: "Select the franchise",
        matches: await search({ title: input }),
        search,
        byId: null,
        format: (item) => item.title,
    });
}
