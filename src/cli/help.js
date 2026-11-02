import { log } from "../ui/terminal.js";

const GENERAL = `
mediamate <command> <path> [options]

Commands
  organize   Rename, write tags, embed poster and set release-date timestamps
  cover      Replace only the embedded poster
  folder     Name a folder and give it a poster icon

Run 'mediamate <command> --help' for details.

Global
  -h, --help       Show help
  -v, --version    Show version
`;

const COMMAND_HELP = {
    organize: `
mediamate organize <path> [options]

Finds media (.mkv .mp4 .m4v) in <path>, matches each file to TMDb/TheTVDB and
updates it. First all questions are asked, then everything is written.

Matching (default is smart)
  (default)        Accept exact title+year matches, ask when unsure
  --ask            Always ask which result is right
  --auto           Always take the first result, never ask

Options
  -r, --recursive  Include sub-folders
  --season         Files have no SxxExx: ask for show+season once and match by episode number
  --folder         Afterwards name the folder after the season and set its icon (TV season folders)
  --provider <p>   TV provider: tmdb (default) or tvdb
`,
    cover: `
mediamate cover <path> [options]

Replaces only the embedded poster (movie poster / episode still). Names, tags
and timestamps are left alone.

Options
  -r, --recursive  Include sub-folders
  --ask | --auto   Same matching modes as organize
  --season         Match by episode number inside one show+season
  --by-title       Match episodes by their TITLE instead of their number
  --provider <p>   TV provider: tmdb (default) or tvdb

Matching by title (--by-title)
  For when the numbering differs between providers: e.g. you organized with
  TheTVDB (correct order) but want TMDb's better episode artwork.

    mediamate organize <path> --provider tvdb
    mediamate cover    <path> --provider tmdb --by-title

  The file's own season is searched first, then every season of the show.
  Titles are compared ignoring case and punctuation, and a close spelling is
  accepted when one episode clearly fits. If nothing fits, you pick the episode
  (--ask / default) or the file fails (--auto). The file name must contain the
  episode title, as names written by 'organize' do.
`,
    folder: `
mediamate folder <path>

Interactive. Pick TV show/season, Movie, Franchise or Manual, then the folder is
renamed and gets a poster icon (needs ImageMagick and gio).
`,
};

export function showHelp(command) {
    log.text((COMMAND_HELP[command] ?? GENERAL).trimEnd());
}
