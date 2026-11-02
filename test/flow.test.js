import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, stat, readdir, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCache } from "../src/app/cache.js";
import { scanMedia } from "../src/fsops/scan.js";
import { decide } from "../src/flow/decide.js";
import { apply } from "../src/flow/apply.js";
import { ORGANIZE_STEPS, COVER_STEPS } from "../src/core/plan.js";

const interstellar = {
    kind: "movie",
    id: 1,
    title: "Interstellar",
    year: "2014",
    releaseDate: "2014-11-05",
    poster: "http://img/p.jpg",
};
const bb = {
    kind: "series",
    id: 10,
    title: "Breaking Bad",
    year: "2008",
    firstAirDate: "2008-01-20",
    poster: "http://img/bb.jpg",
};
const season1 = {
    number: 1,
    title: "Season 1",
    poster: "http://img/s1.jpg",
    episodes: [
        {
            id: 1,
            title: "Pilot",
            season: 1,
            number: 1,
            airDate: "2008-01-20",
            poster: "http://img/e1.jpg",
        },
        {
            id: 2,
            title: "Cat's in the Bag...",
            season: 1,
            number: 2,
            airDate: "2008-01-27",
            poster: null,
        },
    ],
};

function makeCtx(overrides = {}) {
    const calls = { searchMovie: 0, getSeason: 0, writes: [], downloads: [] };
    const ctx = {
        options: { match: "auto", season: false, ...overrides },
        cache: createCache(),
        manualSeason: null,
        providers: {
            movie: {
                name: "tmdb",
                async searchMovie({ title }) {
                    calls.searchMovie++;
                    return title === "Interstellar" ? [interstellar] : [];
                },
                async getMovie() {
                    return interstellar;
                },
            },
            tv: {
                name: "tmdb",
                async searchSeries() {
                    return [bb];
                },
                async getSeason(id, number) {
                    calls.getSeason++;
                    if (number !== 1) throw Object.assign(new Error("HTTP 404"), { status: 404 });
                    return season1;
                },
            },
        },
        async probe() {
            return {
                title: null,
                audio: [{ id: 2, language: "en", title: null, default: true, forced: false }],
                subtitles: [],
            };
        },
        async downloadImage(url) {
            calls.downloads.push(url);
            return { data: Buffer.from("img"), mime: "image/jpeg" };
        },
        async writeMedia(file, edit) {
            calls.writes.push({ file: path.basename(file), edit });
        },
    };
    return { ctx, calls };
}

async function withDir(files, fn) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mm-flow-"));
    try {
        for (const name of files) await writeFile(path.join(dir, name), "x");
        return await fn(dir);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

test("organize: movies + episodes, duplicates, season fetched once", async () => {
    const names = [
        "Interstellar.2014.1080p.BluRay.mkv",
        "Interstellar (2014) 720p.mkv", // duplicate of the first
        "Breaking.Bad.S01E01.720p.mkv",
        "Breaking.Bad.S01E02.Cats.in.the.Bag.720p.mkv",
    ];

    await withDir(names, async (dir) => {
        const { ctx, calls } = makeCtx();
        const files = await scanMedia(dir);
        const items = await decide(files, ctx, ORGANIZE_STEPS);

        assert.deepEqual(
            items.map((i) => i.status),
            ["ready", "ready", "ready", "ready"]
        );
        assert.equal(calls.getSeason, 1, "season must be fetched once for the group");
        assert.equal(calls.writes.length, 0, "decide phase must not write anything");
        assert.deepEqual(
            (await readdir(dir)).sort(),
            names.slice().sort(),
            "decide must not touch the disk"
        );

        await apply(items, ctx);
        assert.deepEqual(
            items.map((i) => i.status),
            ["done", "done", "done", "done"]
        );

        assert.deepEqual((await readdir(dir)).sort(), [
            "Breaking Bad - S01E01 - Pilot.mkv",
            "Breaking Bad - S01E02 - Cat's in the Bag....mkv",
            "Interstellar (2014) (1).mkv",
            "Interstellar (2014).mkv",
        ]);

        // Release date becomes the modification time.
        const st = await stat(path.join(dir, "Interstellar (2014).mkv"));
        assert.equal(st.mtime.toISOString(), "2014-11-05T00:00:00.000Z");

        const first = calls.writes.find((w) => w.file.startsWith("Interstellar"));
        assert.equal(first.edit.metadata.title, "Interstellar");
        assert.equal(first.edit.cover.mime, "image/jpeg");
        // Episode without a still: no cover download/embed.
        const ep2 = calls.writes.find((w) => w.file.includes("S01E02"));
        assert.equal(ep2.edit.cover, null);
    });
});

test("failures and skips are reported per file without stopping the run", async () => {
    await withDir(
        [
            "Unknown.Movie.2020.mkv",
            "Interstellar.2014.mkv",
            "S01E05.mkv",
            "Breaking.Bad.S09E01.mkv",
            "Breaking.Bad.S01E09.mkv",
        ],
        async (dir) => {
            const { ctx } = makeCtx();
            const items = await decide(await scanMedia(dir), ctx, ORGANIZE_STEPS);
            const byName = Object.fromEntries(items.map((i) => [i.file.name, i]));

            assert.equal(byName["Interstellar.2014.mkv"].status, "ready");
            assert.match(byName["Unknown.Movie.2020.mkv"].reason, /No movie match/);
            assert.match(byName["S01E05.mkv"].reason, /no show title/);
            assert.match(
                byName["Breaking.Bad.S09E01.mkv"].reason,
                /Season 9 of "Breaking Bad" was not found/
            );
            assert.match(
                byName["Breaking.Bad.S01E09.mkv"].reason,
                /S01E09 was not found in "Breaking Bad"/
            );
            assert.equal(byName["Unknown.Movie.2020.mkv"].status, "failed");
        }
    );
});

test("apply: a failing write does not rename, and other files continue", async () => {
    await withDir(["Interstellar.2014.mkv", "Breaking.Bad.S01E01.mkv"], async (dir) => {
        const { ctx } = makeCtx();
        const realWrite = ctx.writeMedia;
        ctx.writeMedia = async (file, edit) => {
            if (file.includes("Interstellar")) throw new Error("boom");
            return realWrite(file, edit);
        };

        const items = await decide(await scanMedia(dir), ctx, ORGANIZE_STEPS);
        await apply(items, ctx);

        const names = await readdir(dir);
        assert.ok(names.includes("Interstellar.2014.mkv"), "failed file keeps its name");
        assert.ok(names.includes("Breaking Bad - S01E01 - Pilot.mkv"));
        assert.equal(items.find((i) => i.file.name.startsWith("Interstellar")).reason, "boom");
    });
});

test("cover: only the poster is written; name and mtime are untouched", async () => {
    await withDir(["Interstellar.2014.mkv"], async (dir) => {
        const target = path.join(dir, "Interstellar.2014.mkv");
        const old = new Date("2020-02-02T00:00:00Z");
        await utimes(target, old, old);

        const { ctx, calls } = makeCtx();
        ctx.probe = async () => {
            throw new Error("cover mode must not probe");
        };

        const items = await decide(await scanMedia(dir), ctx, COVER_STEPS);
        await apply(items, ctx);

        assert.equal(items[0].status, "done");
        assert.equal(calls.writes[0].edit.metadata, null);
        assert.ok(calls.writes[0].edit.cover);
        assert.deepEqual(await readdir(dir), ["Interstellar.2014.mkv"]);
        assert.equal((await stat(target)).mtime.toISOString(), old.toISOString());
    });
});

test("cover: missing artwork is a failure", async () => {
    await withDir(["Breaking.Bad.S01E02.mkv"], async (dir) => {
        const { ctx } = makeCtx();
        const items = await decide(await scanMedia(dir), ctx, COVER_STEPS);
        assert.equal(items[0].status, "failed");
        assert.match(items[0].reason, /No poster artwork/);
    });
});

test("--season mode matches by episode number using the manual show", async () => {
    await withDir(["Some Show - 02 - whatever.mkv", "Some Show - 07.mkv"], async (dir) => {
        const { ctx } = makeCtx({ season: true });
        ctx.manualSeason = { series: bb, season: season1 };

        const items = await decide(await scanMedia(dir), ctx, ORGANIZE_STEPS);
        assert.equal(items[0].status, "ready");
        assert.equal(items[0].plan.newName, "Breaking Bad - S01E02 - Cat's in the Bag...");
        assert.equal(items[1].status, "failed");
        assert.match(items[1].reason, /Episode 7 was not found/);
    });
});

test("scan ignores temp files and sorts naturally", async () => {
    await withDir(["E10.mkv", "E2.mkv", "x.mediamate-tmp.mp4", "notes.txt"], async (dir) => {
        const files = await scanMedia(dir);
        assert.deepEqual(
            files.map((f) => f.name),
            ["E2.mkv", "E10.mkv"]
        );
    });
});

// TMDb-style numbering differs from the numbering the files were named with (TVDB-style).
test("cover --by-title: matches by episode name across different numbering and seasons", async () => {
    const tmdbSeason1 = {
        number: 1,
        title: "Season 1",
        poster: null,
        episodes: [
            {
                id: 1,
                title: "Pilot",
                season: 1,
                number: 1,
                airDate: null,
                poster: "http://img/pilot.jpg",
            },
            {
                id: 2,
                title: "The Second One",
                season: 1,
                number: 2,
                airDate: null,
                poster: "http://img/second.jpg",
            },
        ],
    };
    const tmdbSeason2 = {
        number: 2,
        title: "Season 2",
        poster: null,
        episodes: [
            {
                id: 3,
                title: "Moved Over",
                season: 2,
                number: 1,
                airDate: null,
                poster: "http://img/moved.jpg",
            },
        ],
    };
    const byNumber = { 1: tmdbSeason1, 2: tmdbSeason2 };

    const names = [
        "Show - S01E01 - The Second One.mkv", // number says 1, title says it is TMDb episode 2
        "Show - S01E02 - Moved Over.mkv", // lives in season 2 on TMDb
        "Show - S01E03 - Does Not Exist.mkv", // not on TMDb at all
        "Show - S05E01 - Pilot.mkv", // season 5 does not exist on TMDb
        "Show - S01E04.mkv", // no title in the name
    ];

    await withDir(names, async (dir) => {
        const { ctx } = makeCtx({ byTitle: true });
        ctx.providers.tv.searchSeries = async () => [{ ...bb, title: "Show" }];
        ctx.providers.tv.getSeason = async (id, n) => {
            if (!byNumber[n]) throw Object.assign(new Error("HTTP 404"), { status: 404 });
            return byNumber[n];
        };
        ctx.providers.tv.getSeasonNumbers = async () => [1, 2];

        const items = await decide(await scanMedia(dir), ctx, COVER_STEPS);
        const by = Object.fromEntries(items.map((i) => [i.file.name, i]));

        assert.equal(by[names[0]].plan.coverUrl, "http://img/second.jpg");
        assert.equal(by[names[1]].plan.coverUrl, "http://img/moved.jpg");
        assert.equal(by[names[3]].plan.coverUrl, "http://img/pilot.jpg"); // found although season 5 is missing
        assert.equal(by[names[2]].status, "failed");
        assert.match(by[names[2]].reason, /No episode titled "Does Not Exist"/);
        assert.equal(by[names[4]].status, "failed");
        assert.match(by[names[4]].reason, /No episode title in the file name/);
    });
});

test("cover --by-title with --season uses the manual show and finds titles in other seasons", async () => {
    await withDir(["Show - 01 - Moved Over.mkv"], async (dir) => {
        const s1 = {
            number: 1,
            title: "Season 1",
            poster: null,
            episodes: [{ id: 1, title: "Pilot", season: 1, number: 1, poster: "a" }],
        };
        const s2 = {
            number: 2,
            title: "Season 2",
            poster: null,
            episodes: [{ id: 2, title: "Moved Over", season: 2, number: 1, poster: "b" }],
        };

        const { ctx } = makeCtx({ byTitle: true, season: true });
        ctx.manualSeason = { series: bb, season: s1 };
        ctx.providers.tv.getSeason = async (id, n) => (n === 1 ? s1 : s2);
        ctx.providers.tv.getSeasonNumbers = async () => [1, 2];

        const items = await decide(await scanMedia(dir), ctx, COVER_STEPS);
        assert.equal(items[0].status, "ready");
        assert.equal(items[0].plan.coverUrl, "b");
    });
});
