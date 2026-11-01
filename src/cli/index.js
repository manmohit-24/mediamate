#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadEnv, APP_NAME } from "../app/config.js";
import { createContext } from "../app/context.js";
import { parseCli } from "./args.js";
import { showHelp } from "./help.js";
import { organize, cover } from "../commands/organize.js";
import { folder } from "../commands/folder.js";
import { UserError, UsageError } from "../util/errors.js";
import { log, progress } from "../ui/terminal.js";

const RUNNERS = { organize, cover, folder };

async function main() {
    loadEnv();

    let cli;
    try {
        cli = parseCli(process.argv.slice(2));
    } catch (error) {
        if (!(error instanceof UsageError)) throw error;
        log.error(error.message);
        log.muted("Run 'mediamate --help' for usage.");
        return 2;
    }

    if (cli.version) {
        const pkg = JSON.parse(
            await readFile(new URL("../../package.json", import.meta.url), "utf8")
        );
        log.text(pkg.version);
        return 0;
    }

    if (cli.help) {
        showHelp(cli.command);
        return 0;
    }

    const { command, options } = cli;
    log.title(`${APP_NAME} · ${command}`);
    log.muted(
        [
            options.path,
            options.match !== "smart" && `--${options.match}`,
            options.recursive && "-r",
            options.season && "--season",
            options.folder && "--folder",
            options.provider !== "tmdb" && `--provider ${options.provider}`,
        ]
            .filter(Boolean)
            .join("  ")
    );

    const failed = await RUNNERS[command](createContext(options));
    return failed ? 1 : 0;
}

main()
    .then((code) => {
        process.exitCode = code;
    })
    .catch((error) => {
        progress.stop();
        log.error(
            error instanceof UserError
                ? error.message
                : process.env.DEBUG
                  ? error.stack
                  : error.message
        );
        process.exitCode = 1;
    });
