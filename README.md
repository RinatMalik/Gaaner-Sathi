# Gaaner Sathi · গানের সাথী

A practice companion for singers who learn Bengali songs from swaralipi (akarmatrik
notation). Type the notation once, and Gaaner Sathi plays the melody on harmonium as a
pitch guide, with tabla, dholak or drums in any of sixteen taals (Tagore's own six among
them) and a tanpura drone, all on one clock so the rhythm never drifts from the melody.
It highlights the beat you are on, with the lyric underneath. You write a song in a box
for each beat, laid out by the taal, or as free text, or by playing it on a MIDI keyboard.
It keeps a library of your songs, each with its own sound, notes and section tempos,
listens through the microphone and shows how in tune you sing, records takes to play
back against the guide, finds your Sa from your range, times a held note, runs a daily
rewaz routine hands-free, and logs your practice. It prints a clean sheet, in day or
night colours on screen. Everything stays on your device.

## Status

The port of the original single-file prototype is finished, and the app is live. Phase 1
([roadmap](docs/ROADMAP.md)), features first: the song library, pitch feedback from the
microphone, the rewaz routine with a practice log, each song's own sound, Tagore's taals
with four more, and Rinat's ten picks of 2026-10-11 (beat boxes, the Voice tab, takes,
MIDI keyboards, sections with their own tempo, notes, printing, day and night) are in.
The design comes after that, then a native mobile app.

## Try it

https://rinatmalik.github.io/Gaaner-Sathi/ keeps your songs in your browser, with no
account. Songs saved in the earlier prototype at the same address show up there too.
The prototype itself is [`reference/gaaner-sathi.html`](reference/gaaner-sathi.html):
download it and open it in a browser.

## Find your way around

| Path | What it holds |
|---|---|
| [`CONTEXT.md`](CONTEXT.md) | The project's shared state: direction, working rules, current state, decisions, work log |
| [`docs/`](docs/) | Roadmap, parity checklist, notation, engine and data specs, decision records, older work log |
| [`index.html`](index.html), [`src/`](src/) | The app: the page, the pure core (`src/core/`), the sound (`src/audio/`) and the screen (`src/app/`) |
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
