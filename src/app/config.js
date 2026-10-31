import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

dotenv.config({
  path: path.join(projectRoot, ".env"),
});

export const env = {
  tmdbApiKey: process.env.TMDB_API_KEY,
  tvdbApiKey: process.env.TVDB_API_KEY,
};

export const appConfig = {
  appName: "MediaMate",
};

if (!env.tmdbApiKey) throw new Error("TMDB_API_KEY is not set.");
if (!env.tvdbApiKey) throw new Error("TVDB_API_KEY is not set");
