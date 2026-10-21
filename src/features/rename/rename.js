import path from "node:path";
import { rename } from "node:fs/promises";
import { exists } from "../../shared/exists.js";
import { spinner } from "../../app/spinner.js";

export async function renameFile(file) {
  spinner.step("Renaming file");
  const { name: baseName } = file.standard;

  const extension = path.extname(file.path);
  const dir = path.dirname(file.path);

  let filename = `${baseName}${extension}`;
  let destination = path.join(dir, filename);
  let index = 1;

  while (await exists(destination)) {
    if (path.resolve(destination) === path.resolve(file.path)) return;

    filename = `${baseName} (${index})${extension}`;
    destination = path.join(dir, filename);
    index++;
  }

  await rename(file.path, destination);

  file.path = destination;
  file.name = filename;
}
