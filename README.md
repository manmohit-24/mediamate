# MediaMate

Personal CLI to clean up a media library: match files to TMDb / TheTVDB, then rename them,
write tags, embed a poster and set the file date to the release date. It can also give
folders a poster icon.

## Setup

```bash
npm install
npm link            # gives you `mediamate` and `mm`
cp .env.example .env   # add TMDB_API_KEY (and TVDB_API_KEY if you use --provider tvdb)
```

Keys are also read from `~/.config/mediamate/.env`. A key is only required when that provider is used.

External tools: `mediainfo`, `mkvpropedit` (MKVToolNix) for .mkv, `ffmpeg` for .mp4/.m4v,
`magick` (ImageMagick) and `gio` (GNOME) for folder icons.

## Commands

```
mediamate organize <path> [-r] [--ask | --auto] [--season] [--folder] [--provider tmdb|tvdb]
mediamate cover    <path> [-r] [--ask | --auto] [--season] [--provider tmdb|tvdb]
mediamate folder   <path>
```

| Command    | What it does                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| `organize` | Rename + tags (title, track names, date) + embedded poster + file date = release date                      |
| `cover`    | Replace only the embedded poster. Names, tags and dates stay untouched                                     |
| `folder`   | Interactive: pick TV show/season, Movie, Franchise or Manual, then rename the folder and set a poster icon |

**Matching** (one policy for all commands):

- default (smart): accept an exact title + year match, ask when unsure or ambiguous
- `--ask`: always ask · `--auto`: always take the first result, never ask
- In the picker you can also search with another title, enter an ID, or skip

**Season handling:** TV files are grouped by show automatically. The show is matched once and
each season is fetched once, however many episodes there are. `--season` is for files with no
`SxxExx` in the name (e.g. `Show - 06 - Title.mkv`): you pick the show and season once and files are
matched by episode number. `--folder` then names the folder after the season and sets its icon.

**Duplicates:** if the target name exists, the file becomes `Name (1).mkv`, `Name (2).mkv`... automatically.

## How a run works

```
scan -> probe -> parse -> match (asks questions) -> plan        <- decide phase: nothing is written
                                                      |
                                   write tags/cover -> rename -> set date   <- apply phase: unattended
                                                      |
                                                  summary (exit code 1 if anything failed)
```

Ctrl+C during the decide phase is always safe. During apply, the current file is finished first.
Missing API keys or missing tools stop the run immediately instead of failing every file.

## Code layout

```
src/
  cli/        argument parsing, help, entry point
  commands/   organize (+ cover), folder          thin: wire the pieces together
  flow/       resolve (matching + prompts), decide, apply, summary
  core/       PURE logic, no I/O: filename parsing, naming, matching, plan building
  providers/  tmdb + tvdb behind one interface, http (retries), images
  media/      probe (mediainfo), mkv / mp4 writers
  fsops/      scan, rename (+ (1)/(2) duplicates), timestamps
  folder/     ImageMagick artwork, gio icon
  ui/         terminal (spinner-safe logging), prompts
  app/        config (.env), context, shutdown, token store, run cache
test/         node:test; `npm test`
```

Rules of thumb: `core/` never imports from `ui/`, `providers/` or `media/`. Everything a run needs
(providers, probe, writer, downloader) hangs off one `ctx` object, which is how tests swap in fakes.

## Tests

```bash
npm test
```

Filename parsing is table-driven in `test/parse.test.js`. When a real file name is parsed wrongly,
add it there first, then fix `src/core/parse/`.
