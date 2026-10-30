import path from "node:path";
import {
  removeWebsitePrefix,
  normalizeSeparators,
  truncateReleaseInfo,
  cleanTitle,
  extractYear,
  removeExtension,
} from "./cleaners.js";

export function resolveTitle(title) {
  if (!title) return {};
  const year = extractYear(title);

  let resolved = title;

  resolved = removeExtension(resolved); // for filenames with extensions
  resolved = removeWebsitePrefix(resolved);
  resolved = normalizeSeparators(resolved);
  resolved = truncateReleaseInfo(resolved, year);
  resolved = cleanTitle(resolved);

  return {
    title: resolved,
    year,
  };
}
