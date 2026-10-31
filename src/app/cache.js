import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const cacheDir = path.join(
  process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"),
  "mediamate",
);

const cacheFile = path.join(cacheDir, "cache.json");

async function readCache() {
  try {
    const content = await readFile(cacheFile, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

const cache = (await readCache()) ?? {};

export async function getCache(key) {
  return (await cache[key]) ?? null;
}

export async function writeToCache(obj) {
  await mkdir(cacheDir, { recursive: true });

  // append to existing cache object, so changes reflect to prev returned cache object
  for (const [key, value] of Object.entries(obj)) cache[key] = value;

  await writeFile(cacheFile, JSON.stringify(cache, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}
