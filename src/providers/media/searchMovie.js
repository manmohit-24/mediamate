import { request } from "./request.js";

export async function searchMovie({ title, year }) {
  const data = await request("/search/movie", { query: title, year });
  return data.results.map(parseMovie);
}

export async function searchMovieById(id) {
  const movie = await request(`/movie/${id}`);

  return parseMovie(movie);
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
