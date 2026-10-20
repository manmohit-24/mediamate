import { select, input, Separator } from "@inquirer/prompts";
import { shutdown } from "../../app/shutdown.js";

const SKIP = Symbol("skip");

export async function chooseMovie(matches, name) {
  return chooseMedia(
    matches,
    name,
    (item) => `${item.title} (${item.release_date?.slice(0, 4) ?? "----"})`,
    "movie",
  );
}

export async function chooseTV(matches, name) {
  return chooseMedia(
    matches,
    name,
    (item) => `${item.title} (${item.first_air_date?.slice(0, 4) ?? "----"})`,
    "TV show",
  );
}

async function chooseMedia(matches, name, label, kind) {
  try {
    const choice = await select({
      message: `Multiple matches found for ${name}`,
      choices: [
        ...matches.map((item) => ({ name: label(item), value: item })),
        new Separator(),
        {
          name: "Skip this file",
          value: SKIP,
        },
      ],
    });

    if (choice === SKIP) throw new Error("File Skipped");

    return choice;
  } catch (error) {
    if (error.name === "ExitPromptError") return shutdown.request();
    throw error;
  }
}

export async function promptMovie(fileName) {
  return promptTitle(
    fileName,
    "Movie name or TMDb ID",
    "e.g. Interstellar or 157336",
  );
}

export async function promptTV(fileName) {
  return promptTitle(
    fileName,
    "TV show name or TMDb ID",
    "e.g. Breaking Bad or 1396",
  );
}

async function promptTitle(fileName, label, placeholder) {
  try {
    const value = await input({
      message: `Processing file : ${fileName} \n ${label} (leave empty to skip) :`,
      placeholder,
    });

    const trimmed = value.trim();

    if (!trimmed) throw new Error("File Skipped");

    return trimmed;
  } catch (error) {
    if (error.name === "ExitPromptError") return shutdown.request();
    throw error;
  }
}
