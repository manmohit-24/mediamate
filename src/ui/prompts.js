import { select, input, Separator } from "@inquirer/prompts";
import { progress } from "./terminal.js";
import { shutdown } from "../app/shutdown.js";

// Run a prompt with the spinner paused; Ctrl+C inside a prompt aborts the run.
async function ask(fn) {
    return progress.suspend(async () => {
        try {
            return await fn();
        } catch (error) {
            if (error?.name === "ExitPromptError") shutdown.request();
            throw error;
        }
    });
}

/** Free text. Returns the trimmed value, or null when left empty. */
export async function askText(message) {
    const value = await ask(() => input({ message }));
    return value.trim() || null;
}

/** Pick one of several plain options (no skip entry). */
export async function askChoice(message, options) {
    return ask(() =>
        select({
            message,
            choices: options.map((option) => ({ name: option, value: option })),
        })
    );
}

/** Pick which episode a file is. Returns the episode, or null when skipped. */
export async function pickEpisode({ message, episodes }) {
    const choices = episodes.map((episode) => ({
        name: `S${String(episode.season).padStart(2, "0")}E${String(episode.number).padStart(2, "0")} - ${episode.title ?? "(untitled)"}`,
        value: episode,
    }));
    choices.push(new Separator(), { name: "Skip", value: null });

    return ask(() => select({ message, choices, pageSize: 15 }));
}

/**
 * Show provider matches and let the user pick one, search again, enter an ID
 * or skip. Returns one of:
 *   { type: "pick", item } | { type: "search", query } | { type: "id", id }
 *   | { type: "skip" } | { type: "retry" }
 */
export async function pickMatch({ message, items, format, allowId = true }) {
    const choices = items.map((item) => ({
        name: format(item),
        value: { type: "pick", item },
    }));

    choices.push(new Separator());
    choices.push({ name: "Search with another title…", value: { type: "search" } });
    if (allowId) choices.push({ name: "Enter an ID…", value: { type: "id" } });
    choices.push({ name: "Skip", value: { type: "skip" } });

    const action = await ask(() => select({ message, choices, pageSize: 15 }));

    if (action.type === "search") {
        const query = await askText("Search title :");
        return query ? { type: "search", query } : { type: "retry" };
    }

    if (action.type === "id") {
        const id = await askText("ID :");
        return id ? { type: "id", id } : { type: "retry" };
    }

    return action;
}
