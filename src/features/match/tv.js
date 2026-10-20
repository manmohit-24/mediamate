import { chooseTV, promptTV, promptTVEpisode } from "./input.js";
import { spinner } from "../../app/spinner.js";
import { resolveTitle } from "../../shared/resolve/title.js";
import {
  searchTV,
  searchTVById,
  getTVEpisode,
} from "../../providers/media/index.js";

import { parseEpisodeFilename } from "../../shared/resolve/parseEpisodeFilename.js";

export async function autoMatchTV(file, parsed) {
  let matches = await matchTv(
    parsed,
    resolveTitle(file.metadata.title || file.name),
  );

  file.mediaType = "tv";
  file.match = await attachEpisode(matches[0], parsed);
}

export async function interactiveMatchTV(file, parsed) {
  let matches = await matchTv(
    parsed,
    resolveTitle(file.metadata.title || file.name),
  );

  const series = await spinner.suspend(() => chooseTV(matches, file.name));

  file.mediaType = "tv";
  file.match = await attachEpisode(series, parsed);
}

export async function guidedMatchTV(file) {
  const value = await spinner.suspend(() => promptTV(file.name));

  let parsed;

  let series;
  if (/^\d+$/.test(value)) series = await searchTVById(Number(value));
  else {
    parsed == parseEpisodeFilename(value);
    const matches = await matchTv(parsed, value);
    series = await spinner.suspend(() => chooseTV(matches, file.name));
  }

  if (!parsed) {
    const val = await spinner.suspend(() => promptTVEpisode(file.name));
    parsed = parseEpisodeFilename(series.title + "-" + val);
  }

  file.mediaType = "tv";
  file.match = await attachEpisode(series, parsed);
}

async function matchTv(parsed, title) {
  let matches = [];
  if (parsed) matches = await searchTV({ title: parsed.title });

  if (!matches || !matches.length) matches = await searchTV({ title });

  if (!matches.length) throw new Error("No TV show match found");

  return matches;
}

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
