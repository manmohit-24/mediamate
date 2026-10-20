import { tmpdir } from "node:os";
import path from "node:path";
import { writeFile, unlink } from "node:fs/promises";

import { downloadPoster } from "../../providers/media/index.js";
import { spinner } from "../../app/spinner.js";

import * as mkv from "./mkv.js";
import * as mp4 from "./mp4.js";

export async function updateMetadata(file) {
  spinner.step("Updating Media");

  let cover = null;
  let tempPath = null;

  try {
    if (file.standard.cover?.source) {
      const { filename, source } = file.standard.cover;
      const poster = await downloadPoster(source);

      tempPath = path.join(
        tmpdir(),
        `mediamate-${process.pid}-${Date.now()}-${filename}`,
      );

      await writeFile(tempPath, poster.data);

      cover = { filename, tempPath };
    }

    switch (file.extension.toLowerCase()) {
      case ".mkv":
        await mkv.updateMetadata(file.path, file.standard, cover);
        break;
      case ".mp4":
      case ".m4v":
        await mp4.updateMetadata(file.path, file.standard, cover);
        break;
      default:
        throw new Error(`Unsupported format: ${file.extension}`);
    }
  } finally {
    if (tempPath) await unlink(tempPath).catch(() => {});
  }
}
