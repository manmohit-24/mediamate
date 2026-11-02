import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
    sanitizeFileName,
    sanitizeFolderName,
    movieFileName,
    episodeFileName,
    episodeDisplayTitle,
} from "../src/core/naming.js";
import { pickConfident, matchEpisode, normalize } from "../src/core/matching.js";
import { getLanguageName, normalizeLanguage } from "../src/core/language.js";
import { sniffImageMime } from "../src/core/image.js";
import { buildPlan, ORGANIZE_STEPS, COVER_STEPS } from "../src/core/plan.js";
import { pickBestLogo } from "../src/providers/logo.js";
import { freeName, renameFile } from "../src/fsops/rename.js";
import { parseCli } from "../src/cli/args.js";

test("naming", () => {
    assert.equal(sanitizeFileName('Star Wars: A "New" Hope?'), "Star Wars A New Hope");
    assert.equal(sanitizeFolderName("Star Wars: A New Hope"), "Star Wars - A New Hope");
    assert.equal(sanitizeFolderName("Mr. Robot."), "Mr. Robot");
    assert.equal(movieFileName({ title: "Interstellar", year: "2014" }), "Interstellar (2014)");
    assert.equal(movieFileName({ title: "Untitled", year: null }), "Untitled");
    const parts = {
        series: "Breaking Bad",
        season: 1,
        episode: 3,
        title: "...And the Bag's in the River",
    };
    assert.equal(episodeFileName(parts), "Breaking Bad - S01E03 - ...And the Bag's in the River");
    assert.equal(
        episodeDisplayTitle(parts),
        "Breaking Bad - S01E03 - ...And the Bag's in the River"
    );
});

test("pickConfident", () => {
    const dune = [
        { title: "Dune", year: "1984" },
        { title: "Dune", year: "2021" },
        { title: "Dune: Part Two", year: "2024" },
    ];
    assert.equal(pickConfident(dune, { title: "Dune", year: 2021 }), dune[1]);
    assert.equal(pickConfident(dune, { title: "Dune", year: null }), null); // two exact: ask
    assert.equal(pickConfident(dune, { title: "Dune", year: 1999 }), null);
    assert.equal(pickConfident([dune[2]], { title: "dune part two", year: null }), dune[2]);
    assert.equal(pickConfident(dune, { title: "", year: null }), null);
    assert.equal(normalize("Amélie!"), "amelie");
});

test("matchEpisode prefers the number, falls back to title", () => {
    const eps = [
        { number: 1, title: "Pilot" },
        { number: 2, title: "Cat's in the Bag..." },
    ];
    assert.equal(matchEpisode(eps, { episode: 2, episodeTitle: "Pilot" }), eps[1]);
    assert.equal(matchEpisode(eps, { episode: 9, episodeTitle: "Pilot" }), eps[0]);
    assert.equal(matchEpisode(eps, { episode: 9, episodeTitle: "" }), null);
});

test("language + image + logo", () => {
    assert.equal(getLanguageName("hi"), "Hindi");
    assert.equal(getLanguageName("und"), "Unknown");
    assert.equal(normalizeLanguage("en-US"), "en");
    assert.equal(normalizeLanguage(undefined), "und");
    assert.equal(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
    assert.equal(
        sniffImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
        "image/png"
    );
    assert.equal(sniffImageMime(Buffer.from("GIF89a")), null);
    const logos = [
        { url: "de", language: "de", score: 9 },
        { url: "none", language: null, score: 5 },
        { url: "en-low", language: "en", score: 1 },
        { url: "en-high", language: "en", score: 3 },
    ];
    assert.equal(pickBestLogo(logos), "en-high");
    assert.equal(pickBestLogo([]), null);
});

const info = {
    audio: [{ id: 2, language: "hi", title: null, default: true, forced: false }],
    subtitles: [{ id: 3, language: "en", title: null, default: false, forced: true }],
};

test("buildPlan movie", () => {
    const movie = {
        kind: "movie",
        id: 1,
        title: "Interstellar",
        year: "2014",
        releaseDate: "2014-11-05",
        poster: "p",
    };
    const plan = buildPlan({
        match: { kind: "movie", movie },
        info,
        steps: ORGANIZE_STEPS,
    });
    assert.equal(plan.newName, "Interstellar (2014)");
    assert.equal(plan.date, "2014-11-05");
    assert.equal(plan.coverUrl, "p");
    assert.equal(plan.metadata.title, "Interstellar");
    assert.equal(plan.metadata.audio[0].name, "Hindi");
    assert.equal(plan.metadata.subtitles[0].name, "English (Forced)");
});

test("buildPlan cover-only has no tags, rename or date", () => {
    const movie = {
        kind: "movie",
        id: 1,
        title: "X",
        year: "2000",
        releaseDate: "2000-01-01",
        poster: "p",
    };
    const plan = buildPlan({
        match: { kind: "movie", movie },
        info: null,
        steps: COVER_STEPS,
    });
    assert.equal(plan.metadata, null);
    assert.equal(plan.newName, null);
    assert.equal(plan.date, null);
    assert.equal(plan.coverUrl, "p");
});

test("buildPlan episode", () => {
    const series = { id: 5, title: "Breaking Bad", firstAirDate: "2008-01-20" };
    const season = { number: 1, title: "Season 1" };
    const episode = {
        season: 1,
        number: 3,
        title: null,
        airDate: null,
        poster: "s",
    };
    const plan = buildPlan({
        match: { kind: "episode", series, season, episode },
        info,
        steps: ORGANIZE_STEPS,
    });
    assert.equal(plan.newName, "Breaking Bad - S01E03 - Episode 3");
    assert.equal(plan.date, "2008-01-20"); // falls back to the series date
    assert.equal(plan.group.key, "5:1");
});

test("duplicate names get (1), (2)", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mm-test-"));
    try {
        for (const n of ["a.mkv", "b.mkv", "c.mkv"]) await writeFile(path.join(dir, n), "x");
        const a = await renameFile(path.join(dir, "a.mkv"), "Movie (2000)");
        const b = await renameFile(path.join(dir, "b.mkv"), "Movie (2000)");
        const c = await renameFile(path.join(dir, "c.mkv"), "Movie (2000)");
        assert.deepEqual(
            [a, b, c].map((p) => path.basename(p)),
            ["Movie (2000).mkv", "Movie (2000) (1).mkv", "Movie (2000) (2).mkv"]
        );
        // Re-running keeps each file where it is.
        assert.equal(await freeName(dir, "Movie (2000)", ".mkv", b), "Movie (2000) (1).mkv");
        assert.equal(await freeName(dir, "Movie (2000)", ".mkv", a), "Movie (2000).mkv");
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test("cli args", () => {
    const ok = parseCli(["organize", "/lib", "-r", "--ask", "--provider", "tvdb"]);
    assert.deepEqual(ok, {
        command: "organize",
        options: {
            path: "/lib",
            recursive: true,
            match: "ask",
            season: false,
            byTitle: false,
            folder: false,
            provider: "tvdb",
        },
    });
    assert.equal(parseCli(["organize", "/lib", "--auto"]).options.match, "auto");
    assert.equal(parseCli(["organize", "/lib"]).options.match, "smart");
    assert.throws(() => parseCli(["organize", "/lib", "--ask", "--auto"]), /either/);
    assert.throws(() => parseCli(["cover", "/lib", "--folder"]), /not available/);
    assert.throws(() => parseCli(["organize"]), /needs a path/);
    assert.throws(() => parseCli(["nope", "x"]), /Unknown command/);
    assert.throws(() => parseCli(["organize", "x", "--provider", "imdb"]), /Unknown provider/);
    assert.equal(parseCli(["--help"]).help, true);
    assert.equal(parseCli(["-v"]).version, true);
});

import { findByTitle, similarity } from "../src/core/matching.js";
import { parseEpisodeTitle } from "../src/core/parse/episode.js";

test("similarity", () => {
    assert.equal(similarity("pilot", "pilot"), 1);
    assert.ok(similarity("cats in the bag", "cats in the bag part two") < 0.88);
    assert.ok(similarity("and the bags in the river", "and the bag s in the river") > 0.88);
    assert.equal(similarity("a", "b"), 0);
});

test("findByTitle: exact, close, ambiguous, none", () => {
    const eps = [
        { season: 1, number: 1, title: "Pilot" },
        { season: 1, number: 2, title: "Cat's in the Bag..." },
        { season: 1, number: 3, title: "...And the Bag's in the River" },
        { season: 2, number: 1, title: "Pilot" },
        { season: 2, number: 2, title: "Seven Thirty-Seven" },
        { season: 2, number: 3, title: "Seven Thirty-Eight" },
    ];

    // punctuation/case differences are exact after normalizing
    assert.equal(findByTitle(eps, "cats in the bag").match, eps[1]);
    assert.equal(findByTitle(eps, "And the Bags in the River").match.number, 3);
    // same title twice -> no automatic pick, both offered
    const pilot = findByTitle(eps, "Pilot");
    assert.equal(pilot.match, null);
    assert.deepEqual(pilot.candidates, [eps[0], eps[3]]);
    // close but two similar candidates -> no clear winner
    assert.equal(findByTitle(eps, "Seven Thirty Seven Part").match, null);
    // nothing similar
    assert.deepEqual(findByTitle(eps, "Totally Different"), { match: null, candidates: [] });
    assert.deepEqual(findByTitle(eps, ""), { match: null, candidates: [] });
});

test("parseEpisodeTitle", () => {
    assert.equal(parseEpisodeTitle("Show - S01E03 - Some Title.mkv"), "Some Title");
    assert.equal(parseEpisodeTitle("Show - 06 - Some Title 1080p.mkv"), "Some Title");
    assert.equal(parseEpisodeTitle("06. Some Title.mkv"), "Some Title");
    assert.equal(parseEpisodeTitle("Show - 06.mkv"), "");
    assert.equal(parseEpisodeTitle(""), "");
});

test("cli: --by-title is for cover only", () => {
    assert.equal(parseCli(["cover", "/lib", "--by-title"]).options.byTitle, true);
    assert.equal(parseCli(["cover", "/lib"]).options.byTitle, false);
    assert.throws(
        () => parseCli(["organize", "/lib", "--by-title"]),
        /not available for 'organize'/
    );
});
