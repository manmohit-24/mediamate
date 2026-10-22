import { choose } from "../../shared/input/utils.js";
import { promptMovie, chooseMovie } from "../../shared/input/movie.js";
import {
  chooseTV,
  promptTV,
  promptTVSeasonEpisode,
} from "../../shared/input/tv.js";

import { parseEpisodeFilename, attachEpisode } from "./episode.js";

import {
  searchTV,
  searchTVById,
  searchMovie,
  searchMovieById,
} from "../../providers/media/index.js";

import { spinner } from "../../app/spinner.js";

export async function guidedMatch(file) {
  const mediaType = await choose(
    "Is it a Movie or TV-Show ?",
    ["TV", "Movie"],
    false,
  );

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
  const value = await promptMovie(fileName);

  if (isIdFormat(value)) return await searchMovieById(Number(value));

  const matches = await searchMovie({ title: value });

  if (matches.length === 0) throw new Error("No match found");

  return await chooseMovie(matches, fileName);
}

// tv shows
async function guidedMatchTV(fileName) {
  const value = await promptTV(fileName);

  let parsed, series;

  if (isIdFormat(value)) series = await searchTVById(Number(value));
  else {
    parsed = parseEpisodeFilename(value);

    let matches;
    if (parsed) matches = await searchTV({ title: parsed.title });

    if (!matches || !matches.length) matches = await searchTV({ title: value });

    if (!matches.length) throw new Error("No TV show match found");

    series = await chooseTV(matches, fileName);
  }

  if (!parsed) {
    const val = await promptTVSeasonEpisode(fileName);
    parsed = parseEpisodeFilename(series.title + "-" + val);
  }

  return await attachEpisode(series, parsed);
}
