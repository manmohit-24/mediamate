import { request } from "./request.js";

export async function searchMovie({ title, year }) {
  const data = await request("/search/movie", { query: title, year });
  return data.results.map(parseMovie);
}

export async function searchFranchise({ title, year }) {
  const data = await request("/search/collection", { query: title, year });

  return data.results.map((item) => {
    return { title: item.name, poster: item.poster_path };
  });
}

export async function searchMovieById(id) {
  const movie = await request(`/movie/${id}`);

  return parseMovie(movie);
}

export async function getMovieLogo(id) {
  const { logos } = await await request(`/movie/${id}/images`);

  if (!logos?.length) return null;

  return logos.sort((a, b) => {
    const languageScore = (logo) =>
      logo.iso_639_1 === "en" ? 2 : logo.iso_639_1 === null ? 1 : 0;

    const score = (logo) =>
      languageScore(logo) * 1_000_000 + logo.vote_average * 10;

    return score(b) - score(a);
  })[0].file_path;
}

function parseMovie(movie) {
  return {
    type: "movie",
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date || null,
    poster: movie.poster_path,
  };
}
