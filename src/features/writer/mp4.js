import { execute } from "../../shared/execute.js";

/**
 * Remux MP4/M4V without re-encoding. FFmpeg writes standard MP4 title/date
 * tags and stream titles; cover art is embedded as an attached-picture stream.
 */
export async function updateMetadata(filePath, standard, cover) {
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", filePath];
  if (cover) args.push("-i", cover.tempPath);
  args.push("-map", "0");
  // Avoid accumulating old embedded cover images when running MediaMate again.
  if (cover) args.push("-map", "-0:v:disp:attached_pic", "-map", "1:0");
  args.push("-map_metadata", "0", "-c", "copy");
  args.push("-metadata", `title=${standard.title}`);
  if (standard.release_date)
    args.push("-metadata", `date=${standard.release_date}`);
  for (const track of standard.audio || []) {
    // MediaInfo IDs are container-specific, so use audio stream order for FFmpeg metadata.
    args.push(
      `-metadata:s:a:${(standard.audio || []).indexOf(track)}`,
      `title=${track.name}`,
    );
  }
  for (const track of standard.subtitles || []) {
    args.push(
      `-metadata:s:s:${(standard.subtitles || []).indexOf(track)}`,
      `title=${track.name}`,
    );
  }
  if (cover) {
    const index = 1; // first mapped video is normally the movie; second is the cover image
    args.push(
      `-disposition:v:${index}`,
      "attached_pic",
      `-metadata:s:v:${index}`,
      "title=Cover",
    );
  }
  args.push("-f", "mp4", tempOutputPath(filePath));
  const output = args[args.length - 1];
  try {
    await execute("ffmpeg", args);
    const { rename } = await import("node:fs/promises");
    await rename(output, filePath);
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    await unlink(output).catch(() => {});
    throw new Error(
      `Could not update MP4 metadata with ffmpeg: ${error.message}`,
    );
  }
}

function tempOutputPath(filePath) {
  // Same directory keeps the final replacement on the same filesystem.
  return `${filePath}.mediamate-tmp.mp4`;
}
