import { wrap } from "./wrap.js";
import { shutdown } from "../app/shutdown.js";
import { renameFile } from "../features/rename/rename.js";
import { readMetadata } from "../features/metadata/read.js";
import { addStandardMeta } from "../features/standardize/standardize.js";
import { updateMetadata } from "../features/writer/index.js";
import { updateTimestamps } from "../features/timestamps/timestamps.js";
import { guidedMatch } from "../features/match/guided.js";

export async function guided(files, config) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await wrap({ file, i, total: files.length }, async () => {
      await readMetadata(file);

      await guidedMatch(file);

      await addStandardMeta(file);

      await shutdown.critical(async () => {
        await updateMetadata(file);

        await renameFile(file);

        await updateTimestamps(file);
      });
    });
  }
}
