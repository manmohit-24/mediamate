import path from "node:path";
import { askChoice } from "../ui/prompts.js";
import { isDirectory } from "../fsops/scan.js";
import { applyFolder } from "../folder/index.js";
import { promptMovie, promptSeries, promptCollection } from "../flow/resolve.js";
import { askText } from "../ui/prompts.js";
import { UserError } from "../util/errors.js";
import { log, progress } from "../ui/terminal.js";

const KINDS = ["TV show / season", "Movie", "Franchise", "Manual (use existing .poster.png)"];

async function tvTarget(ctx) {
    const found = await promptSeries(ctx);
    if (!found) return null;

    const { series } = found;
    let seasonNumber = found.seasonNumber;

    if (seasonNumber == null) {
        const answer = await askText("Season number (empty = whole show) :");
        if (answer && /^\d+$/.test(answer)) seasonNumber = Number(answer);
    }

    const logoUrl = await ctx.providers.tv.getSeriesLogo(series.id).catch(() => null);

    if (seasonNumber == null) return { name: series.title, posterUrl: series.poster, logoUrl };

    const season = await ctx.providers.tv.getSeason(series.id, seasonNumber);
    return { name: season.title, posterUrl: season.poster ?? series.poster, logoUrl };
}

async function movieTarget(ctx) {
    const movie = await promptMovie(ctx);
    if (!movie) return null;

    const logoUrl = await ctx.providers.movie.getMovieLogo(movie.id).catch(() => null);
    return { name: movie.title, posterUrl: movie.poster, logoUrl };
}

async function franchiseTarget(ctx) {
    const collection = await promptCollection(ctx);
    if (!collection) return null;

    return { name: collection.title, posterUrl: collection.poster, logoUrl: null };
}

async function manualTarget() {
    const name = await askText("New folder name (empty = keep) :");
    return { name, posterUrl: null, logoUrl: null };
}

const TARGETS = {
    [KINDS[0]]: tvTarget,
    [KINDS[1]]: movieTarget,
    [KINDS[2]]: franchiseTarget,
    [KINDS[3]]: manualTarget,
};

/** Name a folder and give it a poster icon. */
export async function folder(ctx) {
    const target = path.resolve(ctx.options.path);
    if (!(await isDirectory(target))) throw new UserError("The folder command needs a folder path");

    const kind = await askChoice("What is this folder?", KINDS);

    progress.start("Looking up");
    const details = await TARGETS[kind](ctx);

    if (!details) {
        progress.stop();
        log.info("Skipped. Nothing changed.");
        return 0;
    }

    try {
        const result = await applyFolder(ctx, target, details);
        log.success(`Folder → ${result}`);
        return 0;
    } finally {
        progress.stop();
    }
}
