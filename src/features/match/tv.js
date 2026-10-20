import { chooseTV, promptTV } from "./input.js";
import { spinner } from "../../app/spinner.js";
import { resolveTitle } from "../../shared/resolve/title.js";
import {
  searchTV,
  searchTVById,
  getTVEpisode,
} from "../../providers/media/index.js";

export async function autoMatchTV(file, parsed) {
  let matches = await searchTV({ title: parsed.title });

  if (!matches.length)
    matches = await searchTV(resolveTitle(file.metadata.title || file.name));

  if (!matches.length) throw new Error("No TV show match found");

  file.mediaType = "tv";
  file.match = await attachEpisode(matches[0], parsed);
}

export async function interactiveMatchTV(file, parsed) {
  let matches = await searchTV({ title: parsed.title });

  if (!matches.length)
    matches = await searchTV(resolveTitle(file.metadata.title || file.name));

  if (!matches.length) throw new Error("No TV show match found");

  const series = await spinner.suspend(() => chooseTV(matches, file.name));

  file.mediaType = "tv";
  file.match = await attachEpisode(series, parsed);
}

export async function guidedMatchTV(file, parsed) {
  const value = await spinner.suspend(() => promptTV(file.name));

  let series;
  if (/^\d+$/.test(value)) series = await searchTVById(Number(value));
  else {
    const matches = await searchTV(resolveTitle(value));
    if (!matches.length) throw new Error("No TV show match found");
    series = await spinner.suspend(() => chooseTV(matches, file.name));
  }

  file.mediaType = "tv";
  file.match = await attachEpisode(series, parsed);
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
