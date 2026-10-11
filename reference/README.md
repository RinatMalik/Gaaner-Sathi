# Reference: the working prototype

The single-file prototype the app was ported from (Phase 0, done 2026-10-10), and its test
suites. It is no longer published, but stays: the comparison tests (`tests/differential/`)
use its own code as the oracle for everything carried over unchanged. Leave it as it is.

    gaaner-sathi.html   the prototype: open it in a browser (it runs offline)
    exercises.json      the 12 built-in exercises (made by tests/exercises.gen.js)
    tests/              the reference suites: bash reference/tests/run-all.sh
                        (Node 18+, nothing to install)

| Suite | Covers |
|---|---|
| `parser.test.js` | Reading Bengali and Sa Re Ga notation, beat grouping, octave marks, source offsets, octave shifting |
| `checker.test.js` | Bar-length and octave-slip checks, including deliberate-leap exemptions |
| `join-split.test.js` | Joining and splitting beats in the text |
| `rhythm.test.js` | Speed mapping (half, double), fills, layers landing inside every taal |
| `tanpura.test.js` | Tanpura string tuning (under 3 cents, measured under 0.05) and decay |
| `exercises.gen.js` | Generates the 12 exercises from compact Sa Re Ga specs, converts them to Bengali, and checks each plays identically and passes the checker |

- Opened as a local file, the prototype keeps songs in that browser's localStorage
  (`swaralipi.songs.v1`). Clearing site data loses them.
- On claude.ai it is a published artifact that stores songs with
  `window.claude.use('db')` and saves files with `window.claude.use('downloads')`.
  Neither exists outside claude.ai; the port replaces both.
- **Bringing songs across:** open the prototype where the songs live (the claude.ai
  artifact), press **Back up all my songs**, and import that file in the app (Songs →
  Import).
- `tests/extract.js` cuts testable code out of the HTML between `/*PARSER-START*/` and
  `/*PARSER-END*/`, between `/*KS-START*/` and `/*KS-END*/`, and from the rhythm
  section (`const TAALS = {` … `function scheduleRhythm`). Keep those markers. Its
  output goes to `tests/.extracted/` (git-ignored).
- `tests/package.json` keeps these suites CommonJS, because the repo root is an ES
  module package. The new code's tests (`tests/differential/`) cut the same sections
  out to compare the port with the prototype.
