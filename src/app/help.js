import { logger } from "../shared/logger.js";
import { appConfig } from "./config.js";

const GLOBAL_HELP = `
Usage:
  mediamate <mode> [options] <path>

Modes:
  clean                 Automatically clean media files
  guided                Interactively select the correct media
  tv-season             Process episodes from a single TV season
  poster                Update embedded posters for movies and episodes
  folder                Update folder name and icon

Options:
  -r, --recursive       Scan directories recursively
  -a, --auto            Automatically select the best match (clean mode)
  -g, --guided          Interactively select poster matches
      --tv-season       Process a TV season as a group (poster mode)
      --provider <name> TV metadata provider: tmdb (default) or tvdb
  -h, --help            Show this help message

Examples:
  mediamate clean movie.mkv
  mediamate clean Movies/ --recursive
  mediamate guided movie.mkv
  mediamate tv-season "Pokemon Indigo"/
  mediamate poster "Interstellar (2014).mkv"
  mediamate poster "Interstellar (2014).mkv" --guided
  mediamate poster "Ben 10 - S04E06 - Ready to Rumble.mkv"
  mediamate poster "Season 4/" --tv-season
  mediamate poster Movies/ --recursive
`;

const MODE_HELP = {
  clean: `
Usage:
  mediamate clean [options] <path>

Description:
  Match media and clean metadata, names and timestamps.

Options:
  -r, --recursive       Scan directories recursively
  -a, --auto            Automatically select the best match
      --provider <name> TV metadata provider: tmdb (default) or tvdb
  -h, --help            Show this help message
`,
  guided: `
Usage:
  mediamate guided [options] <path>

Description:
  Interactively select the correct metadata match for each media file.

Options:
  -r, --recursive       Scan directories recursively
      --provider <name> TV metadata provider: tmdb (default) or tvdb
  -h, --help            Show this help message
`,
  "tv-season": `
Usage:
  mediamate tv-season <path>

Description:
  Process episodes from a single TV season in bulk.
  Select the show and season once, then match files by episode number.
`,
  poster: `
Usage:
  mediamate poster [options] <path>

Description:
  Update embedded artwork only. Existing names and metadata are left unchanged.
  Automatic matching is the default; ambiguous matches prompt for selection.

Options:
  -r, --recursive       Scan directories recursively
  -g, --guided          Always prompt for the matching movie/show
      --tv-season       Process one TV season as a group (shared API fetches)
      --provider <name> TV metadata provider: tmdb (default) or tvdb
  -h, --help            Show this help message

Examples:
  mediamate poster "Interstellar (2014).mkv"
  mediamate poster "Interstellar (2014).mkv" --guided
  mediamate poster "Ben 10 - S04E06 - Ready to Rumble.mkv"
  mediamate poster "Season 4/" --tv-season
  mediamate poster Shows/ --recursive
`,
  folder: `
Usage:
  mediamate folder <path>

Description:
  Generate a suitable folder icon and update the folder name.
`,
};

export function showHelp(mode = null) {
  logger.divider();
  logger.title(appConfig.appName);
  if (mode && MODE_HELP[mode]) logger.text(MODE_HELP[mode].trim());
  else logger.text(GLOBAL_HELP.trim());
  logger.divider();
}
