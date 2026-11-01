import * as tmdb from "./tmdb/tv.js";
import * as tvdb from "./tvdb/tv.js";

let provider = "tmdb";
const seriesByKey = new Map();

export function setTVProviders({ metadata = "tmdb" } = {}) {
  provider = metadata;
  seriesByKey.clear();
}

const api = () => (provider === "tvdb" ? tvdb : tmdb);

function remember(series) {
  if (series?.id != null) seriesByKey.set(String(series.id), series);
  return series;
}

export async function searchTV(options) {
  return (await api().searchTV(options)).map(remember);
}

export async function searchTVById(id) {
  return remember(await api().searchTVById(id));
}

export async function searchTVSeason(seriesId, seasonNumber) {
  return api().searchTVSeason(seriesId, seasonNumber);
}

export async function getTVEpisode(seriesId, seasonNumber, episodeNumber) {
  return api().getTVEpisode(seriesId, seasonNumber, episodeNumber);
}

export async function getTVLogo(id) {
  return api().getTVLogo(id);
}

export async function getAllTVEpisodes(id) {
  return api().getAllTVEpisodes(id);
}
