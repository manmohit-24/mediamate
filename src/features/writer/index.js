import { tmpdir } from "node:os";
import path from "node:path";
import { writeFile, unlink } from "node:fs/promises";

import { downloadImage } from "../../api/downloadImage.js";
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
      const poster = await downloadImage(source);

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


/** Update only embedded artwork, without changing titles, tracks or timestamps. */
export async function updatePoster(file, image) {
  spinner.step("Updating Poster");

  const mime = image.mime?.split(";")[0]?.trim().toLowerCase();
  const supportedMime = new Set(["image/jpeg", "image/png"]);
  if (!supportedMime.has(mime)) {
    throw new Error(`Unsupported poster image type: ${image.mime ?? "unknown"}`);
  }

  const extension = mime === "image/png" ? "png" : "jpg";
  const filename = `cover.${extension}`;
  const tempPath = path.join(
    tmpdir(),
    `mediamate-poster-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`,
  );

  try {
    await writeFile(tempPath, image.data);
    const cover = { filename, tempPath, mime };

    switch (file.extension.toLowerCase()) {
      case ".mkv":
        await mkv.updatePoster(file.path, cover);
        break;
      case ".mp4":
      case ".m4v":
        await mp4.updatePoster(file.path, cover);
        break;
      default:
        throw new Error(`Unsupported format: ${file.extension}`);
    }
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
