import { env } from "../../app/config.js";
import { requestJSON } from "../http.js";
import { buildURL } from "../buildURL.js";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

export async function request(endpoint, params = {}) {
  const url = buildURL(`${BASE_URL}${endpoint}`, {
    ...params,
    api_key: env.tmdbApiKey,
  });

  try {
    return await requestJSON(url, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    error.message = `TMDb: ${error.message}`;
    throw error;
  }
}

export function parsePosterUrl(poster) {
  if (!poster) return null;
  return `${IMAGE_BASE_URL}${poster}`;
}
