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

### 1. Song library (built 2026-10-10)

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

### 2. Pitch feedback from the microphone (built 2026-10-10)

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

### 3. Rewaz routine and practice log (built 2026-10-10)

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

### 4. Each song remembers its own sound (built 2026-10-11)

- A song keeps its own Melody and Rhythm settings: the guide, the harmonium's reeds, the
  drone and its tuning, the rhythm style, its volume, speed, fills and layers. The first
  change made while the song is open saves the whole set with it, so it sounds the same
  later whatever else changes.
- Exercises, new songs and songs not yet changed use "your usual sound", which changes
  when a setting is changed on an exercise. "Use my usual sound" makes a song use it again.
- The Practice settings (count-in, the guide on repeats, the tempo trainer) stay the same
  for every song. In song files the sound is an optional field (still version 1).

### 5. More taals (built 2026-10-11)

Tagore's own six (Jhampak, Shashthi, Rupakra, Nabatal, Ekadashi, Nabapanchatal), then
Khemta, Deepchandi, Dhamar and Jhumra: each with its theka on the tabla, and patterns for
the dholak and drums (`docs/ENGINE.md` → Taals). The taal picker groups them.

**Done when (4 and 5):** Rinat has set up a few songs' sounds and found them kept, and the
new thekas sound right to Rinat.

### 6. Rinat's ten picks (built 2026-10-11)

Picked from the feature ideas, in Rinat's words where they matter:

- **Beat boxes** for writing notation: "as soon as the taal is chosen, it is known how many
  beats there need to be". A box per beat, laid out by the taal; typing a space or pasting
  "সা রা গা মা" fills a box each; headings, words and the free text are kept as they are
  (NOTATION.md → Beat boxes). Free text stays one tap away.
- **A Voice tab:** a range finder (sing your lowest and highest notes; it suggests your Sa,
  and the best Sa for the open song) and a hold-a-note trainer for breath and steadiness.
- **Takes:** record while playing, play back against the guide (ADR-004).
- **MIDI keyboards**, any brand: type a song by playing it, play the guide on the
  keyboard's own sound, and the keys to press for each note (ADR-005).
- **Sections:** jump between them by their headings; a tempo per section.
- **A notes field per song;** **print or save as PDF;** **day and night colours.**

**Done when (6):** Rinat has used them on real songs: written a song in the boxes, found a
Sa, held a note, recorded and played back a take, connected the CT-X3000 (typing and the
guide), jumped between sections, printed a sheet.

### 7. Next, as Rinat chooses

- Anything left in Feature ideas below that Rinat picks.

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
  (S). (Jumping between sections and a notes field per song were built on 2026-10-11.)
- **Voice and ear:** free singing with the drone and the pitch meter, no song needed
  (S); sing-back ear training: the app plays a phrase, the singer repeats it, it scores
  (M). (The range finder and the hold-a-note trainer were built on 2026-10-11.)
- **Keyboards:** typing a song in time as it is played (the rhythm from the playing, not
  just the notes) (M). (Step typing, the guide on the keyboard and the keys to press were
  built on 2026-10-11, for any MIDI keyboard.)
- **Notation and rhythm:** ornaments: meend, kan, andolan, murki, khatka in notation and
  playback (L). (Tagore's taals and four more, a tempo per section and printing were built
  on 2026-10-11.)
- **Recording:** practise with a recording of the original song: loop a section, slow it
  without changing the pitch, shift the key (L). (Takes were built on 2026-10-11.)
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
- **Permanent web address** (`CONTEXT.md` → Open question 3): the address the app lives at
  (now rinatmalik.github.io/Gaaner-Sathi), not one per song. A browser keeps each site's
  saved data under the site's address, so if the app later moves to another address (say
  gaanersathi.rinatmalik.com), every user's songs stay behind at the old one until they back
  them up there and import them at the new one. Settle it before anyone besides Rinat relies
  on the web app.
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
