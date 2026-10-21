import { logger } from "../shared/logger.js";
import { appConfig } from "./config.js";

const GLOBAL_HELP = `
Usage:
  mediamate <mode> [options] <path>

Modes:
  clean                 Automatically clean media files
  guided                Interactively select the correct media
  tv-season             Process episodes from a single TV season

Options:
  -r, --recursive       Scan directories recursively
  -a, --auto            Automatically select the best match
  -h, --help            Show this help message

Examples:
  mediamate clean movie.mkv
  mediamate clean Movies/ --recursive
  mediamate guided movie.mkv
  mediamate guided Movies/ --recursive
  mediamate tv-season "Pokemon Indigo"/
`;

const MODE_HELP = {
  clean: `
Usage:
  mediamate clean [options] <path>

Description:
  Automatically extract metadata from files, match media using TMDb, and clean their metadata.

Options:
  -r, --recursive       Scan directories recursively
  -a, --auto            Automatically select the best match
  -h, --help            Show this help message

Examples:
  mediamate clean movie.mkv
  mediamate clean Movies/ --recursive
`,

  guided: `
Usage:
  mediamate guided [options] <path>

Description:
  Interactively select the correct metadata match for each media file.

Options:
  -r, --recursive       Scan directories recursively
  -h, --help            Show this help message

Examples:
  mediamate guided movie.mkv
  mediamate guided Movies/ --recursive
`,

  "tv-season": `
Usage:
  mediamate tv-season [options] <path>

Description:
  Process episodes from a single TV season in bulk.
  Select the TV show and season once, then match each file
  to its episode using the episode number in its filename.

  All files in the selected folder should belong to the same
  TV show and season.

Options:
  -h, --help            Show this help message

Examples:
  mediamate tv-season "Pokemon Indigo"/
  mediamate tv-season "Ben 10 Season 1"/
`,
};

export function showHelp(mode = null) {
  logger.divider();

  logger.title(appConfig.appName);

  if (mode && MODE_HELP[mode]) logger.text(MODE_HELP[mode].trim());
  else logger.text(GLOBAL_HELP.trim());

  logger.divider();
}
