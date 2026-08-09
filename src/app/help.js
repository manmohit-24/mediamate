import { logger } from "../shared/logger.js";
import { appConfig } from "./config.js";

const GLOBAL_HELP = `
Usage:
  mediamate <mode> [options] <path>

Modes:
  clean                 Automatically clean media files
  guided                Interactively select the correct media

Options:
  -r, --recursive       Scan directories recursively
  -a, --auto            Automatically select the best match
  -h, --help            Show this help message

Examples:
  mediamate clean movie.mkv
  mediamate clean Movies/ --recursive
  mediamate guided movie.mkv
  mediamate guided Movies/ --recursive
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
};

export function showHelp(mode = null) {
  logger.divider();

  logger.title(appConfig.appName);

  if (mode && MODE_HELP[mode]) {
    logger.text(MODE_HELP[mode].trim());
  } else {
    logger.text(GLOBAL_HELP.trim());
  }

  logger.divider();
}
