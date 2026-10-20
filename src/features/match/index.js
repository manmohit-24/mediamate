import { parseEpisodeFilename } from "../../shared/resolve/parseEpisodeFilename.js";
import { spinner } from "../../app/spinner.js";
import {
  autoMatchMovie,
  guidedMatchMovie,
  interactiveMatchMovie,
} from "./movie.js";
import { autoMatchTV, guidedMatchTV, interactiveMatchTV } from "./tv.js";
import { chooseMediaType } from "./input.js";

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

  if (parsed) await interactiveMatchTV(file, parsed);
  else await interactiveMatchMovie(file);
}

export async function guidedMatch(file) {
  const mediaType = await chooseMediaType(["TV", "Movie"]);

  spinner.step("Finding a Match");

  if (mediaType === "TV") await guidedMatchTV(file);
  else await guidedMatchMovie(file);
}
