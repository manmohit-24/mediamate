import { parseEpisodeFilename } from "../../shared/resolve/parseEpisodeFilename.js";
import { spinner } from "../../app/spinner.js";

import { chooseMovie, chooseTV } from "./input.js";

import { resolveTitle } from "../../shared/resolve/title.js";
import { searchMovie, searchTV } from "../../providers/media/index.js";

import { attachEpisode } from "./attachEpisode.js";

export async function match(file, auto) {
  const parsed =
    parseEpisodeFilename(file.name) ??
    parseEpisodeFilename(file.metadata.title);

  spinner.step("Finding a Match");

  if (parsed) {
    file.mediaType = "tv";
    file.match = await matchTv(auto, parsed);
  } else {
    file.mediaType = "movie";
    file.match = await matchMovie(auto, file.metadata.title, file.name);
  }
}

export async function matchMovie(auto, title, fileName) {
  let matches = [];
  if (title) matches = await searchMovie(resolveTitle(title));

  if (matches.length === 0) {
    if (!fileName) throw new Error("Either title or name is required");

    matches = await searchMovie(resolveTitle(fileName));
    if (matches.length === 0) throw new Error("No match found");
  }

  if (auto) return matches[0];
  return await spinner.suspend(() => chooseMovie(matches, fileName));
}

export async function matchTv(auto, parsed) {
  const matches = await searchTV({ title: parsed.title });

  if (!matches.length) throw new Error("No TV show match found");

  let series = matches[0];

  if (!auto)
    series = await spinner.suspend(() => chooseTV(matches, parsed.fileName));

  return await attachEpisode(series, parsed);
}
