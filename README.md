# MediaMate

MediaMate organizes local video files using metadata from The Movie Database (TMDb).

## Requirements

- Node.js with the package manager configured by this project
- `mediainfo`
- `mkvpropedit` for MKV files
- `ffmpeg` for MP4/M4V files
- A TMDb API key in `TMDB_API_KEY`

Install dependencies with `pnpm install`.

## Usage

```sh
TMDB_API_KEY=your_key pnpm start clean /path/to/video
TMDB_API_KEY=your_key pnpm start clean /path/to/library --recursive
TMDB_API_KEY=your_key pnpm start clean /path/to/library --recursive --auto
TMDB_API_KEY=your_key pnpm start guided /path/to/video
```

Supported extensions: `.mkv`, `.mp4`, `.m4v`.

## TV episodes

TV episodes are detected from common filename markers such as:

- `Breaking.Bad.S02E03.1080p.WEB-DL.mkv`
- `The.Boys.4x08.1080p.mp4`
- `Pokemon.S01E01.mkv`

Auto mode searches TMDb for the series, then looks up the episode by season and episode number. Interactive mode lets you select the series (or enter a TMDb series ID). Episode files are renamed to a format like:

```text
Breaking Bad - S02E03 - Four Days Out.mkv
```

Animated series use the same TV workflow; they do not require a separate media type. Combined episode markers are recognized, but only the first episode is currently used for metadata.

## MP4/M4V handling

MP4 and M4V files are remuxed with FFmpeg using stream copy (no video/audio re-encoding). The writer updates the title/date tags, stream titles, and embeds the downloaded poster as cover art. The original file is replaced only after FFmpeg successfully creates the temporary output.
