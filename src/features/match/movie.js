import { chooseMovie, promptMovie } from "./input.js";

import { spinner } from "../../app/spinner.js";
import { resolveTitle } from "../../shared/resolve/title.js";
import { searchMovie, searchMovieById } from "../../providers/media/index.js";

export async function autoMatchMovie(file) {
  const matches = await matchMovie(file);
  file.match = matches[0];
  file.mediaType = "movie";
}

export async function interactiveMatchMovie(file) {
  const matches = await matchMovie(file);
  file.match = await spinner.suspend(() => chooseMovie(matches, file.name));
  file.mediaType = "movie";
}

export async function guidedMatchMovie(file) {
  const value = await spinner.suspend(() => promptMovie(file.name));

  // testing for id format
  if (/^\d+$/.test(value)) {
    file.match = await searchMovieById(Number(value));
    return;
  }

  const matches = await searchMovie({ title: value });

  if (matches.length === 0) throw new Error("No match found");

  file.match = await spinner.suspend(() => chooseMovie(matches, file.name));
  file.mediaType = "movie";
}

async function matchMovie(file) {
  let matches = [];
  if (file.metadata.title)
    matches = await searchMovie(resolveTitle(file.metadata.title));

  if (matches.length > 0) return matches;

  if (!file.name) throw new Error("Either title or name is required");

  matches = await searchMovie(resolveTitle(file.name));
  if (matches.length === 0) throw new Error("No match found");

  return matches;
}
