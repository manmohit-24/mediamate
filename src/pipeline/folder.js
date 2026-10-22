import { shutdown } from "../app/shutdown.js";

import { updateTvSeasonFolder } from "../features/folder/index.js";
import { getTvSeries } from "../features/match/tvSeason.js";

import { logger } from "../shared/logger.js";
import { getLogo, searchTVSeason } from "../providers/media/searchTv.js";
import { promptTVSeason } from "../shared/input/tv.js";
import { spinner } from "../app/spinner.js";
import { choose } from "../shared/input/utils.js";

export async function folder(config) {
  try {
    const mediaType = await choose(
      "Is it a Movie or TV-Show ?",
      ["TV", "Movie"],
      false,
    );
    let foldername, posterUrl, logoUrl;

    if (mediaType === "TV") {
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

      logoUrl = await getLogo(series.id);
    } else {
      return;
    }

    await updateTvSeasonFolder(config.path, foldername, posterUrl, logoUrl);
  } catch (error) {
    logger.error("Error occured while processing folder");
    logger.muted(`    ${error.message}`);
  }
}
