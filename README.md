# Gaaner Sathi · গানের সাথী

A practice companion for singers who learn Bengali songs from swaralipi (akarmatrik
notation). Type the notation once, and Gaaner Sathi plays the melody on harmonium as a
pitch guide, with tabla, dholak or drums in any of nineteen taals (Tagore's own six among
them) and a tanpura drone, all on one clock so the rhythm never drifts from the melody.
It highlights the beat you are on, with the lyric underneath. You write a song in a box
for each beat, laid out by the taal, or as free text, or by playing it on a MIDI keyboard.
It keeps a library of your songs, each with its own sound and notes, and sections with
their own tempo or taal (for songs in taal pherta). It listens through the microphone and
shows how in tune you sing, records takes to play back against the guide, finds your Sa
from your range, times a held note, runs a daily rewaz routine hands-free, and logs your
practice. It prints a clean sheet, in day or night colours on screen. Everything stays
on your device.

## Try it

https://rinatmalik.github.io/Gaaner-Sathi/ keeps your songs in your browser, with no
account. To move them to another device, use **Back up all my songs** and **Import**.

## Status

The features come first, then one design across them, then a native mobile app
([roadmap](docs/ROADMAP.md)). The features Rinat has asked for so far are built and
live; the design is next.

## Find your way around

| Path | What it holds |
|---|---|
| [`CONTEXT.md`](CONTEXT.md) | The project's shared state: direction, working rules, current state, decisions, newest work log |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | The phases, what is built, ideas to pick from next |
| [`docs/HISTORY.md`](docs/HISTORY.md) | Older work log entries and decisions |
| [`docs/NOTATION.md`](docs/NOTATION.md), [`ENGINE.md`](docs/ENGINE.md), [`DATA.md`](docs/DATA.md) | How the notation, the sound and the data work |
| [`index.html`](index.html), [`src/`](src/) | The app: the pure core (`src/core/`), the sound (`src/audio/`) and the screen (`src/app/`) |
| [`tests/`](tests/) | The tests |
| [`reference/`](reference/) | The original single-file prototype and its test suites |

## Develop

Needs Node 24 LTS.

    npm install
    npm test            # all tests (Vitest), including comparisons with the prototype
    npm run typecheck   # TypeScript, including the DOM-free check on src/core
    npm run dev         # dev server: the app at /, the audio check at /dev/render.html
    npm run build       # the published files, in dist/

`bash reference/tests/run-all.sh` runs the prototype's own suites. GitHub Actions runs
everything on every push to `main` and publishes the app.

## Licence

No licence has been chosen yet, so all rights are reserved.
