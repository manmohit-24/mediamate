import { request, parsePosterUrl } from "./client.js";

export async function searchTV({ title, year }) {
  const response = await request("/search", {
    query: title,
    type: "series",
    year,
  });

  return (response.data ?? []).map(parseTV);
}

export async function searchTVById(id) {
  const response = await request(`/series/${id}/extended`);

  return parseTV(response.data);
}

export async function getTVLogo(id) {
  const [artworksResponse, typesResponse] = await Promise.all([
    request(`/series/${id}/artworks`),
    request("/artwork/types"),
  ]);

  const artworks = artworksResponse.data.artworks ?? [];
  const types = typesResponse.data ?? [];

  // Resolve artwork type IDs instead of hardcoding provider-specific IDs.
  const logoTypeIds = new Set(
    types
      .filter((type) => /logo/i.test(type.name ?? ""))
      .map((type) => type.id),
  );

  const logos = artworks.filter((artwork) => logoTypeIds.has(artwork.type));

  if (!logos.length) return null;

  const languageScore = (logo) => {
    const language = logo.language ?? logo.languageCode;

    if (language === "eng") return 2;
    if (language == null) return 1;
    return 0;
  };

  logos.sort((a, b) => {
    const score = (logo) => languageScore(logo) * 1_000_000 + (logo.score ?? 0);
    return score(b) - score(a);
  });

  return parsePosterUrl(logos[0].image) ?? null;
}

export async function searchTVSeason(seriesId, season) {
  const [seriesResponse, episodesResponse] = await Promise.all([
    request(`/series/${seriesId}/extended`),
    request(`/series/${seriesId}/episodes/default`, {
      season,
    }),
  ]);

  const series = seriesResponse.data;
  const episodeData = episodesResponse.data;

  const episodes = (episodeData?.episodes ?? [])
    .map(parseEpisode)
    .sort((a, b) => a.episode - b.episode);

  const defaultSeasonType = series.defaultSeasonType;

  const seasonInfo = (series.seasons ?? []).find((item) => {
    const number = item.number ?? item.seasonNumber;
    const typeId = item.type?.id ?? item.type;

    return (
      number === Number(season) &&
      (defaultSeasonType == null || typeId === defaultSeasonType)
    );
  });

  return {
    id: seasonInfo?.id ?? null,
    title: seasonInfo?.name ?? `Season ${season}`,
    season: Number(season),
    episodes,
    poster: parsePosterUrl(seasonInfo?.image) ?? null,
    air_date: seasonInfo?.firstAired ?? null,
    overview: seasonInfo?.overview ?? null,
  };
}

export async function getTVEpisode(seriesId, season, episode) {
  const response = await request(`/series/${seriesId}/episodes/default`, {
    season,
    episodeNumber: episode,
  });

  const episodes = response.data?.episodes ?? [];

  if (!episodes.length) return null;

  return parseEpisode(episodes[0]);
}

export function parseEpisode(data) {
  return {
    id: data.id,
    title: data.name ?? data.episodeName ?? null,
    season: data.airedSeason ?? data.seasonNumber ?? null,
    episode:
      data.airedEpisodeNumber ?? data.number ?? data.episodeNumber ?? null,
    poster: parsePosterUrl(data.image) ?? null,
    air_date: data.firstAired ?? data.aired ?? null,
    overview: data.overview || null,
  };
}

function parseTV(show) {
  return {
    type: "tv",
    id: show.tvdb_id ?? show.id,
    title: show.name,
    first_air_date: show.first_air_time ?? null,
    release_date: show.first_air_time ?? null,
    poster: parsePosterUrl(show.image) ?? null,
  };
}

export async function getAllTVEpisodes(id) {
  const response = await request(`/series/${id}/extended`);
  const series = response.data;
  const defaultSeasonType = series.defaultSeasonType;
  const seasons = (series.seasons ?? []).filter((item) => {
    const number = item.number ?? item.seasonNumber;
    const typeId = item.type?.id ?? item.type;
    return (
      number != null &&
      number >= 0 &&
      (defaultSeasonType == null || typeId === defaultSeasonType)
    );
  });

  const results = await Promise.all(
    seasons.map((season) =>
      searchTVSeason(id, season.number ?? season.seasonNumber).catch(
        () => null,
      ),
    ),
  );

  return results.flatMap((season) => season?.episodes ?? []);
}
