import { requestJSON } from "./http.js";
import { requireKey } from "../app/config.js";
import { readToken, saveToken } from "../app/tokens.js";
import { pickBestLogo } from "./logo.js";

const BASE_URL = "https://api4.thetvdb.com/v4";
const IMAGE_BASE_URL = "https://artworks.thetvdb.com";

// TVDB artwork links are sometimes absolute and sometimes relative.
const imageUrl = (path) => (path ? new URL(path, IMAGE_BASE_URL).href : null);

async function login() {
    const data = await requestJSON(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ apikey: requireKey("TVDB_API_KEY") }),
    });

    const token = data?.data?.token;
    if (!token) throw new Error("login response did not contain a token");

    await saveToken("tvdb", token);
    return token;
}

async function call(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== "") url.searchParams.set(key, value);
    }

    const run = (token) =>
        requestJSON(url, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });

    try {
        try {
            return await run((await readToken("tvdb")) ?? (await login()));
        } catch (error) {
            if (error.status !== 401) throw error;
            return await run(await login()); // token expired or revoked: log in again once
        }
    } catch (error) {
        error.message = `TheTVDB: ${error.message}`;
        throw error;
    }
}

const parseSeries = (s) => {
    const firstAirDate = s.first_air_time || s.firstAired || null;
    return {
        kind: "series",
        id: Number(s.tvdb_id ?? s.id),
        title: s.name,
        year: s.year ? String(s.year) : (firstAirDate?.slice(0, 4) ?? null),
        firstAirDate,
        poster: imageUrl(s.image ?? s.image_url),
    };
};

const parseEpisode = (e, seasonNumber) => ({
    id: e.id,
    title: e.name ?? e.episodeName ?? null,
    season: e.airedSeason ?? e.seasonNumber ?? seasonNumber,
    number: e.airedEpisodeNumber ?? e.number ?? e.episodeNumber ?? null,
    airDate: e.firstAired ?? e.aired ?? null,
    poster: imageUrl(e.image),
});

export const tvdb = {
    name: "tvdb",

    async searchSeries({ title, year }) {
        const data = await call("/search", { query: title, type: "series", year });
        return (data.data ?? []).map(parseSeries);
    },

    async getSeries(id) {
        return parseSeries((await call(`/series/${id}/extended`)).data);
    },

    async getSeason(seriesId, number) {
        const [extended, episodes] = await Promise.all([
            call(`/series/${seriesId}/extended`),
            call(`/series/${seriesId}/episodes/default`, { season: number }),
        ]);

        const show = extended.data;
        const defaultType = show.defaultSeasonType;

        const info = (show.seasons ?? []).find((s) => {
            const typeId = s.type?.id ?? s.type;
            return (
                (s.number ?? s.seasonNumber) === number &&
                (defaultType == null || typeId === defaultType)
            );
        });

        return {
            number,
            title: info?.name || `Season ${number}`,
            poster: imageUrl(info?.image),
            episodes: (episodes.data?.episodes ?? [])
                .map((e) => parseEpisode(e, number))
                .sort((a, b) => a.number - b.number),
        };
    },

    /** Season numbers of a show in its default season order (specials included). */
    async getSeasonNumbers(id) {
        const show = (await call(`/series/${id}/extended`)).data;
        const defaultType = show.defaultSeasonType;

        const numbers = (show.seasons ?? [])
            .filter((s) => defaultType == null || (s.type?.id ?? s.type) === defaultType)
            .map((s) => s.number ?? s.seasonNumber)
            .filter((n) => Number.isInteger(n) && n >= 0);

        return [...new Set(numbers)].sort((a, b) => a - b);
    },

    async getSeriesLogo(id) {
        const [artworks, types] = await Promise.all([
            call(`/series/${id}/artworks`),
            call("/artwork/types"),
        ]);

        // Resolve type ids by name instead of hardcoding provider-specific ids.
        const logoTypes = new Set(
            (types.data ?? []).filter((t) => /logo/i.test(t.name ?? "")).map((t) => t.id)
        );

        return pickBestLogo(
            (artworks.data?.artworks ?? [])
                .filter((a) => logoTypes.has(a.type))
                .map((a) => {
                    const language = a.language ?? a.languageCode;
                    return {
                        url: imageUrl(a.image),
                        language: language === "eng" ? "en" : language || null,
                        score: a.score,
                    };
                })
        );
    },

    async getMovieLogo() {
        throw new Error("TheTVDB provider does not support movie logos");
    },

    async searchCollection() {
        throw new Error("TheTVDB provider does not support franchises");
    },
};
