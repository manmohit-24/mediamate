import { SkipError } from "../util/errors.js";
import { parseEpisode, parseEpisodeNumber } from "../core/parse/episode.js";
import { matchEpisode } from "../core/matching.js";
import { buildPlan } from "../core/plan.js";
import { episodeTag } from "../core/naming.js";
import { progress } from "../ui/terminal.js";
import { resolveMovie, resolveSeries, getSeason } from "./resolve.js";

async function matchEpisodeFile(ctx, file, parsed) {
    if (!parsed.title) {
        throw new Error("The name has an episode number but no show title (try --season)");
    }

    const series = await resolveSeries(ctx, parsed, file.name);
    const season = await getSeason(ctx, series, parsed.season);
    const episode = matchEpisode(season.episodes, parsed);

    if (!episode) {
        throw new Error(
            `${episodeTag(parsed.season, parsed.episode)} was not found in "${series.title}"`
        );
    }

    return { kind: "episode", series, season, episode };
}

function matchManualEpisode(ctx, file) {
    const { series, season } = ctx.manualSeason;

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
        match = matchManualEpisode(ctx, file);
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
