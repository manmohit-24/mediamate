import { tmdb } from "./tmdb.js";
import { tvdb } from "./tvdb.js";

/**
 * Movies and franchises always use TMDb; the TV provider is selectable.
 * Every provider returns the same normalized shapes:
 *   movie   { kind, id, title, year, releaseDate, poster }
 *   series  { kind, id, title, year, firstAirDate, poster }
 *   season  { number, title, poster, episodes: [{ id, title, season, number, airDate, poster }] }
 */
export function createProviders({ tv = "tmdb" } = {}) {
    return { movie: tmdb, tv: tv === "tvdb" ? tvdb : tmdb };
}
