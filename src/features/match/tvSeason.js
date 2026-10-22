import { spinner } from "../../app/spinner.js";
import { parseEpisodeFilename } from "./episode.js";
import { resolveTitle } from "../../shared/resolve/title.js";
import {
  getTVSeason,
  parseEpisode,
  searchTV,
  searchTVById,
} from "../../providers/media/searchTv.js";

import { chooseTV, promptTV, promptTVSeason } from "../../shared/input/tv.js";

function extractEpisodeNumber(filename) {
  const base = filename.replace(/\.[^.]+$/, "");

  const patterns = [
    // Show.S01E06, Show_S01_E06, etc.
    /S\d{1,2}[ ._-]*E(\d{1,3})/i,

    // Show.1x06, Show 1x06, etc.
    /\b\d{1,2}x(\d{1,3})\b/i,

    // Show - 06 - Episode Title
    /-\s*(\d{1,3})\s*-/,

    // Show - 06 (number at the end)
    /-\s*(\d{1,3})$/,
  ];

  for (const pattern of patterns) {
    const match = base.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

export async function matchEpisode(file, seasonContext) {
  const episodeNumber = extractEpisodeNumber(file.name);
  if (!episodeNumber) throw new Error("No episode number found ");

  const { series, season } = seasonContext;

  const episode = season.episodes.find(
    (ep) => ep.episode_number === episodeNumber,
  );

  if (!episode)
    throw new Error(
      `Episode ${episodeNumber} not found in season ${season.season_number}`,
    );

  file.mediaType = "tv";
  file.match = {
    ...series,
    type: "tv",
    episode: parseEpisode(episode),
    title: series.title,
    release_date: episode.air_date || series.first_air_date || null,
  };
}

export async function getTvSeasonContext() {
  const value = await promptTV();

  spinner.step("Finding TV Show");

  let seasonNumber, series;

  // id format
  if (/^\d+$/.test(value)) series = await searchTVById(Number(value));
  else {
    const parsed = parseEpisodeFilename(value);
    let matches;

    if (parsed) {
      matches = await searchTV(parsed);
      seasonNumber = parsed.season;
    }

    if (!matches || !matches.length)
      matches = await searchTV(resolveTitle(value));

    if (!matches.length) throw new Error("No TV show match found");

    series = await chooseTV(matches, value);
  }

  if (!seasonNumber) seasonNumber = await promptTVSeason(folderName);

  spinner.step("Fetching Season data");

  const season = await getTVSeason(series.id, seasonNumber);
  return { series, season };
}
