import { resolveTitle } from "../../shared/resolve/title.js";
import { parseEpisodeFilename } from "../match/episode.js";
import { searchMovie } from "../../api/tmdb/movies.js";
import { searchTV, searchTVSeason } from "../../api/tv.js";
import { chooseMovie } from "../../shared/input/movie.js";
import { chooseTV } from "../../shared/input/tv.js";

const normalize = (value) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function titleFromFilename(name) {
  const parsed = resolveTitle(name);
  return {
    ...parsed,
    title: (parsed.title ?? "").replace(/\s*\(\s*\)\s*/g, " ").trim(),
  };
}

async function selectMovie(file, guided, cache) {
  const parsed = titleFromFilename(file.name);
  const key = `tmdb:movie-search:${normalize(parsed.title)}:${parsed.year ?? ""}`;
  const matches = await cache.getOrFetch(key, () => searchMovie(parsed));
  if (!matches.length)
    throw new Error(`No movie match found for '${file.name}'`);

  if (guided) return chooseMovie(matches, file.name);

  const exact = matches.filter(
    (item) => normalize(item.title) === normalize(parsed.title),
  );
  const yearMatches = parsed.year
    ? exact.filter((item) => item.release_date?.slice(0, 4) === parsed.year)
    : exact;
  if (yearMatches.length === 1) return yearMatches[0];
  if (exact.length === 1 && !parsed.year) return exact[0];

  // Ambiguous or approximate matches should never be silently selected.
  return chooseMovie(matches, file.name);
}

async function selectSeries(parsed, fileName, guided, cache) {
  const key = `tv:series-search:${normalize(parsed.title)}`;
  const matches = await cache.getOrFetch(key, () =>
    searchTV({ title: parsed.title }),
  );
  if (!matches.length)
    throw new Error(`No TV show match found for '${parsed.title}'`);
  if (guided) return chooseTV(matches, fileName);

  const exact = matches.filter(
    (item) => normalize(item.title) === normalize(parsed.title),
  );
  if (exact.length === 1) return exact[0];
  return chooseTV(matches, fileName);
}

export async function matchPosterFile(file, { guided, cache }) {
  const parsedEpisode = parseEpisodeFilename(file.name);
  if (parsedEpisode) {
    const series = await selectSeries(parsedEpisode, file.name, guided, cache);
    const seasonKey = `tv:season:${series.id}:${parsedEpisode.season}`;
    const season = await cache.getOrFetch(seasonKey, () =>
      searchTVSeason(series.id, parsedEpisode.season),
    );
    const episode = matchEpisode(
      season.episodes ?? [],
      file.name,
      parsedEpisode.episode,
    );
    if (!episode) {
      throw new Error(
        `Could not match S${String(parsedEpisode.season).padStart(2, "0")}E${String(parsedEpisode.episode).padStart(2, "0")} in '${series.title}'`,
      );
    }
    return {
      kind: "episode",
      title: `${series.title} — ${episode.title}`,
      image: episode.poster,
      series,
      episode,
    };
  }

  const movie = await selectMovie(file, guided, cache);
  return {
    kind: "movie",
    title: `${movie.title} (${movie.release_date?.slice(0, 4) ?? "year unknown"})`,
    image: movie.poster,
    movie,
  };
}

export async function getPosterSeasonContext(files, { guided, cache }) {
  const parsedFiles = files.map((file) => ({
    file,
    parsed: parseEpisodeFilename(file.name),
  }));
  const first = parsedFiles.find((item) => item.parsed);
  if (!first)
    throw new Error("No SxxExx episode filename found in this folder.");

  const { parsed } = first;
  const inconsistent = parsedFiles.filter(
    ({ parsed: p }) =>
      !p ||
      p.season !== parsed.season ||
      normalize(p.title) !== normalize(parsed.title),
  );
  if (inconsistent.length) {
    throw new Error(
      "--tv-season expects files from one show and one season. Use normal poster mode for mixed folders.",
    );
  }

  const series = await selectSeries(parsed, first.file.name, guided, cache);
  const seasonKey = `tv:season:${series.id}:${parsed.season}`;
  const season = await cache.getOrFetch(seasonKey, () =>
    searchTVSeason(series.id, parsed.season),
  );
  return { series, season, parsedFiles };
}

export function matchEpisode(episodes, fileName, episodeNumber) {
  // Episode title is the strongest signal when it uniquely matches. Episode
  // number is the fallback because provider ordering can differ.
  const parsed = parseEpisodeFilename(fileName);
  const wantedTitle = parsed?.fileName
    ? extractEpisodeTitle(fileName, parsed)
    : "";
  const titleMatches = wantedTitle
    ? episodes.filter(
        (episode) => normalize(episode.title) === normalize(wantedTitle),
      )
    : [];
  if (titleMatches.length === 1) return titleMatches[0];

  const numbered = episodes.filter(
    (episode) => Number(episode.episode) === Number(episodeNumber),
  );
  if (numbered.length === 1) return numbered[0];
  if (titleMatches.length > 1)
    return (
      titleMatches.find((ep) => Number(ep.episode) === Number(episodeNumber)) ??
      null
    );
  return null;
}

function extractEpisodeTitle(fileName, parsed) {
  const base = fileName.replace(/\.[^.]+$/, "");
  const match =
    base.match(/S\d{1,2}[ ._-]*E\d{1,3}(?:[ ._-]*E\d{1,3})?/i) ??
    base.match(/[ ._-]\d{1,2}x\d{1,3}\b/i);
  if (!match) return "";
  return base
    .slice(match.index + match[0].length)
    .replace(/^[ ._-]+/, "")
    .replace(/[._]+/g, " ")
    .trim();
}
