# Roadmap

> The plan, phase by phase, with what "done" means for each; what has been built; the ideas
> Rinat can pick from next; and the parked ones. The current task and the next action live in
> `CONTEXT.md` → Current state. How each built feature works lives in `docs/NOTATION.md`,
> `docs/ENGINE.md` and `docs/DATA.md`.

**The goal:** a practice companion a singer can use straightaway, with no tutorial, no
learning curve and no account. It plays the melody from the singer's own swaralipi with
rhythm and drone, keeps a library of songs, listens to the singer, and runs a daily rewaz.
The order (Rinat, 2026-10-10): features and functionality first, built in the web app; then
one intuitive design across all of them, in the web app; then a fresh native mobile app.

| Phase | What | Done when |
|---|---|---|
| 0 | Port the single-file prototype to a clean, light web app (done 2026-10-10) | done |
| **1 ◀ now** | Features and functionality, in the web app | Rinat has used every feature on real songs and is happy with what the app can do |
| 2 | Design: one intuitive design across every feature, in the web app | Rinat signs off the design |
| 3 | Native mobile app: a fresh build, Android first | The app on Rinat's phone does everything the web app does |

## Phase 0: the port (done 2026-10-10)

The prototype's core, rhythm tables, tanpura, audio engine and interface ported to
TypeScript, proven against the prototype by its own test suites (one-for-one) and by
comparison tests (call for call); one layout change Rinat kept (the Sound settings fold away
behind a bar that says what is on). Live at https://rinatmalik.github.io/Gaaner-Sathi/,
deployed from `main` on every push. `reference/` stays, unpublished: the comparison tests
use the prototype's own code as their oracle. The parity checklist is in git history
(`docs/PARITY.md`, removed 2026-10-11).

## Phase 1: features and functionality ◀ now

Built in the web app and kept as light as the rest: no runtime library unless it clearly
earns its place, and everything stays on the device. The screen stays tidy and responsive
(no sideways scrolling on a phone), but its look and layout wait for Phase 2. Features come
in only when Rinat asks for them.

### Built, waiting for Rinat to use them

| # | Feature | Built | Rinat's check (done when) |
|---|---|---|---|
| 1 | **Song library:** a Songs view with search (Bengali or Latin, across beats), sort, filters, tags and favourites; new song, import and backup | 2026-10-10 | Finding any of many songs takes a few keystrokes; tags and stars survive a reload, an export and an import |
| 2 | **Pitch feedback:** a live sharp-or-flat reading on every note, a trace, and a score for each note and line, from the microphone | 2026-10-10 | Rinat has sung a line and finds the reading believable |
| 3 | **Rewaz and progress:** routines of exercises and songs run hands-free (rounds, tempo, guide per item); every practice logged; Progress shows the run of days and history | 2026-10-10 | Rinat has done a full rewaz with it; the log survives a reload and downloads |
| 4 | **Each song's own sound:** a song keeps its Melody and Rhythm settings from its first change | 2026-10-11 | Rinat has set up a few songs' sounds and found them kept |
| 5 | **Ten more taals:** Tagore's six (Jhampak, Shashthi, Rupakra, Nabatal, Ekadashi, Nabapanchatal), Khemta, Deepchandi, Dhamar, Jhumra | 2026-10-11 | The new thekas sound right to Rinat |
| 6 | **Rinat's ten picks:** beat boxes for writing notation; a Voice tab (range finder, hold-a-note trainer); takes played back against the guide; MIDI keyboards of any brand (typing, the guide on the keyboard, the keys to press); sections with their own tempo; notes per song; print or save as PDF; day and night | 2026-10-11 | Rinat has written a song in the boxes, found a Sa, held a note, recorded and played back a take, connected the CT-X3000 (typing and the guide), jumped between sections, printed a sheet |
| 7 | **Beat boxes, round two:** lines dragged to reorder (and moved with ↑ ↓), copying lines, adding a note to a beat | 2026-10-11 | Rinat finds writing a song in the boxes convenient (Rinat, 2026-10-11: "all works") |
| 8 | **Beat boxes, round three:** ▶ Play on each line; Copy to the end, and several lines selected and copied at once; × at the top of a line; Enter for a second row of words instead of "+ words"; smaller notes in the editor | 2026-10-11 | Rinat finds writing a song in the boxes convenient |
| 9 | **Words and three more taals:** a line of words pasted under the notes is split into syllables, one to each note; Teora, Kawali and Garba (for Garba and Dandiya) | 2026-10-11 | Rinat's pasted lyrics land mostly right; the three thekas sound right |
| 10 | **Taal pherta:** a section's heading names a taal of its own (or it is picked beside the heading in the beat boxes); the section plays, is checked, laid out and shown in it, starting on its sam | 2026-10-11 | A song of Rinat's in taal pherta plays as Rinat sings it |

### Next, as Rinat chooses

Anything from Feature ideas below.

## Phase 2: design

One intuitive design across every feature, worked out in the web app once all the pieces
exist, so it is designed once: navigation between songs, practice, rewaz, voice and progress
(the deck and Sound settings now sit above every view); layout on a phone and a laptop; the
look in both themes; wording, and whether the interface should also be in Bengali. Includes
a short privacy note (nothing leaves the device) and an accessibility check (keyboard,
contrast, screen reader).

**Done when:** Rinat signs off the design.

## Phase 3: native mobile app

A fresh app, not a web page in a wrapper: Android first (an APK), iOS if wanted. Native audio
for low latency, the microphone, playing with the screen off, and offline by nature. Songs,
routines and the log move across through files.

- The pure core (`src/core`: notation, taal, exercises, song files, pitch and practice sums)
  stays free of the DOM, so it can be reused or ported one-for-one with its tests.
- Choose the stack at the start of the phase and record why (for example Kotlin with Jetpack
  Compose, or React Native, which could reuse the TypeScript core).
- Ask before creating developer accounts (Google Play has a one-off fee; Apple's is yearly).
- Build the Android app from a folder whose path has only ASCII letters: on Windows the
  Android Gradle plugin stops with "Your project path contains non-ASCII characters" (seen as
  recently as plugin 8.2.2; `android.overridePathCheck=true` in `gradle.properties` silences
  it, at your own risk).

**Done when:** the app is on Rinat's phone and does everything the web app does.

## Feature ideas (Rinat picks)

Sizes are rough: S a few hours, M a day or two, L more.

- **Learning songs:** play a line, then leave a gap to sing it back (call and response
  without looping) (S); memory mode that hides the notes, then the lyrics, line by line (S).
- **Voice and ear:** free singing with the drone and the pitch meter, no song needed (S);
  sing-back ear training: the app plays a phrase, the singer repeats it, it scores (M).
- **Writing the words:** type Bengali phonetically in the app (`amar` → আমার) without
  installing a keyboard (M). (Pasting a line of words split into syllables was built on
  2026-10-11.)
- **Moving and sharing:** one file that moves everything to another device (songs, practice
  log, rewaz routines, your settings) and brings it all back in (S); send a song to another
  singer as a link that opens it, no file needed (S); a teacher sets a routine and the student
  sends back scores (M).
- **Keyboards:** typing a song in time as it is played (the rhythm from the playing, not just
  the notes) (M).
- **Notation:** ornaments: meend, kan, andolan, murki, khatka in notation and playback (L,
  see Parked).
- **Recording:** practise with a recording of the original song: loop a section, slow it
  without changing the pitch, shift the key (L).
- **Practice habits:** suggestions of what to revise today (songs not practised for a while)
  (S); goals and daily reminders (native app) (S); a learning stage per song (new, learning,
  ready to perform) (S).
- **Hands-free:** a Bluetooth page-turner or foot pedal to play, stop and move between lines
  (S).
- **Sound:** recorded instruments (sampled harmonium, tabla, tanpura) instead of synthesis
  (L, see Parked).

## After the app is public (Rinat, 2026-10-11)

Big additions, to consider once the app is public and popular.

- **Hindi:** the interface in Hindi, and notation in Devanagari (सा रे ग म प ध नि, komal and
  tivra marks as Hindi books write them), alongside Bengali and Latin.
- **Western music:** practising with piano note names and staff notation (C D E, sharps and
  flats, time signatures instead of taals, a metronome or drum kit), and a piano sound for the
  guide.

## Parked (each needs Rinat's go-ahead)

- **Permanent web address** (`CONTEXT.md` → Open question 3): the app's address, not one per
  song. Each person's songs live in their own browser under the site's address, so if the app
  moves (say to gaanersathi.rinatmalik.com), everyone's songs stay at the old address until
  they back them up there and import them at the new one. Settle it before anyone besides
  Rinat relies on the web app.
- **Offline and installable web app** (service worker, web manifest): the native app will be
  offline by nature. Revisit if Rinat wants to practise offline before then.
- **Accounts and sync** across devices (Supabase or similar, edits resolved by `updatedAt`),
  still fully usable without an account. A server and an account are what it takes for songs
  to follow a singer between devices automatically.
- **Recorded instruments:** sampled harmonium (per reed), tabla bols retuned to Sa, dholak,
  tanpura strings and the percussion layers; keep the synth as a fallback; lazy-load sample
  packs and cache them; track every licence in `assets/LICENCES.md`; never sample the Casio's
  built-in voices. Ask Rinat where the recordings come from (real instruments Rinat records,
  or CC0/CC-BY packs) and about budget.
- **Ornaments in the notation:** parser, renderer (an arc over the meend, a small superscript
  for kan) and playback (pitch glides on the guide). Ask Rinat for diary photos showing how
  they are marked, and match those conventions.
- **Error reporting** (needs a third-party service; would send no song content, and be
  described in the privacy note before it is turned on).
