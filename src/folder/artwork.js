import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exists } from "../util/exists.js";
import { execute } from "../util/execute.js";

const ASSETS_DIR = fileURLToPath(new URL("./assets/", import.meta.url));

const REQUIRED_ASSETS = [
    "- canvas.png",
    "foldervertical-main.png",
    "foldervertical-mainfx.png",
    "foldervertical-side.png",
    "foldervertical-sidefx.png",
    "foldervertical-sideshadow.png",
];

const asset = (name) => path.join(ASSETS_DIR, name);

/** Compose the vertical "folder with poster (and logo)" icon with ImageMagick. */
export async function renderFolderIcon({ poster, logo = null, output }) {
    poster = path.resolve(poster);
    output = path.resolve(output);
    logo = logo ? path.resolve(logo) : null;

    if (!(await exists(poster))) throw new Error(`Poster not found: ${poster}`);
    for (const name of REQUIRED_ASSETS) {
        if (!(await exists(asset(name)))) throw new Error(`Missing template asset: ${asset(name)}`);
    }

    await mkdir(path.dirname(output), { recursive: true });

    const args = [];

    // Base canvas
    args.push(
        "(",
        asset("- canvas.png"),
        "-scale",
        "512x512!",
        "-background",
        "none",
        "-extent",
        "512x512",
        ")",
        "-compose",
        "Over"
    );

    // Blurred poster on the side, plus its effects
    args.push(
        "(",
        poster,
        "-scale",
        "512x512!",
        "-blur",
        "0x19",
        asset("foldervertical-side.png"),
        ")",
        "-compose",
        "over",
        "-composite",
        "(",
        asset("foldervertical-sidefx.png"),
        "-scale",
        "512x512!",
        ")",
        "-compose",
        "over",
        "-composite"
    );

    // Logo on the spine
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
            "-composite"
        );
    }

    // Side shadow
    args.push(
        "(",
        asset("foldervertical-sideshadow.png"),
        "-scale",
        "512x512!",
        ")",
        "-compose",
        "over",
        "-composite"
    );

    // Main poster on the front, plus its effects
    args.push(
        "(",
        poster,
        "-scale",
        "346x490!",
        "-gravity",
        "Northwest",
        "-geometry",
        "+70+14",
        asset("foldervertical-main.png"),
        ")",
        "-compose",
        "over",
        "-composite",
        "(",
        asset("foldervertical-mainfx.png"),
        "-scale",
        "512x512!",
        ")",
        "-compose",
        "over",
        "-composite"
    );

    args.push(output);

    try {
        await execute("magick", args);
    } catch (error) {
        if (error.name === "ToolMissingError") throw error;
        const detail = String(error.stderr ?? "")
            .trim()
            .split("\n")[0];
        throw new Error(`ImageMagick failed${detail ? `: ${detail}` : ""}`);
    }

    return output;
}
