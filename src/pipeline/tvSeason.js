import { wrap } from "./wrap.js";
import { shutdown } from "../app/shutdown.js";
import { renameFile } from "../features/rename/rename.js";
import { readMetadata } from "../features/metadata/read.js";
import { addStandardMeta } from "../features/standardize/standardize.js";
import { updateMetadata } from "../features/writer/index.js";
import { updateTvSeasonFolder } from "../folder/index.js";
import { updateTimestamps } from "../features/timestamps/timestamps.js";
import {
  getTvSeasonContext,
  matchEpisode,
} from "../features/match/tvSeason.js";
import { logger } from "../shared/logger.js";
import { getLogo } from "../providers/media/searchTv.js";

export async function tvSeason(files, config) {
  let seasonContext;

  try {
    seasonContext = await getTvSeasonContext("Current Folder");
  } catch (error) {
    logger.error("Error occured while fetching season/tv-show");
    logger.muted(`    ${error.message}`);

    return;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await wrap({ file, i, total: files.length }, async () => {
      await readMetadata(file);

      await matchEpisode(file, seasonContext);

      await addStandardMeta(file);

      await shutdown.critical(async () => {
        await updateMetadata(file);

        await renameFile(file);

        await updateTimestamps(file);
      });
    });
  }

  try {
    const foldername = `${seasonContext.series.title} - ${seasonContext.season.title}`;
    const logoUrl = await getLogo(seasonContext.series.id);

    await updateTvSeasonFolder(
      config.path,
      foldername,
      seasonContext.season.poster,
      logoUrl,
    );
  } catch (error) {
    logger.error("Error occured while updating folder");
    logger.muted(`    ${error.message}`);

    return;
  }
}
