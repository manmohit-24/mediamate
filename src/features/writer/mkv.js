import { execute } from "../../shared/execute.js";

export async function updateMetadata(path, standard, cover) {
  const args = buildEditArguments(standard, cover);

  try {
    await execute("mkvpropedit", [path, ...args]);
  } catch (error) {
    if (error.code > 1) throw error; // mkvpropedit throws error code 1 for warnings
  }
}

function buildEditArguments(standard, cover) {
  const args = [];

  addGeneralMetadata(args, standard);
  addAudioTracks(args, standard.audio);
  addSubtitleTracks(args, standard.subtitles);
  removeAttachments(args);
  addPoster(args, cover);

  return args;
}

function addGeneralMetadata(args, standard) {
  args.push("--edit", "info", "--set", `title=${standard.title}`);
  args.push("--tags", "all:");
  if (standard.release_date)
    args.push("--edit", "info", "--set", `date=${standard.release_date}`);
}

function addAudioTracks(args, tracks) {
  for (const track of tracks) {
    args.push("--edit", `track:${track.id}`, "--set", `name=${track.name}`);
  }
}

function addSubtitleTracks(args, tracks) {
  for (const track of tracks) {
    args.push("--edit", `track:${track.id}`, "--set", `name=${track.name}`);
  }
}

function removeAttachments(args) {
  args.push(
    "--delete-attachment",
    "mime-type:image/jpeg",
    "--delete-attachment",
    "mime-type:image/png",
  );
}

function addPoster(args, cover) {
  if (!cover) return;

  args.push(
    "--attachment-name",
    cover.filename ?? "cover.jpg",
    "--attachment-mime-type",
    "image/jpeg",
    "--add-attachment",
    cover.tempPath,
  );
}


export async function updatePoster(filePath, cover) {
  const args = [
    "--delete-attachment", "mime-type:image/jpeg",
    "--delete-attachment", "mime-type:image/png",
  ];

  if (cover) {
    args.push(
      "--attachment-name", cover.filename,
      "--attachment-mime-type", cover.mime,
      "--add-attachment", cover.tempPath,
    );
  }

  try {
    await execute("mkvpropedit", [filePath, ...args]);
  } catch (error) {
    if (error.code > 1) throw error;
  }
}
