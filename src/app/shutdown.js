import { log, progress } from "../ui/terminal.js";

/**
 * Ctrl+C handling. Outside a critical section we exit right away; inside one
 * (writing tags, renaming...) we finish the current file first.
 */
class Shutdown {
    #critical = 0;
    #requested = false;

    constructor() {
        process.on("SIGINT", () => this.request());
    }

    request() {
        this.#requested = true;

        if (this.#critical > 0) {
            log.info("Cancellation requested. Finishing current file...");
            return;
        }

        this.exit();
    }

    async critical(fn) {
        this.#critical++;

        try {
            return await fn();
        } finally {
            this.#critical--;

            if (this.#requested && this.#critical === 0) this.exit();
        }
    }

    exit(code = 130) {
        progress.stop();
        console.log("\nAborted.");
        process.exit(code);
    }
}

export const shutdown = new Shutdown();
