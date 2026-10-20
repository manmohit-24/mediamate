import { getTVEpisode } from "../../providers/media/index.js";

export async function attachEpisode(series, parsed) {
  if (!parsed)
    throw new Error(
      "TV filename must contain SxxExx or NxNN (for example S02E03)",
    );

  const episode = await getTVEpisode(series.id, parsed.season, parsed.episode);

  return {
    ...series,
    type: "tv",
    episode,
    title: series.title,
    release_date: episode.air_date || series.first_air_date || null,
  };
}
