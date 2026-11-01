import { ORGANIZE_STEPS, COVER_STEPS } from "../core/plan.js";
import { scanMedia, isDirectory } from "../fsops/scan.js";
import { decide } from "../flow/decide.js";
import { apply } from "../flow/apply.js";
import { printSummary } from "../flow/summary.js";
import { promptSeasonContext } from "../flow/resolve.js";
import { applyFolder } from "../folder/index.js";
import { UserError } from "../util/errors.js";
import { log, progress } from "../ui/terminal.js";

/**
 * Shared run for `organize` and `cover`: scan -> decide (all questions) ->
 * apply (unattended) -> optional folder step -> summary.
 */
async function run(ctx, steps, { folder = false } = {}) {
    const { path: target, recursive, season } = ctx.options;

    if (folder && !(await isDirectory(target))) throw new UserError("--folder needs a folder path");

    progress.start("Scanning");
    const files = await scanMedia(target, recursive);
    log.success(`Found ${files.length} media file(s)`);

    if (!files.length) {
        progress.stop();
        return 0;
    }

    if (season) {
        ctx.manualSeason = await promptSeasonContext(ctx);
        if (!ctx.manualSeason) {
            progress.stop();
            log.info("No show selected. Nothing changed.");
            return 0;
        }
    }

    const items = await decide(files, ctx, steps);
    await apply(items, ctx);

    if (folder) await folderStep(ctx, items);

    progress.stop();
    return printSummary(items);
}

// Name and decorate the folder after the season it holds (single show+season only).
async function folderStep(ctx, items) {
    const groups = new Map();
    for (const item of items) {
        if (item.status === "done" && item.plan.group)
            groups.set(item.plan.group.key, item.plan.group);
    }

    if (groups.size === 0) {
        log.warn("--folder skipped: it only works for TV episodes");
        return;
    }
    if (groups.size > 1) {
        log.warn("--folder skipped: the files belong to more than one show/season");
        return;
    }

    const { series, season } = [...groups.values()][0];

    try {
        progress.update("Looking up logo");
        const logoUrl = await ctx.providers.tv.getSeriesLogo(series.id).catch(() => null);

        const folder = await applyFolder(ctx, ctx.options.path, {
            name: season.title,
            posterUrl: season.poster ?? series.poster,
            logoUrl,
        });
        log.success(`Folder → ${folder}`);
    } catch (error) {
        log.error(`Folder step failed: ${error.message}`);
    }
}

/** Rename + tags + cover + timestamps. */
export const organize = (ctx) => run(ctx, ORGANIZE_STEPS, { folder: ctx.options.folder });

/** Replace only the embedded poster. */
export const cover = (ctx) => run(ctx, COVER_STEPS);
