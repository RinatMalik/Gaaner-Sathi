# Gaaner Sathi · গানের সাথী

A practice companion for singers who learn Bengali songs from swaralipi (akarmatrik
notation). Type the notation once, and Gaaner Sathi plays the melody on harmonium as a
pitch guide, with tabla, dholak or drums and a tanpura drone, all on one clock so the
rhythm never drifts from the melody. It highlights the beat you are on, with the lyric
underneath.

## Status

Phase 0 of the [roadmap](docs/ROADMAP.md): turning a working single-file prototype into
a light TypeScript web app that you can use straightaway, offline, with no account.

## Try it

- **The new app:** https://rinatmalik.github.io/Gaaner-Sathi/new/
- **The prototype it replaces:** https://rinatmalik.github.io/Gaaner-Sathi/ (or download
  [`reference/gaaner-sathi.html`](reference/gaaner-sathi.html) and open it in a browser).

Both keep your songs in your browser. The new app also shows the songs you saved in
the prototype.

## Find your way around

| Path | What it holds |
|---|---|
| [`CONTEXT.md`](CONTEXT.md) | The project's shared state: direction, working rules, current state, decisions, work log |
| [`docs/`](docs/) | Roadmap, parity checklist, notation, engine and data specs, decision records |
| [`index.html`](index.html), [`src/`](src/) | The new app: the page, the pure core (`src/core/`), the sound (`src/audio/`) and the screen (`src/app/`) |
| [`tests/`](tests/) | Tests for the new code |
| [`reference/`](reference/) | The working prototype and its reference test suites |

## Develop

Needs Node 24 LTS.

    npm install
    npm test            # all tests (Vitest), including comparisons with the prototype
    npm run typecheck   # TypeScript, including the DOM-free check on src/core
    npm run dev         # dev server: the app at /, the audio check at /dev/render.html
    npm run build       # the published files, in dist/

`bash reference/tests/run-all.sh` runs the prototype's own suites. GitHub Actions runs
everything on every push to `main`.

## Licence

No licence has been chosen yet, so all rights are reserved.
