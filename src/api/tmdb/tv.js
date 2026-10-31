import { request, parsePosterUrl } from "./client.js";

export async function searchTV({ title, year }) {
  const data = await request("/search/tv", {
    query: title,
    first_air_date_year: year,
  });
  return data.results.map(parseTV);
}

export async function searchTVById(id) {
  return parseTV(await request(`/tv/${id}`));
}

export async function getTVLogo(id) {
  const { logos } = await await request(`/tv/${id}/images`);

  if (!logos?.length) return null;

  const best = logos.sort((a, b) => {
    const languageScore = (logo) =>
      logo.iso_639_1 === "en" ? 2 : logo.iso_639_1 === null ? 1 : 0;

    const score = (logo) =>
      languageScore(logo) * 1_000_000 + logo.vote_average * 10;

    return score(b) - score(a);
  })[0].file_path;

  return parsePosterUrl(best);
}

export async function searchTVSeason(seriesId, season) {
  const data = await request(`/tv/${seriesId}/season/${season}`);

  const episodes = (data.episodes ?? [])
    .map(parseEpisode)
    .sort((a, b) => a.episode - b.episode);

  return {
    id: data.id,
    title: data.name,
    season: data.season_number,
    episodes: episodes,
    poster: parsePosterUrl(data.poster_path),
    air_date: data.air_date || null,
    overview: data.overview || null,
  };
}

export async function getTVEpisode(seriesId, season, episode) {
  const data = await request(
    `/tv/${seriesId}/season/${season}/episode/${episode}`,
  );

  return parseEpisode(data);
}

export function parseEpisode(data) {
  return {
    id: data.id,
    title: data.name,
    season: data.season_number,
    episode: data.episode_number,
    poster: parsePosterUrl(data.still_path),
    air_date: data.air_date || null,
    overview: data.overview || null,
  };
}

function parseTV(show) {
  return {
    type: "tv",
    id: show.id,
    title: show.name,
    first_air_date: show.first_air_date || null,
    release_date: show.first_air_date || null,
    poster: parsePosterUrl(show.poster_path),
  };
}
