import { promptTitle, chooseMedia } from "./utils.js";

export async function chooseTV(matches, name) {
  return chooseMedia(
    matches,
    name,
    (item) => `${item.title} (${item.first_air_date?.slice(0, 4) ?? "----"})`,
  );
}

export async function promptTV(fileName) {
  return promptTitle(
    fileName,
    "TV show name or TMDb ID",
    "e.g. 'Breaking Bad - S01E03' or 1396",
  );
}

export async function promptTVSeasonEpisode(fileName) {
  return promptTitle(
    fileName,
    "Season and Episode (SXXEXX format ) :",
    "e.g. 'S01E03' or 1x03",
  );
}

export async function promptTVSeason(fileName) {
  return promptTitle(fileName, "Season Number :");
}
