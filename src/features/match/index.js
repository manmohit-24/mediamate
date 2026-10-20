import { parseEpisodeFilename } from "../../shared/resolve/parseEpisodeFilename.js";
import { spinner } from "../../app/spinner.js";
import {
  autoMatchMovie,
  guidedMatchMovie,
  interactiveMatchMovie,
} from "./movie.js";
import { autoMatchTV, guidedMatchTV, interactiveMatchTV } from "./tv.js";

export async function autoMatch(file) {
  const parsed =
    parseEpisodeFilename(file.name) ?? parseEpisodeFilename(file.title);
  spinner.step("Finding a Match");
  if (parsed) await autoMatchTV(file, parsed);
  else await autoMatchMovie(file);
}

export async function interactiveMatch(file) {
  const parsed =
    parseEpisodeFilename(file.name) ?? parseEpisodeFilename(file.title);
  spinner.step("Finding a Match");
  console.log(parsed);

  if (parsed) await interactiveMatchTV(file, parsed);
  else await interactiveMatchMovie(file);
}

export async function guidedMatch(file) {
  const parsed =
    parseEpisodeFilename(file.name) ?? parseEpisodeFilename(file.title);

  spinner.step("Finding a Match");

  if (parsed) await guidedMatchTV(file, parsed);
  else await guidedMatchMovie(file);
}
