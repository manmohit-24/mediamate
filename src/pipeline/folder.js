import { shutdown } from "../app/shutdown.js";

import { updateTvSeasonFolder } from "../features/folder/index.js";
import { getTvSeries } from "../features/match/tvSeason.js";

import { logger } from "../shared/logger.js";
import { getTvLogo, searchTVSeason } from "../providers/media/searchTv.js";
import { promptTVSeason } from "../shared/input/tv.js";
import { spinner } from "../app/spinner.js";
import { choose, chooseMedia, prompt } from "../shared/input/utils.js";
import { guidedMatchMovie } from "../features/match/guided.js";
import {
  getMovieLogo,
  searchFranchise,
} from "../providers/media/searchMovie.js";

export async function folder(config) {
  try {
    const folderType = await choose(
      "What does this folder contains ?",
      ["TV", "Movie", "Franchise"],
      false,
    );
    let foldername, posterUrl, logoUrl;

    if (folderType === "TV") {
      let { series, seasonNumber } = await getTvSeries();

      if (!seasonNumber) {
        try {
          seasonNumber = await promptTVSeason(series.title);
        } catch (error) {
          logger.info("No Season Selected, working as series directory");
        }
      }

      if (seasonNumber) {
        spinner.step("Fetching Season data");
        const season = await searchTVSeason(series.id, seasonNumber);
        foldername = season.title;
        posterUrl = season.poster;
      } else {
        foldername = series.title;
        posterUrl = series.poster;
      }

      logoUrl = await getTvLogo(series.id);
    } else if (folderType === "Movie") {
      const movie = await guidedMatchMovie();
      foldername = movie.title;
      posterUrl = movie.poster;
      logoUrl = await getMovieLogo(movie.id);
    } else {
      const input = await prompt("Name of Franchise :");
      const matches = await searchFranchise({ title: input });
      const franchise = await chooseMedia(matches, input, (item) => item.title);

      foldername = franchise.title;
      posterUrl = franchise.poster;
    }

    await updateTvSeasonFolder(config.path, foldername, posterUrl, logoUrl);
  } catch (error) {
    logger.error("Error occured while processing folder");
    logger.muted(`    ${error.message}`);
  }
}
