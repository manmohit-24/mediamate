# MediaMate

A CLI tool for cleaning, enriching, and standardizing media files using metadata from TMDb.

> MediaMate is designed around the broader **media** domain: movies, TV shows, animation, anime, cartoons, and other media-library content as support expands.

## Features

- Extract existing media metadata with **MediaInfo**
- Search **TMDb** for matching metadata
- Interactive matching for uncertain results
- Automatic matching with `--auto`
- Clean and standardize media metadata
- Standardize audio and subtitle track metadata
- Add and update cover artwork
- Rename media files using standardized metadata
- Preserve file extensions and avoid filename collisions
- Recursively scan directories
- Gracefully handle interruption during critical write operations
- Interactive progress and status feedback

> **Current scope:** MediaMate currently processes `.mkv` files and its implemented matching pipeline is for movies. TV-show and animation support is planned.

## Requirements

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- **MediaInfo CLI** available in `PATH`
- **MKVToolNix** (`mkvpropedit` and related MKV tools) available in `PATH`
- A **TMDb API key**

MediaMate currently works with **`.mkv`** files.

### External tools

MediaMate relies on command-line tools from [MediaInfo](https://mediaarea.net/en/MediaInfo) and [MKVToolNix](https://mkvtoolnix.download/). Make sure the required executables are installed and available through `PATH`.

## Installation

Clone the repository:

```bash
git clone https://github.com/manmohit-24/mediamate.git
cd mediamate
```

Install dependencies:

```bash
pnpm install
```

MediaMate is exposed as the `mediamate` CLI through the package `bin` entry.

For local development, run it directly with Node:

```bash
pnpm start -- clean ./path/to/media
```

To install the local package globally with current pnpm:

```bash
pnpm add --global .
```

After installation, the `mediamate` command can be used directly:

```bash
mediamate clean ./path/to/media
```

## Configuration

MediaMate requires the `TMDB_API_KEY` environment variable.

### Linux / macOS

```bash
export TMDB_API_KEY="your_tmdb_api_key"
```

### Windows PowerShell

```powershell
$env:TMDB_API_KEY="your_tmdb_api_key"
```

Then run MediaMate normally.

## Usage

```text
mediamate <mode> <path> [options]
```

### Modes

| Mode | Description |
| --- | --- |
| `clean` | Process media files, match metadata, and clean/standardize the result |
| `guided` | Process media files with interactive metadata matching |

### Options

| Option | Description |
| --- | --- |
| `-r`, `--recursive` | Scan subdirectories recursively |
| `-a`, `--auto` | Automatically select the best metadata match |
| `-h`, `--help` | Show general or mode-specific help |

## Examples

Process a single file:

```bash
mediamate clean movie.mkv
```

Process all supported files in a directory recursively:

```bash
mediamate clean ./Movies --recursive
```

Use interactive matching:

```bash
mediamate guided movie.mkv
```

Automatically select the best match:

```bash
mediamate clean movie.mkv --auto
```

Show general help:

```bash
mediamate --help
```

Show mode-specific help:

```bash
mediamate clean --help
mediamate guided --help
```

Help can also be requested after the mode:

```bash
mediamate clean -h
mediamate guided -h
```

## How It Works

MediaMate processes each supported file through a pipeline:

```text
Scan
  ↓
Read existing metadata
  ↓
Match media with TMDb
  ↓
Standardize metadata
  ↓
Write metadata
  ↓
Rename file
  ↓
Update timestamps
```

The `clean` pipeline uses automatic matching when `--auto` is supplied; otherwise it uses interactive matching so the correct result can be selected.

Existing metadata is read through the **MediaInfo** command-line tool. MediaMate uses **MKVToolNix** to modify MKV metadata and its own feature modules for matching, standardization, renaming, and timestamp handling.

## Project Structure

```text
src/
├── app/
│   ├── config.js
│   ├── constants.js
│   ├── help.js
│   ├── shutdown.js
│   └── spinner.js
│
├── features/
│   ├── match/
│   ├── metadata/
│   ├── rename/
│   ├── scan/
│   ├── standardize/
│   ├── timestamps/
│   └── writer/
│
├── pipeline/
├── providers/
└── shared/
```

The codebase separates the CLI/application layer, media-processing features, workflow pipelines, external providers, and shared utilities.

## Development

Start MediaMate from the repository:

```bash
pnpm start -- clean ./path/to/media
```

The project uses JavaScript ES modules and requires `TMDB_API_KEY` at startup.

## Roadmap

- [ ] TV show support
- [ ] Season and episode detection
- [ ] Live-action TV support
- [ ] Animated TV and cartoon support
- [ ] Anime naming and episode detection
- [ ] Media-server-friendly organization
- [ ] Additional metadata and matching improvements

## License

No license has been specified yet.
