import { env } from "../../app/config.js";
import { buildURL } from "../buildURL.js";
import { getCache, writeToCache } from "../../app/cache.js";
import { requestJSON } from "../http.js";

const BASE_URL = "https://api4.thetvdb.com/v4";
const IMAGE_BASE_URL = "https://artworks.thetvdb.com";

export async function request(endpoint, params = {}) {
  const url = buildURL(`${BASE_URL}${endpoint}`, params);

  try {
    const token = (await getCache("TVDB_AUTH_TOKEN")) ?? (await login());
    return await requestJSON(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    // A token may have expired or been revoked.
    if (error.status !== 401) {
      error.message = `TheTVDB: ${error.message}`;
      throw error;
    }

    try {
      // retry with new token
      const token = await login();

      return await requestJSON(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (retryError) {
      retryError.message = `TheTVDB: ${retryError.message}`;
      throw retryError;
    }
  }
}

export function parsePosterUrl(poster) {
  if (!poster) return null;

  // tvdb is inconsistent in arwork links
  // it may be a whole path or just relative to base
  // so we can't use string concat, have to use js URL
  return new URL(poster, IMAGE_BASE_URL).href;
}

async function login() {
  const payload = {
    apikey: env.tvdbApiKey,
  };

  const data = await requestJSON(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!data?.data?.token)
    throw new Error("TheTVDB login response did not contain a token");

  const token = data.data.token;

  await writeToCache({ TVDB_AUTH_TOKEN: token });

  return token;
}
