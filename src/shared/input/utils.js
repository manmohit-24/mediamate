import { select, input, Separator } from "@inquirer/prompts";
import { shutdown } from "../../app/shutdown.js";
import { spinner } from "../../app/spinner.js";

const SKIP = Symbol("skip");

export async function chooseMedia(matches, name, label) {
  return await choose(
    `Multiple matches found ${name ? `for ${name}` : ""}`,
    matches,
    true,
    label,
  );
}

export async function choose(message, choices, skip = true, label = null) {
  const choicesArr = [
    ...choices.map((item) => ({
      name: typeof label === "function" ? label(item) : item,
      value: item,
    })),
    new Separator(),
  ];

  if (skip)
    choicesArr.push({
      name: "Skip this file",
      value: SKIP,
    });

  return await spinner.suspend(async () => {
    try {
      const choice = await select({
        message,
        choices: choicesArr,
      });

      if (choice === SKIP) throw new Error("File Skipped");

      return choice;
    } catch (error) {
      if (error.name === "ExitPromptError") return shutdown.request();
      throw error;
    }
  });
}

export async function promptTitle(fileName, label, placeholder) {
  return await prompt(
    `${fileName ? `Processing file : ${fileName} \n` : ""}${label} (leave empty to skip) :`,
    placeholder,
  );
}

export async function prompt(message, placeholder) {
  return await spinner.suspend(async () => {
    try {
      const value = await input({ message, placeholder });

      const trimmed = value.trim();

      if (!trimmed) throw new Error("File Skipped");

      return trimmed;
    } catch (error) {
      if (error.name === "ExitPromptError") return shutdown.request();
      throw error;
    }
  });
}
