import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTitleAndYear, findYear } from "../src/core/parse/title.js";
import { parseEpisode, parseEpisodeNumber } from "../src/core/parse/episode.js";

const movie = (input, title, year) =>
    test(`movie: ${input}`, () => assert.deepEqual(parseTitleAndYear(input), { title, year }));

movie("Interstellar.2014.1080p.BluRay.x264-GRP.mkv", "Interstellar", 2014);
movie("Interstellar (2014) [1080p] [YTS.MX].mp4", "Interstellar", 2014);
movie("The.Dark.Knight.2008.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.mkv", "The Dark Knight", 2008);
movie("2001 A Space Odyssey 1968 720p BluRay.mkv", "2001 A Space Odyssey", 1968);
movie("Blade.Runner.2049.2017.1080p.WEB-DL.DD5.1.H264.mkv", "Blade Runner 2049", 2017);
movie("Blade Runner 2049.mkv", "Blade Runner 2049", null);
movie("1917.1080p.BluRay.mkv", "1917", null);
movie("2012 (2009).mkv", "2012", 2009);
movie("2012.mkv", "2012", null);
movie("Extended Family (2011).mkv", "Extended Family", 2011);
movie("Dune.Extended.2021.1080p.mkv", "Dune", 2021);
movie("Web of Lies 2019 1080p.mkv", "Web of Lies", 2019);
movie("www.SiteName.com - Some Movie (2019) 720p.mkv", "Some Movie", 2019);
movie("Spider-Man.No.Way.Home.2021.1080p.WEBRip.x264-GRP.mkv", "Spider-Man No Way Home", 2021);
movie("Movie 1920x1080.mkv", "Movie 1920x1080", null);
movie("Just A Title.mkv", "Just A Title", null);
movie("", "", null);

test("findYear ignores future years and prefers brackets", () => {
    assert.equal(findYear("Foo 2049"), null);
    assert.equal(findYear("Foo 1999 (2005)").value, 2005);
});

const episode = (input, expected) =>
    test(`episode: ${input}`, () => assert.deepEqual(parseEpisode(input), expected));

episode("Breaking.Bad.S01E03.And.the.Bags.in.the.River.720p.BluRay.x264-GRP.mkv", {
    title: "Breaking Bad",
    year: null,
    season: 1,
    episode: 3,
    episodeEnd: null,
    episodeTitle: "And the Bags in the River",
});
episode("Show Name (2019) - S02E10 - Finale.mp4", {
    title: "Show Name",
    year: 2019,
    season: 2,
    episode: 10,
    episodeEnd: null,
    episodeTitle: "Finale",
});
episode("Show.S01E01E02.1080p.WEB-DL.mkv", {
    title: "Show",
    year: null,
    season: 1,
    episode: 1,
    episodeEnd: 2,
    episodeTitle: "",
});
episode("Show - 3x07 - Title Here.mkv", {
    title: "Show",
    year: null,
    season: 3,
    episode: 7,
    episodeEnd: null,
    episodeTitle: "Title Here",
});
episode("S01E03.mkv", {
    title: "",
    year: null,
    season: 1,
    episode: 3,
    episodeEnd: null,
    episodeTitle: "",
});

test("episode: movies are not episodes", () => {
    assert.equal(parseEpisode("Interstellar.2014.1080p.mkv"), null);
    assert.equal(parseEpisode("Movie 1920x1080.mkv"), null);
    assert.equal(parseEpisode(""), null);
});

test("episode number only", () => {
    assert.equal(parseEpisodeNumber("Show S01E06 Title.mkv"), 6);
    assert.equal(parseEpisodeNumber("Show 1x06.mkv"), 6);
    assert.equal(parseEpisodeNumber("Show - 06 - Title.mkv"), 6);
    assert.equal(parseEpisodeNumber("Show - 06.mkv"), 6);
    assert.equal(parseEpisodeNumber("Show Ep12.mkv"), 12);
    assert.equal(parseEpisodeNumber("random.mkv"), null);
});
