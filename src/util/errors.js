/** Thrown (or caught) when the user chose to skip a file/group. Not a failure. */
export class SkipError extends Error {
    constructor(message = "Skipped") {
        super(message);
        this.name = "SkipError";
    }
}

/**
 * Expected problems whose message is enough for the user (bad input, missing key...).
 * `fatal` errors affect every file the same way, so they stop the whole run
 * instead of being reported once per file.
 */
export class UserError extends Error {
    constructor(message, { fatal = false } = {}) {
        super(message);
        this.name = "UserError";
        this.fatal = fatal;
    }
}

/** Bad command line usage. */
export class UsageError extends UserError {
    constructor(message) {
        super(message);
        this.name = "UsageError";
    }
}

/** An external program (mediainfo, ffmpeg, ...) is not installed. */
export class ToolMissingError extends UserError {
    constructor(tool) {
        super(`'${tool}' was not found. Install it and make sure it is on your PATH.`, {
            fatal: true,
        });
        this.name = "ToolMissingError";
        this.tool = tool;
    }
}
