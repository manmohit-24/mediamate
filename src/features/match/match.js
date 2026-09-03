import { chooseMovie, promptMovie } from "./input.js";

import { spinner } from "../../app/spinner.js";
import { resolveTitle } from "../../shared/resolve/title.js";
import { searchMovie, searchMovieById } from "../../providers/media/index.js";

export async function guidedMatchMovie(file) {
  const value = await spinner.suspend(() => promptMovie(file.name));
  spinner.step("Finding a Match");

  // testing for id format
  if (/^\d+$/.test(value)) {
    file.match = await searchMovieById(Number(value));
    return;
  }

  const matches = await searchMovie({ title: value });

  if (matches.length === 0) throw new Error("No match found");

  file.match = await spinner.suspend(() => chooseMovie(matches, file.name));
}

export async function autoMatchMovie(file) {
  spinner.step("Finding a Match");
  const matches = await match(file);
  file.match = matches[0];
}

export async function interactiveMatchMovie(file) {
  spinner.step("Finding a Match");
  const matches = await match(file);
  file.match = await spinner.suspend(() => chooseMovie(matches, file.name));
}

async function match(file) {
  let matches = await searchMovie(resolveTitle(file.metadata.title));

  if (matches.length > 0) return matches;

  matches = await searchMovie(resolveTitle(file.name));
  if (matches.length === 0) throw new Error("No match found");

  return matches;
}
