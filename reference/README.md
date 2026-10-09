# Reference: the working prototype

The single-file prototype the new app is being ported from, and its test suites.
Together with `docs/NOTATION.md`, `docs/ENGINE.md` and `docs/DATA.md`, this folder is
the behavioural contract for the Phase 0 port. Leave it as it is.

    gaaner-sathi.html   the prototype: open it in a browser (it runs offline)
    exercises.json      the 12 built-in exercises (made by tests/exercises.gen.js;
                        edit the generator, not the JSON)
    tests/              the reference suites: bash reference/tests/run-all.sh
                        (Node 18+, nothing to install)

- Opened as a local file, the prototype keeps songs in that browser's localStorage
  (`swaralipi.songs.v1`). Clearing site data loses them.
- On claude.ai it is a published artifact that stores songs with
  `window.claude.use('db')` and saves files with `window.claude.use('downloads')`.
  Neither exists outside claude.ai; the port replaces both.
- **Bringing songs across:** open the prototype where the songs live (the claude.ai
  artifact), press **Back up all my songs**, and import that file into the new app
  once Phase 1 is done.
- `tests/extract.js` cuts testable code out of the HTML between `/*PARSER-START*/` and
  `/*PARSER-END*/`, between `/*KS-START*/` and `/*KS-END*/`, and from the rhythm
  section (`const TAALS = {` … `function scheduleRhythm`). If the prototype is ever
  edited, keep those markers. Its output goes to `tests/.extracted/` (git-ignored).
