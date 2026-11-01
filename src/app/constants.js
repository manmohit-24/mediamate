export const MODES = {
  clean: "clean",
  guided: "guided",
  "tv-season": "tv-season",
  folder: "folder",
  poster: "poster",
};

export const FLAGS = {
  "-r": "recursive",
  "--recursive": "recursive",
  "-a": "auto",
  "--auto": "auto",
  "-g": "guided",
  "--guided": "guided",
  "--tv-season": "tvSeason",
  "-h": "help",
  "--help": "help",
};

// Only formats with a metadata writer should be scanned.
export const SUPPORTED_EXTENSIONS = new Set([".mkv", ".mp4", ".m4v"]);
