import { spinner } from "../app/spinner.js";
import { stat, utimes } from "node:fs/promises";
import { logger } from "../shared/logger.js";
import { wrap } from "./wrap.js";
import { createCache } from "../features/cache.js";
import { matchPosterFile, getPosterSeasonContext, matchEpisode } from "../features/poster/match.js";
import { downloadImage } from "../api/downloadImage.js";
import { updatePoster } from "../features/writer/index.js";

export async function poster(files, config) {
  const cache = createCache();
  let seasonContext = null;

  if (config.tvSeason) {
    try {
      seasonContext = await getPosterSeasonContext(files, { guided: config.guided, cache });
    } catch (error) {
      logger.error(`Could not prepare TV season: ${error.message}`);
      return;
    }
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await wrap({ file, i, total: files.length }, async () => {
      let match;
      if (seasonContext) {
        const parsed = seasonContext.parsedFiles[i].parsed;
        const episode = matchEpisode(seasonContext.season.episodes ?? [], file.name, parsed.episode);
        if (!episode) throw new Error(`Could not match episode ${parsed.episode} in '${seasonContext.series.title}'`);
        match = { title: `${seasonContext.series.title} — ${episode.title}`, image: episode.poster };
      } else {
        match = await matchPosterFile(file, { guided: config.guided, cache });
      }

      if (!match.image) throw new Error(`No poster artwork available for ${match.title}`);
      const image = await cache.getOrFetch(`image:${match.image}`, () => downloadImage(match.image));
      const originalStat = await stat(file.path);
      await updatePoster(file, image);
      await utimes(file.path, originalStat.atime, originalStat.mtime);
      logger.info(`Poster updated: ${match.title}`);
    });
  }

  cache.clear();
}
