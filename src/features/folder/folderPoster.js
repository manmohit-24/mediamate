import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { exists } from "../../shared/exists.js";
import { downloadPoster } from "../../providers/media/index.js";
import { writeFile } from "node:fs/promises";
import { spinner } from "../../app/spinner.js";

export async function generatePosters(folderPath, posterUrl, logoUrl) {
  const posterPath = path.join(folderPath, ".poster.png");
  const poster = await downloadPoster(posterUrl);

  await writeFile(posterPath, poster.data);

  let logoPath = null;

  if (logoUrl) {
    logoPath = path.join(folderPath, ".logo.png");
    const logo = await downloadPoster(logoUrl);
    writeFile(logoPath, logo.data);
  }

  const iconPath = await renderFolderPosters(folderPath, posterPath, logoPath);

  return { posterPath, logoPath, iconPath };
}

export async function renderFolderPosters(folderPath, posterPath, logoPath) {
  spinner.step("Generating icon");

  const outputPath = path.join(folderPath, ".icon.png");

  await render({
    poster: posterPath,
    logo: logoPath,
    output: outputPath,
  });

  return outputPath;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "assets");
const IMAGEMAGIC = "magick";

async function render({
  poster,
  logo,
  output,

  iconSizes = "256,128,96,64,48,32,16",
} = {}) {
  if (!poster || !output)
    throw new Error("Both input and output paths are required.");

  poster = path.resolve(poster);
  logo = logo ? path.resolve(logo) : null;
  output = path.resolve(output);

  if (!exists(poster)) throw new Error(`poster not found: ${poster}`);
  const required = [
    "- canvas.png",
    "foldervertical-main.png",
    "foldervertical-mainfx.png",
    "foldervertical-side.png",
    "foldervertical-sidefx.png",
    "foldervertical-sideshadow.png",
  ];
  for (const name of required) {
    if (!exists(path.join(ASSETS_DIR, name)))
      throw new Error(`Missing template asset: ${path.join(ASSETS_DIR, name)}`);
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });

  const A = (name) => path.join(ASSETS_DIR, name);
  const args = [];

  // LAYER-BASE / CODE-BACKGROUND
  args.push(
    "(",
    A("- canvas.png"),
    "-scale",
    "512x512!",
    "-background",
    "none",
    "-extent",
    "512x512",
    ")",
    "-compose",
    "Over",
  );

  // LAYER-BASE / CODE-POSTER-SIDE
  args.push(
    "(",
    poster,
    "-scale",
    "512x512!",
    "-blur",
    "0x19",
    A("foldervertical-side.png"),
    ")",
    "-compose",
    "over",
    "-composite",
    "(",
    A("foldervertical-sidefx.png"),
    "-scale",
    "512x512!",
    ")",
    "-compose",
    "over",
    "-composite",
  );

  // LAYER-LOGO: -trim +repage -scale 160x50 -gravity center
  // -geometry +190-114 -rotate 90
  if (logo) {
    args.push(
      "(",
      logo,
      "-trim",
      "+repage",
      "-scale",
      "160x50",
      "-background",
      "none",
      "-gravity",
      "center",
      "-geometry",
      "+190-114",
      "-rotate",
      "90",
      ")",
      "-compose",
      "Over",
      "-composite",
    );
  }

  // LAYER-BASE / CODE-POSTER-SIDE-SHADOW
  args.push(
    "(",
    A("foldervertical-sideshadow.png"),
    "-scale",
    "512x512!",
    ")",
    "-compose",
    "over",
    "-composite",
  );

  // LAYER-BASE / CODE-POSTER-MAIN
  args.push(
    "(",
    poster,
    "-scale",
    "346x490!",
    "-gravity",
    "Northwest",
    "-geometry",
    "+70+14",
    A("foldervertical-main.png"),
    ")",
    "-compose",
    "over",
    "-composite",
    "(",
    A("foldervertical-mainfx.png"),
    "-scale",
    "512x512!",
    ")",
    "-compose",
    "over",
    "-composite",
  );

  // Original template asks ImageMagick to resize icon outputs. ICO-specific
  // output options are only added for .ico output.
  if (path.extname(output).toLowerCase() === ".ico" && iconSizes) {
    args.push("-define", `icon:auto-resize=${iconSizes}`);
  }
  args.push(output);

  await new Promise((resolve, reject) => {
    const child = spawn(IMAGEMAGIC, args, { stdio: "inherit" });
    child.once("error", (err) =>
      reject(
        new Error(
          `Could not launch "${IMAGEMAGIC}". Install ImageMagick or pass --magick /path/to/magick. ${err.message}`,
        ),
      ),
    );
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ImageMagick exited with code ${code}.`)),
    );
  });
}
