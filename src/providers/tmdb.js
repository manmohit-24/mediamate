import { requestJSON } from "./http.js";
import { requireKey } from "../app/config.js";
import { pickBestLogo } from "./logo.js";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/original";

const imageUrl = (path) => (path ? `${IMAGE_BASE}${path}` : null);
const yearOf = (date) => (date ? date.slice(0, 4) : null);

async function call(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set("api_key", requireKey("TMDB_API_KEY"));
    for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== "") url.searchParams.set(key, value);
    }

    try {
        return await requestJSON(url, { headers: { Accept: "application/json" } });
    } catch (error) {
        error.message = `TMDb: ${error.message}`;
        throw error;
    }
}

const parseMovie = (m) => ({
    kind: "movie",
    id: m.id,
    title: m.title,
    year: yearOf(m.release_date),
    releaseDate: m.release_date || null,
    poster: imageUrl(m.poster_path),
});

const parseSeries = (s) => ({
    kind: "series",
    id: s.id,
    title: s.name,
    year: yearOf(s.first_air_date),
    firstAirDate: s.first_air_date || null,
    poster: imageUrl(s.poster_path),
});

const parseEpisode = (e, seasonNumber) => ({
    id: e.id,
    title: e.name || null,
    season: e.season_number ?? seasonNumber,
    number: e.episode_number,
    airDate: e.air_date || null,
    poster: imageUrl(e.still_path),
});

const parseLogos = (data) =>
    pickBestLogo(
        (data.logos ?? []).map((l) => ({
            url: imageUrl(l.file_path),
            language: l.iso_639_1,
            score: l.vote_average,
        }))
    );

export const tmdb = {
    name: "tmdb",

    async searchMovie({ title, year }) {
        const data = await call("/search/movie", { query: title, year, include_adult: false });
        return (data.results ?? []).map(parseMovie);
    },

    async getMovie(id) {
        return parseMovie(await call(`/movie/${id}`));
    },

    async searchSeries({ title, year }) {
        const data = await call("/search/tv", { query: title, first_air_date_year: year });
        return (data.results ?? []).map(parseSeries);
    },

    async getSeries(id) {
        return parseSeries(await call(`/tv/${id}`));
    },

    async getSeason(seriesId, number) {
        const data = await call(`/tv/${seriesId}/season/${number}`);
        return {
            number: data.season_number ?? number,
            title: data.name || `Season ${number}`,
            poster: imageUrl(data.poster_path),
            episodes: (data.episodes ?? []).map((e) => parseEpisode(e, number)),
        };
    },

    /** Season numbers of a show (specials included). */
    async getSeasonNumbers(id) {
        const data = await call(`/tv/${id}`);
        return (data.seasons ?? []).map((s) => s.season_number).sort((a, b) => a - b);
    },

    async getMovieLogo(id) {
        return parseLogos(await call(`/movie/${id}/images`, { include_image_language: "en,null" }));
    },

    async getSeriesLogo(id) {
        return parseLogos(await call(`/tv/${id}/images`, { include_image_language: "en,null" }));
    },

    async searchCollection({ title }) {
        const data = await call("/search/collection", { query: title });
        return (data.results ?? []).map((c) => ({
            kind: "collection",
            id: c.id,
            title: c.name,
            year: null,
            poster: imageUrl(c.poster_path),
        }));
    },
};
