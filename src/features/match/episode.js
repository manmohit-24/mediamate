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

export function parseEpisodeFilename(fileName) {
  const base = fileName.replace(/\.[^.]+$/, "");

  const patterns = [
    // Show.S01E03, Show_S01_E03, Show S01E03, etc.
    /^(.*?)S(\d{1,2})[ ._-]*E(\d{1,3})(?:[ ._-]*E(\d{1,3}))?/i,

    // Show.1x03, Show_1x03, Show 1x03, etc.
    /^(.*?)[ ._-](\d{1,2})x(\d{1,3})\b/i,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = base.match(patterns[i]);
    if (!match) continue;

    const title = cleanSeriesTitle(match[1]);
    if (!title) continue;

    return {
      title,
      season: Number(match[2]),
      episode: Number(match[3]),
      episodeEnd: match[4] ? Number(match[4]) : null,
      fileName: fileName,
    };
  }

  return null;
}

function cleanSeriesTitle(value) {
  return value
    .replace(/[._]+/g, " ")
    .replace(/[ -]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}
