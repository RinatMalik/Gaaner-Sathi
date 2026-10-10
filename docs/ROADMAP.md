# Roadmap and done criteria

> Cold reference: open it when planning or closing a phase. The current phase and the
> next action live in `CONTEXT.md` → Current state. Merged from the handover kickoff
> on 2026-10-09 (original in git history, commit `e0ea8d8`). Reordered on 2026-10-10,
> when Rinat set the order: features and functionality first, in the web app; then the
> design, once every piece exists; then a fresh native mobile app.

**The goal:** a practice companion a singer can use straightaway: no tutorial, no
learning curve, no account. It plays the melody from the singer's own swaralipi with
rhythm and drone, keeps a library of many songs, listens to the singer (a live
sharp-or-flat reading and scores), and runs a daily rewaz routine with a practice log.
The web app is where the features are built and the design is settled; the finished
product is a native mobile app.

## Phase 0: port (done 2026-10-10)

- Repo, CI, docs, ADR-001 (done 2026-10-09).
- The core, the rhythm tables and the tanpura model in TypeScript, with the reference
  suites moved across one-for-one and differential tests against the prototype.
- The audio engine and the interface to parity with the prototype (`docs/PARITY.md`),
  with one layout change Rinat kept: the Sound settings fold away behind a bar that says
  what is on.
- The app at https://rinatmalik.github.io/Gaaner-Sathi/, deployed from `main` on every
  push.

`reference/` stays in the repo, no longer published: the differential tests use the
prototype's own code as their oracle for everything ported unchanged.

## Phase 1: features and functionality ◀ current

Built in the web app and kept as light as the rest: no runtime library unless it clearly
earns its place, and everything stays on the device. The screen stays tidy and
responsive (no sideways scrolling on a phone), but its look and layout wait for Phase 2.
Rinat's three, in this order of building:

### 1. Song library

Find and manage many songs.

- A **Songs** view listing every song and exercise: title, first lyric line, taal,
  tempo and key, tags, when it was last practised.
- **Search** as you type, in titles, lyrics and tags, in Bengali or Latin letters as
  written.
- **Sort** by recently practised, recently changed or title; **filter** by favourites,
  exercises or a tag.
- **Tags** (free text, such as "Rabindrasangeet" or "Learning") and a **favourite** star,
  saved with the song and in song files (optional fields, so files stay version 1).
- New song, import and "back up all my songs" live here.

**Done when:** finding any of 200 songs takes a few keystrokes; tags and favourites
survive a reload, an export and an import.

### 2. Pitch feedback from the microphone

The biggest one for a singer: a live sharp-or-flat reading on every note and a score
for each line. (claude.ai blocked the microphone for the prototype, so this only became
possible in the web app.)

- **Capture:** `getUserMedia` with echo cancellation, noise suppression and auto gain
  **off** (they distort pitch). Ask for the microphone only when the singer turns
  feedback on.
- **Detection:** a hand-written pitch detector (McLeod/MPM), pure and tested with
  synthetic notes. Frames long enough for low male notes, down to about 60 Hz; about 45
  readings a second. An AudioWorklet only collects samples, so the audio thread never
  does the maths. (Built 2026-10-10; measurements in `docs/ENGINE.md` → Pitch feedback.)
- **Expected note:** the note the notation expects at that moment, from the same clock
  that schedules the guide, in cents from the song's Sa. Any octave counts by default;
  an option makes the octave count too.
- **Live display:** cents off on a ±50 scale, in tune within ±15 cents, the note being
  sung, and a scrolling trace of the voice against the notes.
- **Scores:** per note (pitch accuracy on the steady part of the note, so a late start
  does not count twice) and per line; each beat on the sheet shows how it went. Timing
  (early or late) is not scored yet: it needs the true round-trip delay.
- **Latency:** the device's own estimate, refined from the singing itself (the delay at
  which the voice best fits the notes), and remembered for next time. This replaced the
  planned click measurement through the speakers, which cannot work with headphones.
- **Headphones:** recommended, because the guide leaks into the microphone otherwise.
  The "your turn" rounds of call and response have no guide, so they score only the
  voice.
- **Takes** (optional, later): record a take, keep it on the device, play it back
  against the guide. Recordings would need IndexedDB.

**Done when:** readings on synthetic notes are within a few cents across the singing
range; the live reading and line scores work in the app; Rinat has sung a line and
found the reading believable.

### 3. Rewaz routine and practice log

- **Routines:** chain exercises and songs into one session, each item with its own lines,
  rounds, tempo and guide, and run it hands-free from start to finish. A starter routine
  of warm-up exercises is ready the first time.
- **Practice log:** every practice is logged on the device: date, time, song, lines,
  rounds, tempo reached, pitch score.
- **Progress:** the streak, minutes per day, history by day, per-song totals; the log
  exports to a file.

**Done when:** a routine of several items runs from start to finish without touching the
screen; the log survives a reload and exports to a file; Rinat has done a full rewaz
with it.

### 4. Next, as Rinat chooses

- **Each song remembers its own sound** (planned since 2026-10-10): rhythm style, speed,
  layers, fills, reeds, drone and its tuning, and guide mode saved with the song, with
  the device settings as the fallback; optional fields in song files.
- Anything from Feature ideas below that Rinat picks.

**Phase done when:** Rinat has used every feature on real songs and is happy with what
the app can do.

## Phase 2: design

One intuitive design across every feature, worked out in the web app once all the
pieces exist, so it is designed once: navigation between songs, practice, rewaz and
progress; layout on a phone and a laptop; the look in both themes; wording (and whether
the interface should also be in Bengali). Includes a short privacy note (nothing leaves
the device) and an accessibility check (keyboard, contrast, screen reader).

**Done when:** Rinat signs off the design.

## Phase 3: native mobile app

A fresh app, not a web page in a wrapper: Android first (an APK), iOS if wanted. Native
audio for low latency, the microphone, playing with the screen off, and offline by
nature. Songs, routines and the log move across through the export files.

- The pure core (`src/core`: notation, taal, exercises, song files, scoring) stays free
  of the DOM, so it can be reused or ported one-for-one with its tests.
- Choose the stack at the start of the phase, with an ADR (for example Kotlin with
  Jetpack Compose, or React Native, which could reuse the TypeScript core).
- Ask before creating developer accounts (Google Play has a one-off fee; Apple's is
  yearly).
- Build the Android app from a folder whose path has only ASCII letters: on Windows the
  Android Gradle plugin stops with "Your project path contains non-ASCII characters"
  (seen as recently as plugin 8.2.2; `android.overridePathCheck=true` in
  `gradle.properties` silences it, at your own risk).

**Done when:** the app is on Rinat's phone and does everything the web app does.

## Feature ideas (not planned; Rinat picks)

Collected on 2026-10-10 for Rinat to choose from. Sizes are rough: S a few hours, M a
day or two, L more.

- **Learning songs:** play a line, then leave a gap to sing it back (call and response
  without looping) (S); memory mode that hides the notes, then the lyrics, line by line
  (S); jump between sections by their headings (sthayi, antara) (S); a notes field per
  song for meaning, source (Gitabitan, Swarabitan) or a teacher's comments (S).
- **Voice and ear:** free singing with the drone and the pitch meter, no song needed
  (S); a range finder that suggests the best Sa for the singer's voice (S); sing-back ear
  training: the app plays a phrase, the singer repeats it, it scores (M); a hold-a-note
  trainer for breath and steadiness (S).
- **The Casio CT-X3000:** type a song by playing it on the keyboard (MIDI over USB into
  notation) (M); play the guide on the Casio's own harmonium voice through MIDI (S); show
  which key to press for each note (S).
- **Notation and rhythm:** Tagore's own taals (Jhampak, Shashthi, Nabatal, Ekadashi,
  Rupakra, Nabapanchatal) and Deepchandi, Dhamar, Jhumra, Khemta (M); ornaments: meend,
  kan, andolan, murki, khatka in notation and playback (L); a tempo per section (S);
  print or save a clean swaralipi sheet as PDF (S).
- **Recording:** record takes and play them back against the guide (M); practise with a
  recording of the original song: loop a section, slow it without changing the pitch,
  shift the key (L).
- **Practice habits:** suggestions of what to revise today (songs not practised for a
  while) (S); goals and daily reminders (native app) (S); a learning stage per song
  (new, learning, ready to perform) (S).
- **Hands-free:** a Bluetooth page-turner or foot pedal to play, stop and move between
  lines (S).
- **Sharing:** send a song to another singer as a file or a link (S); a teacher sets a
  routine and the student sends back scores (M, needs sharing).
- **Sound:** recorded instruments (sampled harmonium, tabla, tanpura) instead of
  synthesis (L, see Parked notes).

## Parked

Each needs Rinat's go-ahead first.

- **Offline and installable web app** (service worker, web manifest; was Phase 1): the
  native app will be offline by nature. Revisit if Rinat wants to practise offline
  before then.
- **Permanent web address** (`CONTEXT.md` → Open question 3): songs are saved per web
  address, so settle it before anyone else relies on the web app.
- **Recorded instruments** instead of synthesis.
- **Ornaments in the notation.**
- **Error reporting** (needs a third-party service; would send no song content).
- **Accounts and sync** across devices (Supabase or similar, edits resolved by
  `updatedAt`), still fully usable without an account.

### Notes for parked ideas, if one is ever picked up

**Recorded instruments:** sampled harmonium (per reed), tabla bols retuned to Sa,
dholak, tanpura strings and the percussion layers; keep the synth as a fallback;
lazy-load sample packs and cache them offline; track every licence in
`assets/LICENCES.md`; never sample the Casio's built-in voices. Ask Rinat where the
recordings come from (real instruments Rinat records, or CC0/CC-BY packs) and about
budget.

**Ornaments:** parser, renderer (an arc over the meend, a small superscript for kan) and
playback (pitch glides on the guide). Ask Rinat for diary photos showing how they are
marked, and match those conventions.
