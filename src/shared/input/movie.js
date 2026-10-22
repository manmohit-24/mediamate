import { promptTitle, chooseMedia } from "./utils.js";

export async function chooseMovie(matches, name) {
  return chooseMedia(
    matches,
    name,
    (item) => `${item.title} (${item.release_date?.slice(0, 4) ?? "----"})`,
    "movie",
  );
}

export async function promptMovie(fileName) {
  return promptTitle(
    fileName,
    "Movie name or TMDb ID",
    "e.g. Interstellar or 157336",
  );
}
