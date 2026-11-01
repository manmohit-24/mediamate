import ora from "ora";
import kleur from "kleur";

let spinner = null;

// Print a line without corrupting the running spinner.
function print(write, line) {
    if (spinner?.isSpinning) {
        spinner.clear();
        write(line);
        spinner.render();
    } else {
        write(line);
    }
}

const out = (line) => print((l) => console.log(l), line);
const err = (line) => print((l) => console.error(l), line);

export const log = {
    info: (msg) => out(`${kleur.cyan("ℹ")} ${msg}`),
    success: (msg) => out(`${kleur.green("✓")} ${msg}`),
    warn: (msg) => out(`${kleur.yellow("⚠")} ${msg}`),
    error: (msg) => err(`${kleur.red("✕")} ${msg}`),
    skip: (msg) => out(`${kleur.dim("–")} ${msg}`),
    title: (msg) => out(kleur.bold(msg)),
    text: (msg) => out(msg),
    muted: (msg) => out(kleur.dim(msg)),
    divider: () => out(kleur.dim("────────────────────────────────────────────")),
};

export const progress = {
    start(text = "") {
        spinner?.stop();
        spinner = ora({ text, spinner: "dots", discardStdin: false }).start();
    },

    update(text) {
        if (spinner) spinner.text = text;
    },

    stop() {
        spinner?.stop();
        spinner = null;
    },

    /** Pause the spinner while something else (a prompt) owns the terminal. */
    async suspend(action) {
        if (!spinner?.isSpinning) return action();

        const text = spinner.text;
        spinner.stop();
        try {
            return await action();
        } finally {
            spinner.start(text);
        }
    },
};
