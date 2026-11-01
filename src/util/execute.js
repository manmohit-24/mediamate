import { execFile } from "node:child_process";
import { ToolMissingError } from "./errors.js";

/** Run an external program. Rejects with ToolMissingError if it is not installed. */
export function execute(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        execFile(
            command,
            args,
            { maxBuffer: 64 * 1024 * 1024, ...options },
            (error, stdout, stderr) => {
                if (error) {
                    if (error.code === "ENOENT") return reject(new ToolMissingError(command));
                    error.stdout = stdout;
                    error.stderr = stderr;
                    return reject(error);
                }
                resolve({ stdout, stderr });
            }
        );
    });
}
