import { parseArgs } from "node:util";
import { UsageError } from "../util/errors.js";

const OPTION_DEFS = {
    recursive: { type: "boolean", short: "r" },
    ask: { type: "boolean" },
    auto: { type: "boolean" },
    season: { type: "boolean" },
    folder: { type: "boolean" },
    provider: { type: "string" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
};

// Which options each command accepts.
export const COMMANDS = {
    organize: ["recursive", "ask", "auto", "season", "folder", "provider"],
    cover: ["recursive", "ask", "auto", "season", "provider"],
    folder: ["provider"],
};

const PROVIDERS = ["tmdb", "tvdb"];

/**
 * Parse argv into { command, help, version, options }.
 * options: { path, recursive, match: "smart"|"ask"|"auto", season, folder, provider }
 */
export function parseCli(argv) {
    let parsed;
    try {
        parsed = parseArgs({
            args: argv,
            options: OPTION_DEFS,
            allowPositionals: true,
            strict: true,
        });
    } catch (error) {
        throw new UsageError(error.message.split(". To specify")[0]);
    }

    const { values, positionals } = parsed;
    const [command, target, ...extra] = positionals;

    if (values.version) return { version: true };
    if (values.help || !command) return { help: true, command };

    if (!(command in COMMANDS)) throw new UsageError(`Unknown command '${command}'`);

    for (const key of Object.keys(values)) {
        if (!COMMANDS[command].includes(key)) {
            throw new UsageError(`--${key} is not available for '${command}'`);
        }
    }

    if (!target) throw new UsageError(`'${command}' needs a path`);
    if (extra.length) throw new UsageError(`Unexpected argument '${extra[0]}'`);
    if (values.ask && values.auto) throw new UsageError("Use either --ask or --auto, not both");

    const provider = values.provider ?? "tmdb";
    if (!PROVIDERS.includes(provider)) {
        throw new UsageError(`Unknown provider '${provider}' (use ${PROVIDERS.join(" or ")})`);
    }

    return {
        command,
        options: {
            path: target,
            recursive: Boolean(values.recursive),
            match: values.ask ? "ask" : values.auto ? "auto" : "smart",
            season: Boolean(values.season),
            folder: Boolean(values.folder),
            provider,
        },
    };
}
