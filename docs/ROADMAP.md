# Roadmap and done criteria

> Cold reference: open it when planning or closing a phase. The current phase and the
> next action live in `CONTEXT.md` → Current state. Merged from the handover kickoff
> on 2026-10-09 (original in git history, commit `e0ea8d8`); trimmed on 2026-10-10
> after Rinat asked for a very light app, then pitch feedback and the rewaz routine
> were brought back the same day at Rinat's request.

**The goal:** a very light, user-friendly web app that a singer can open and use
straightaway: no tutorial, no learning curve, no account. It plays the melody from
the singer's own swaralipi with rhythm and drone, works offline, installs on a phone
like an app, and later listens to the singer: a live sharp-or-flat reading and a
daily rewaz routine.

## Phase 0: port ◀ current

- Repo, CI, docs, ADR-001 (done 2026-10-09).
- Port the core to TypeScript, moving the reference suites across one-for-one first,
  then adding cases (done 2026-10-10).
- Port the rhythm tables and the tanpura string model with their tests (done
  2026-10-10).
- Build the audio engine and the interface to parity with the prototype
  (`docs/PARITY.md`): the same capabilities, presented more simply. The essentials
  (song, play, tempo, key) are up front; everything else is one tap away. Nothing is
  dropped.

**Done when:**
- every reference test passes against the new core;
- the exercises check clean;
- each feature in `docs/PARITY.md` works in the new app;
- a deploy from `main` is live on GitHub Pages.

Then remove `reference/` (git history keeps it).

## Phase 1: publish

- Works offline and installs to the home screen (service worker and web manifest).
- Songs saved in the browser; import and export (backup) files.
- Opens on an exercise, ready to play, so the app never looks empty.
- A short privacy note: nothing leaves your device.
- **Each song remembers its own sound:** rhythm style, speed, layers, fills, reeds,
  drone and its tuning, and guide mode are saved with the song, with device settings
  as the fallback. Done here because it changes the data model, which is cheapest
  before real users have data. They become optional fields in the export format.
- Settle the permanent web address before this phase ends (songs are saved per
  address; see `CONTEXT.md` → Open questions).
- Rinat moves the songs across: open the prototype where the songs live (the claude.ai
  artifact), press **Back up all my songs**, then **Import** in the new app.

**Done when:**
- a public URL is live;
- Lighthouse PWA and accessibility checks pass;
- it works offline;
- Rinat has practised a full song on a phone and on a laptop.

## Phase 2: practice features Rinat wants, in this order

Kept light like the rest: no new runtime library unless it clearly earns its place,
and everything stays on the device.

### 1. Pitch feedback from the microphone

The biggest one for a singer: a live sharp-or-flat reading on every note and a score
for each line. claude.ai blocks microphone access on pages like the prototype, so this
only becomes possible in the web app.

- **Capture:** `getUserMedia` with echo cancellation, noise suppression and auto gain
  **off** (they distort pitch). Ask for the microphone only when the singer turns
  feedback on.
- **Detection:** a pitch detector (YIN or McLeod/MPM) in an AudioWorklet; hand-written
  and tested with synthetic notes, or the `pitchy` library (MPM) after a licence check.
  Frames long enough for low male notes, down to about 80 Hz. About 40 readings a
  second.
- **Expected note:** compare each reading with the note the notation expects at that
  moment, in cents from the song's Sa. Offer an "any octave" mode.
- **Live display:** cents off on a ±50 scale, in tune within ±15 cents, and how steady
  each held note is.
- **Scores:** per note and per line, combining pitch accuracy and onset timing.
- **Latency:** calibrate round-trip latency once (play a click, hear it back, store the
  offset).
- **Headphones:** recommend them, because the guide leaks into the microphone
  otherwise. Score the "your turn" rounds of call and response, which have no guide.
- **Takes** (optional; decide when building): record a take, keep it on the device,
  play it back against the guide, delete it. Recordings would need IndexedDB.

**Done when:** readings on synthetic test notes are within a few cents across the
singing range; the live reading and line scores work in the app at 360 px; Rinat has
sung a line and found the reading believable.

### 2. Daily rewaz routine and practice log

- Chain exercises and songs into one session, each with its own tempo, loops and guide
  mode, and run it hands-free.
- Log what was practised: date, duration, items, tempo reached and pitch scores.
- History and streak views, with export.

**Done when:** a routine of several items runs from start to finish without touching
the screen; the log survives a reload and exports to a file; Rinat has done a full
rewaz with it.

## Parked ideas

Not planned. Each needs Rinat's go-ahead first, and should stay as light as the rest
of the app. Kept from the original kickoff so nothing is lost.

- **Recorded instruments** instead of synthesis.
- **Ornaments in the notation:** meend, kan swar, andolan, murki, khatka.
- **Error reporting** (needs a third-party service; would send no song content).
- **Smaller items:** a stage view (a full-screen note and lyric to read from a music
  stand); a Bengali interface; more taals (Deepchandi, Dhamar, Jhumra, Khemta); an
  on-screen keyboard showing the CT-X3000 key for each note.
- **Accounts and sync** across devices (Supabase or similar, edits resolved by
  `updatedAt`), still fully usable without an account.
- **iOS and Android apps:** Capacitor builds from the same code, native microphone
  permission and audio session (play while the ringer switch is silent), background
  audio, store listings. Ask before creating developer accounts. Build the Android app
  from a folder whose path has only ASCII letters: on Windows the Android Gradle plugin
  stops with "Your project path contains non-ASCII characters" (seen as recently as
  plugin 8.2.2; `android.overridePathCheck=true` in `gradle.properties` silences it, at
  your own risk).

### Notes for the parked ideas, if one is ever picked up

**Recorded instruments:** sampled harmonium (per reed), tabla bols retuned to Sa,
dholak, tanpura strings and the percussion layers; keep the synth as a fallback;
lazy-load sample packs and cache them offline; track every licence in
`assets/LICENCES.md`; never sample the Casio's built-in voices. Ask Rinat where the
recordings come from (real instruments Rinat records, or CC0/CC-BY packs) and about
budget.

**Ornaments:** parser, renderer (an arc over the meend, a small superscript for kan) and
playback (pitch glides on the guide). Ask Rinat for diary photos showing how they are
marked, and match those conventions.
