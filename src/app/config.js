import dotenv from "dotenv";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UserError } from "../util/errors.js";

export const APP_NAME = "MediaMate";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
export const configDir = path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
    "mediamate"
);
export const cacheDir = path.join(
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"),
    "mediamate"
);

/** Load .env from the project root, then from ~/.config/mediamate (first value wins). */
export function loadEnv() {
    dotenv.config({ path: path.join(projectRoot, ".env") });
    dotenv.config({ path: path.join(configDir, ".env") });
}

/** Keys are checked lazily, so TVDB_API_KEY is only needed when TVDB is used. */
export function requireKey(name) {
    const value = process.env[name];
    if (!value) {
        throw new UserError(
            `${name} is not set. Put it in ${path.join(projectRoot, ".env")} or ${path.join(configDir, ".env")}.`,
            { fatal: true }
        );
    }
    return value;
}
