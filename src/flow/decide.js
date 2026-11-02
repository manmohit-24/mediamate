import { SkipError } from "../util/errors.js";
import { parseEpisode, parseEpisodeNumber, parseEpisodeTitle } from "../core/parse/episode.js";
import { matchEpisode, findByTitle } from "../core/matching.js";
import { buildPlan } from "../core/plan.js";
import { episodeTag } from "../core/naming.js";
import { progress } from "../ui/terminal.js";
import { pickEpisode } from "../ui/prompts.js";
import { resolveMovie, resolveSeries, getSeason, getAllSeasons } from "./resolve.js";

/**
 * Match an episode by its title instead of its number (--by-title). Used when
 * the numbering of the provider differs from the one the file was named with.
 * Looks in `preferred` (the file's own season) first, then in every season.
 * When nothing fits clearly: --auto fails, otherwise the user picks.
 */
async function matchByTitle(ctx, { series, preferred, title, fileName }) {
    if (!title) throw new Error("No episode title in the file name (needed for --by-title)");

    if (preferred) {
        const found = findByTitle(preferred.episodes, title);
        if (found.match) return { season: preferred, episode: found.match };
    }

    const seasons = await getAllSeasons(ctx, series);
    const everything = seasons.flatMap((season) => season.episodes);
    const found = findByTitle(everything, title);

    const seasonOf = (episode) =>
        seasons.find((season) => season.episodes.includes(episode)) ?? preferred;

    if (found.match) return { season: seasonOf(found.match), episode: found.match };

    if (ctx.options.match === "auto") {
        throw new Error(`No episode titled "${title}" found in "${series.title}"`);
    }

    const options = found.candidates.length
        ? found.candidates
        : (preferred?.episodes ?? everything);
    const episode = await pickEpisode({
        message: `Which episode is "${title}" (${fileName})?`,
        episodes: options,
    });

    if (!episode) throw new SkipError("Skipped");
    return { season: seasonOf(episode), episode };
}

async function matchEpisodeFile(ctx, file, parsed) {
    if (!parsed.title) {
        throw new Error("The name has an episode number but no show title (try --season)");
    }

    const series = await resolveSeries(ctx, parsed, file.name);

    if (ctx.options.byTitle) {
        const season = await getSeason(ctx, series, parsed.season).catch(() => null); // may not exist for this provider
        const found = await matchByTitle(ctx, {
            series,
            preferred: season,
            title: parsed.episodeTitle,
            fileName: file.name,
        });
        return { kind: "episode", series, ...found };
    }

    const season = await getSeason(ctx, series, parsed.season);
    const episode = matchEpisode(season.episodes, parsed);

    if (!episode) {
        throw new Error(
            `${episodeTag(parsed.season, parsed.episode)} was not found in "${series.title}"`
        );
    }

    return { kind: "episode", series, season, episode };
}

async function matchManualEpisode(ctx, file) {
    const { series, season } = ctx.manualSeason;

    if (ctx.options.byTitle) {
        const found = await matchByTitle(ctx, {
            series,
            preferred: season,
            title: parseEpisodeTitle(file.name),
            fileName: file.name,
        });
        return { kind: "episode", series, ...found };
    }

    const number = parseEpisodeNumber(file.name);
    if (number == null) throw new Error("Could not find an episode number in the file name");

    const episode = season.episodes.find((e) => Number(e.number) === number);
    if (!episode) throw new Error(`Episode ${number} was not found in ${season.title}`);

    return { kind: "episode", series, season, episode };
}

async function decideFile(ctx, file, steps) {
    const info = steps.tags ? await ctx.probe(file.path) : null;

    let match;
    if (ctx.manualSeason) {
        match = await matchManualEpisode(ctx, file);
    } else {
        const parsed = parseEpisode(file.name) ?? (info?.title ? parseEpisode(info.title) : null);
        match = parsed
            ? await matchEpisodeFile(ctx, file, parsed)
            : { kind: "movie", movie: await resolveMovie(ctx, file, info) };
    }

    const plan = buildPlan({ match, info, steps });

    if (steps.cover && !steps.tags && !plan.coverUrl) {
        throw new Error(`No poster artwork available for ${plan.label}`);
    }

    return plan;
}

/**
 * Decide phase: probe, parse and match every file (asking the user where
 * needed) and produce a plan for each. Nothing on disk is changed, so Ctrl+C
 * here is always safe.
 * Returns [{ file, status: "ready" | "skipped" | "failed", plan, reason }].
 */
export async function decide(files, ctx, steps) {
    const items = [];

    for (const [i, file] of files.entries()) {
        progress.update(`Matching [${i + 1}/${files.length}] ${file.name}`);

        const item = { file, status: "ready", plan: null, reason: null };

        try {
            item.plan = await decideFile(ctx, file, steps);
        } catch (error) {
            if (error.fatal) throw error;
            item.status = error instanceof SkipError ? "skipped" : "failed";
            item.reason = error.message;
        }

        items.push(item);
    }

    return items;
}
