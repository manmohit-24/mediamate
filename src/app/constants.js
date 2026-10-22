export const MODES = {
  clean: "clean",
  guided: "guided",
  "tv-season": "tv-season",
  folder: "folder",
};

export const FLAGS = {
  "-r": "recursive",
  "--recursive": "recursive",
  "-a": "auto",
  "--auto": "auto",
  "-h": "help",
  "--help": "help",
};

// Only formats with a metadata writer should be scanned.
export const SUPPORTED_EXTENSIONS = new Set([".mkv", ".mp4", ".m4v"]);
