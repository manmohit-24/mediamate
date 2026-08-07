import { env } from "../../app/config.js";

const BASE_URL = "https://api.themoviedb.org/3";
const RETRIES = 5;

export async function request(endpoint, params = {}) {
  const url = buildURL(endpoint, params);
  let lastError;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });

      const body = await res.json();

      if (res.ok) return body;

      const error = new Error(`TMDb ${res.status}: ${body.status_message}`);

      if ([429, 500, 502, 503, 504].includes(res.status)) throw error;

      lastError = error;
      break;
    } catch (error) {
      lastError = error;

      if (attempt < RETRIES)
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

export function buildURL(endpoint, params) {
  const url = new URL(`${BASE_URL}${endpoint}`);

  url.searchParams.set("api_key", env.tmdbApiKey);

  for (const [key, value] of Object.entries(params))
    if (value != null) url.searchParams.set(key, value);

  return url;
}
