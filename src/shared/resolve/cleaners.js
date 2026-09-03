const STOP_WORDS = [
  "2160p",
  "1080p",
  "720p",
  "480p",

  "bluray",
  "blu-ray",
  "brrip",
  "bdrip",
  "web",
  "webdl",
  "web-dl",
  "webrip",
  "hdrip",
  "dvdrip",
  "hdtv",

  "x264",
  "x265",
  "h264",
  "h265",
  "hevc",
  "av1",

  "10bit",
  "8bit",
  "12bit",

  "aac",
  "ac3",
  "dd",
  "ddp",
  "dts",
  "truehd",
  "atmos",
  "flac",

  "proper",
  "repack",
  "remastered",
  "extended",
  "criterion",
  "uncut",

  "imax",
];

export function removeWebsitePrefix(text) {
  return text.replace(/^.*?\|\s*/, "");
}

export function normalizeSeparators(text) {
  return text.replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
}

export function extractYear(text) {
  const match = text.match(/\b(19|20)\d{2}\b/);

  return match ? Number(match[0]) : null;
}

export function removeWebsite(text) {
  return text
    .replace(/\bwww\.[^\s]+/gi, "")
    .replace(/\b[a-z0-9-]+\.(com|net|org|in|mx)\b/gi, "");
}

export function truncateReleaseInfo(text, year) {
  let title = text;

  if (year) title = title.replace(year.toString(), "");

  const words = title.split(/\s+/);

  const result = [];

  for (const word of words) {
    if (STOP_WORDS.includes(word.toLowerCase())) break;

    result.push(word);
  }

  return result.join(" ");
}

export function cleanTitle(text) {
  return text
    .replace(/\(\)/g, "")
    .replace(/\[\]/g, "")
    .replace(/\{\}/g, "")
    .replace(/\s+/g, " ")
    .replace(/[-|]+$/, "")
    .trim();
}
