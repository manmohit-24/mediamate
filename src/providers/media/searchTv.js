import { request } from "./request.js";

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

export async function getTvLogo(id) {
  const { logos } = await await request(`/tv/${id}/images`);

  if (!logos?.length) return null;

  return logos.sort((a, b) => {
    const languageScore = (logo) =>
      logo.iso_639_1 === "en" ? 2 : logo.iso_639_1 === null ? 1 : 0;

    const score = (logo) =>
      languageScore(logo) * 1_000_000 + logo.vote_average * 10;

    return score(b) - score(a);
  })[0].file_path;
}

export async function searchTVSeason(seriesId, season) {
  const data = await request(`/tv/${seriesId}/season/${season}`);

  return {
    id: data.id,
    title: data.name,
    season: data.season_number,
    episodes: data.episodes,
    poster: data.poster_path,
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
    poster: data.still_path,
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
    poster: show.poster_path,
  };
}
