import { getLanguageName } from "../../shared/language.js";

export async function addStandardMeta(file) {
  if (!file.match) throw new Error("No media match found");

  const common = {
    cover: { filename: "cover.jpg", source: file.match.poster },
    audio: (file.metadata.audio || []).map(buildAudioTrack),
    subtitles: (file.metadata.subtitles || []).map(buildSubtitleTrack),
    release_date: file.match.release_date || null,
  };

  if (file.mediaType === "tv") {
    const { season, episode, title } = file.match.episode;
    const seriesTitle = file.match.title;
    file.standard = {
      ...common,
      type: "tv",
      series_title: seriesTitle,
      season,
      episode,
      episode_title: title,
      name: buildTVName(seriesTitle, season, episode, title),
      title: `${seriesTitle} - S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")} - ${title}`,
    };
  } else {
    file.standard = {
      ...common,
      type: "movie",
      name: buildMovieName(file.match.title, file.match.release_date),
      title: file.match.title,
    };
  }
}

function buildAudioTrack(track) {
  const language = normalizeLanguage(track.language);
  return {
    id: track.id,
    language,
    name: track.title ?? getLanguageName(language),
    default: track.default,
    forced: track.forced,
  };
}

function buildSubtitleTrack(track) {
  const language = normalizeLanguage(track.language);
  return {
    id: track.id,
    language,
    name: `${getLanguageName(language)} ${track.default ? "(Default) " : ""}${track.forced ? "(Forced)" : ""}`.trim(),
    default: track.default,
    forced: track.forced,
  };
}

function normalizeLanguage(code) {
  return code?.toLowerCase().split("-")[0].trim() || "und";
}

const INVALID_FILENAME = /[<>:"/\\|?*\x00-\x1F]/g;

function cleanName(title) {
  return title.replace(INVALID_FILENAME, "").replace(/\s+/g, " ").trim();
}

function buildMovieName(title, releaseDate) {
  const year = releaseDate?.slice(0, 4);
  return `${cleanName(title)}${year ? ` (${year})` : ""}`;
}

function buildTVName(series, season, episode, title) {
  return `${cleanName(series)} - S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")} - ${cleanName(title)}`;
}
