export const env = {
  tmdbApiKey: process.env.TMDB_API_KEY,
};

export const appConfig = {
  appName: "MediaMate",
};

if (!env.tmdbApiKey) throw new Error("TMDB_API_KEY is not set.");
