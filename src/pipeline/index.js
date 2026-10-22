import { clean } from "./clean.js";
import { guided } from "./guided.js";

import { MODES } from "../app/constants.js";
import { tvSeason } from "./tvSeason.js";
import { folder } from "./folder.js";

export async function runPipeline(files, config) {
  switch (config.mode) {
    case MODES.clean:
      await clean(files, config);
      break;
    case MODES.guided:
      await guided(files, config);
      break;
    case MODES["tv-season"]:
      await tvSeason(files, config);
      break;
    case MODES.folder:
      await folder(config);
      break;
    default:
      throw new Error(`'${config.mode}' is not a valid mode`);
  }
}
