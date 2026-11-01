// Only containers we can write metadata to are scanned.
export const SUPPORTED_EXTENSIONS = new Set([".mkv", ".mp4", ".m4v"]);

// Temp output of the MP4 writer; must never be picked up by a scan.
export const TEMP_MARKER = ".mediamate-tmp.";
