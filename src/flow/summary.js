import { log } from "../ui/terminal.js";

/** Print the end-of-run report. Returns the number of failed files. */
export function printSummary(items) {
    const count = (status) => items.filter((item) => item.status === status).length;
    const failed = items.filter((item) => item.status === "failed");

    log.divider();
    log.text(`Done ${count("done")} · Skipped ${count("skipped")} · Failed ${failed.length}`);

    if (failed.length) {
        log.divider();
        for (const item of failed) log.error(`${item.file.name}: ${item.reason}`);
    }

    return failed.length;
}
