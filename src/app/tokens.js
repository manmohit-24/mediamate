import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cacheDir } from "./config.js";

const tokenFile = path.join(cacheDir, "tokens.json");

async function readAll() {
    try {
        return JSON.parse(await readFile(tokenFile, "utf8"));
    } catch {
        return {};
    }
}

export async function readToken(name) {
    return (await readAll())[name] ?? null;
}

export async function saveToken(name, value) {
    const all = await readAll();
    all[name] = value;
    await mkdir(cacheDir, { recursive: true });
    await writeFile(tokenFile, JSON.stringify(all, null, 2), { mode: 0o600 });
}
