import {
  chooseMediaType,
  chooseMovie,
  chooseTV,
  promptMovie,
  promptTV,
  promptTVEpisode,
} from "./input.js";
import { parseEpisodeFilename, attachEpisode } from "./episode.js";

import {
  searchTV,
  searchTVById,
  searchMovie,
  searchMovieById,
} from "../../providers/media/index.js";

import { spinner } from "../../app/spinner.js";

export async function guidedMatch(file) {
  const mediaType = await chooseMediaType(["TV", "Movie"]);

  spinner.step("Finding a Match");

  if (mediaType === "TV") {
    file.mediaType = "tv";
    file.match = await guidedMatchTV(file.name);
  } else {
    file.mediaType = "movie";
    file.match = await guidedMatchMovie(file.name);
  }
}

// test for id format
const isIdFormat = (value) => /^\d+$/.test(value);

// movies
async function guidedMatchMovie(fileName) {
  const value = await spinner.suspend(() => promptMovie(fileName));

  if (isIdFormat(value)) return await searchMovieById(Number(value));

  const matches = await searchMovie({ title: value });

  if (matches.length === 0) throw new Error("No match found");

  return await spinner.suspend(() => chooseMovie(matches, fileName));
}

// tv shows
async function guidedMatchTV(fileName) {
  const value = await spinner.suspend(() => promptTV(fileName));

  let parsed, series;

  if (isIdFormat(value)) series = await searchTVById(Number(value));
  else {
    parsed = parseEpisodeFilename(value);

    let matches;
    if (parsed) matches = await searchTV({ title: parsed.title });

    if (!matches || !matches.length) matches = await searchTV({ title: value });

    if (!matches.length) throw new Error("No TV show match found");

    series = await spinner.suspend(() => chooseTV(matches, fileName));
  }

  if (!parsed) {
    const val = await spinner.suspend(() => promptTVEpisode(fileName));
    parsed = parseEpisodeFilename(series.title + "-" + val);
  }

  return await attachEpisode(series, parsed);
}
