# Roadmap and done criteria

> Cold reference: open it when planning or closing a phase. The current phase and the
> next action live in `CONTEXT.md` → Current state. Merged from the handover kickoff
> on 2026-10-09 (original in git history, commit `e0ea8d8`); trimmed on 2026-10-10
> after Rinat asked for a very light app.

**The goal:** a very light, user-friendly web app that a singer can open and use
straightaway: no tutorial, no learning curve, no account. It plays the melody from
the singer's own swaralipi with rhythm and drone, works offline, and installs on a
phone like an app.

## Phase 0: port ◀ current

- Repo, CI, docs, ADR-001 (done 2026-10-09).
- Port the core to TypeScript, moving the reference suites across one-for-one first,
  then adding cases.
- Port the rhythm tables and the tanpura string model with their tests.
- Build the audio engine and the interface to parity with the prototype
  (`docs/PARITY.md`): the same capabilities, presented more simply. The essentials
  (song, play, tempo, key) are up front; everything else is one tap away.

**Done when:**
- every reference test passes against the new core;
- the exercises check clean;
- each feature in `docs/PARITY.md` works in the new app;
- a deploy from `main` is live (host: see `CONTEXT.md` → Open questions).

Then remove `reference/` (git history keeps it).

## Phase 1: publish

- Works offline and installs to the home screen (service worker and web manifest).
- Songs saved in the browser; import and export (backup) files.
- Opens on an exercise, ready to play, so the app never looks empty.
- A short privacy note: nothing leaves your device.
- Per-song sound settings: rhythm style, speed, layers, fills, reeds, drone and guide
  mode saved with each song, with device settings as the fallback. Cheapest now,
  before real users have data. They become optional fields in the export format.
- Rinat moves the songs across: open the prototype where the songs live (the claude.ai
  artifact), press **Back up all my songs**, then **Import** in the new app.

**Done when:**
- a public URL is live;
- Lighthouse PWA and accessibility checks pass;
- it works offline;
- Rinat has practised a full song on a phone and on a laptop.

## Parked ideas

None of these is planned. Each needs Rinat's go-ahead first, and should stay as light
as the rest of the app. Kept from the original kickoff so nothing is lost.

- **Pitch feedback from the microphone** (the kickoff called it the biggest one).
- **Recorded instruments** instead of synthesis.
- **Ornaments in the notation:** meend, kan swar, andolan, murki, khatka.
- **Daily riyaz routine and practice log.**
- **Error reporting** (needs a third-party service; would send no song content).
- **Smaller items:** a stage view (a full-screen note and lyric to read from a music
  stand); a Bengali interface; more taals (Deepchandi, Dhamar, Jhumra, Khemta); an
  on-screen keyboard showing the CT-X3000 key for each note.
- **Accounts and sync** across devices (Supabase or similar, edits resolved by
  `updatedAt`), still fully usable without an account.
- **iOS and Android apps:** Capacitor builds from the same code, native microphone
  permission and audio session (play while the ringer switch is silent), background
  audio, store listings. Ask before creating developer accounts.

### Notes for the parked ideas, if one is ever picked up

**Pitch feedback** (it could not run in the prototype because claude.ai blocks the
microphone):
- **Capture:** `getUserMedia` with echo cancellation, noise suppression and auto gain
  **off** (they distort pitch).
- **Detection:** a pitch detector (YIN or McLeod/MPM; the `pitchy` library implements
  MPM; check its licence first) in an AudioWorklet. Frames long enough for low male
  notes, down to about 80 Hz. About 40 readings per second.
- **Expected note:** compare each reading with the note the notation timeline expects
  at that moment, in cents from the song's Sa. Offer an "any octave" mode.
- **Live display:** cents off on a ±50 scale, in tune within ±15 cents, and how steady
  each held note is.
- **Scores:** per note and per line, combining pitch accuracy and onset timing.
- **Latency:** calibrate round-trip latency (play a click, detect it, store the offset).
- **Headphones:** recommend them, because the guide leaks into the microphone
  otherwise. Score the "your turn" rounds of call and response, which have no guide.
- **Takes:** record a take (MediaRecorder), store it locally, play it back against the
  guide, and let the user delete it.

**Recorded instruments:** sampled harmonium (per reed), tabla bols retuned to Sa,
dholak, tanpura strings and the percussion layers; keep the synth as a fallback;
lazy-load sample packs and cache them offline; track every licence in
`assets/LICENCES.md`; never sample the Casio's built-in voices. Ask Rinat where the
recordings come from (real instruments Rinat records, or CC0/CC-BY packs) and about
budget.

**Ornaments:** parser, renderer (an arc over the meend, a small superscript for kan) and
playback (pitch glides on the guide). Ask Rinat for diary photos showing how they are
marked, and match those conventions.

**Riyaz routine and practice log:** chain exercises and songs, each with its own tempo,
loops and guide mode, and run the session hands-free; log the date, duration, items,
tempo reached and pitch scores; history and streak views, with export.
