import path from "node:path";
import { shutdown } from "../app/shutdown.js";
import { renameFile } from "../fsops/rename.js";
import { setReleaseDate } from "../fsops/timestamps.js";
import { log, progress } from "../ui/terminal.js";

/**
 * Apply phase: write what the decide phase planned, unattended.
 * Each file's writes run as a critical section, so Ctrl+C finishes the current
 * file before stopping. Updates `item.status` to "done" or "failed".
 */
export async function apply(items, ctx) {
    const ready = items.filter((item) => item.status === "ready");

    for (const [i, item] of ready.entries()) {
        const { file, plan } = item;
        progress.update(`Applying [${i + 1}/${ready.length}] ${file.name}`);

        try {
            // Download first: nothing has been touched yet if this fails.
            const cover = plan.coverUrl ? await ctx.downloadImage(plan.coverUrl) : null;

            const finalPath = await shutdown.critical(async () => {
                await ctx.writeMedia(file.path, { metadata: plan.metadata, cover });

                const target = plan.newName ? await renameFile(file.path, plan.newName) : file.path;
                if (plan.date) await setReleaseDate(target, plan.date);
                return target;
            });

            item.status = "done";
            item.finalPath = finalPath;

            const newName = path.basename(finalPath);
            log.success(
                `[${i + 1}/${ready.length}] ${newName === file.name ? file.name : `${file.name} → ${newName}`}`
            );
        } catch (error) {
            if (error.fatal) throw error;
            item.status = "failed";
            item.reason = error.message;
        }
    }
}
