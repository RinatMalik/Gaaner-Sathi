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
| 1 | Features and functionality, in the web app | Rinat has used every feature on real songs and is happy with what the app can do |
| **2 ◀ now** | Design: one intuitive design across every feature, in the web app | Rinat signs off the design |
| 3 | Native mobile app: a fresh build, Android first | The app on Rinat's phone does everything the web app does |

## Phase 0: the port (done 2026-10-10)

The prototype's core, rhythm tables, tanpura, audio engine and interface ported to
TypeScript, proven against the prototype by its own test suites (one-for-one) and by
comparison tests (call for call); one layout change Rinat kept (the Sound settings fold away
behind a bar that says what is on). Live at https://rinatmalik.github.io/Gaaner-Sathi/,
deployed from `main` on every push. `reference/` stays, unpublished: the comparison tests
use the prototype's own code as their oracle. The parity checklist is in git history
(`docs/PARITY.md`, removed 2026-10-11).

## Phase 1: features and functionality

Closed by Rinat on 2026-10-11 ("That's it for features"). Built in the web app and kept as
light as the rest: no runtime library unless it clearly earns its place, and everything
stays on the device. The screen stays tidy and responsive
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
| 11 | **Beat boxes, round four, and a gentle ending:** Copy keeps lines and Paste puts them after the line selected (in any song); the lines selected are dragged together; smaller boxes and preview, so an 8-beat line fits one row; the last note and the tail fade over a quarter second | 2026-10-11 | Rinat finds copying and moving lines easy, and the ending natural |

### Next, as Rinat chooses

Anything from Feature ideas below.

## Phase 2: design ◀ now

One intuitive design across every feature, worked out in the web app once all the pieces
exist, so it is designed once: navigation between songs, practice, rewaz, voice and progress
(the deck and the Practice settings sit above every view); layout on a phone and a laptop; the
look in both themes; wording, and whether the interface should also be in Bengali. Includes
a short privacy note (nothing leaves the device) and an accessibility check (keyboard,
contrast, screen reader).

**Done when:** Rinat signs off the design.

Begun 2026-10-11 with Rinat's comments on the screen as it is ("mostly design amends").

| # | Change | Made | Rinat's check (done when) |
|---|---|---|---|
| 1 | **Beat boxes, round five:** ▶ in front of each line, just under its number (icons only); no Copy on each line and no Done (select, Copy, then Paste as often as wanted); a heading's × at its top right; no preview beside the beat boxes, so they take the full width (a 16-beat line on one row from a 900 px window); a note followed by silence fades out gently | 2026-10-11 | Rinat finds the editor easier to manage |
| 2 | **Playing and the beat boxes, round six:** Pause, with a separate Stop; nothing that plays changes the Lines to practise; "Check my pitch" listens only while playing; each line's number and buttons (play this line, play from here, ×) the row's full height; the first beat of each vibhag coloured (sam, tali, khali) instead of X and 0; a tap anywhere on a row selects it, and rows light up under the pointer | 2026-10-12 | Rinat finds pausing, playing from a line and the new rows easy |
| 3 | **A song's sound and the Music library:** the harmonium, drone and rhythm move into Edit notation (Sound of this song, folded with a summary); the bar under the deck becomes Practice settings (the guide, now the same for every song, the count-in, the tempo trainer, the keyboard) with a link to the song's sound; Songs becomes the Music library, second after Practice; its rows light up under the pointer and end in two full-height buttons, Practise this song and Edit this song; My songs and Exercises have bigger headings and fold away | 2026-10-13 | Rinat finds setting up a song's sound, and finding and opening songs, easy |
| 4 | **Your own exercises, Practice settings in Practice, Rewaz as folding rows:** "List under: My songs / Exercises" in Edit notation, "+ New exercise" in the Exercises heading, copies of built-in exercises stay exercises; the Practice settings at the top of the Practice view; library headings fold wherever their row is tapped; a Songs chip; "Recently added or changed"; every rewaz routine a folding row with a full-height Start button, its items rows like the beat boxes' with full-height move and remove buttons | 2026-10-13 | Rinat adds an exercise of their own and builds a routine with it easily |
| 5 | **The exercises redone, warnings dismissed, sections dragged, routines filled at once:** Rinat's 12 exercises, unnumbered (long notes held two cycles, the alankars up to the upper octave and back, komal and tivra as one, three new alankars); Dismiss on each checker warning, kept while its line's notes stay the same; Exercises first in the Music library, each section dragged by a handle; "+ Add songs and exercises" ticks several at once, in the order they will play | 2026-10-14 | Rinat practises the new exercises and builds a routine in one go |
| 6 | **The Practice view redone:** the song line by line in one window (about seven lines, the line being sung third and large, sliding on a line as each plays), in place of the Now singing panel, the coming-up notes, the pitch box and the sheet: the words big with the notes small above, a pitch strip under every line (a bar for each note; the voice drawn over it while the pitch check listens), the beat sounding lit with a playhead, each line's score beside its number; the taal as a figure beside the line being sung (a shape per vibhag, a corner per beat: Keherwa two squares, Dadra two triangles) in place of the strip of bols; a settings button over the lines (lines shown, size, keys to press, octave); Print or save as PDF moves from Practice to each row of the Music library | 2026-10-15 | Rinat sings with it on a phone and a laptop and finds it easier to follow than the old panel and sheet |
| 7 | **The lines, round two:** each line's number box wider, the button itself (tapped anywhere), tinted red to green by the line's score; the taal figure as wide as the box, each beat drawing its edge on so a shape closes as its last beat ends, the beat's corner popping and sam pulsing; the run's average under the lines as it goes; the line over the lines gone (the box says Now, Round 2, Your turn, In 3, Paused, Done); lines shown (5, 7, 9, 12), which line is the one being sung, and the size of the words in the Practice settings; the keys to press taller | 2026-10-15 | Rinat finds the figure and the line colours useful while singing |
| 8 | **Scoring and the figure, round three:** the last 10 % of each note left out of its score; the taal figure's shapes one under another, as big as the box allows (at least 40 px each); the keys to press in a full-width section of their own, more keys on a wider screen, taller | 2026-10-15 | Rinat finds the scores fair and the keys easy to follow |
| 9 | **A cleaner Edit notation, and more:** the song's details, sound and file buttons in a folding Settings bar, the note buttons behind "+ Add notes"; how notes are written and the colours in one small menu in the header; delete from each of the user's Music library rows (asked in the row); a break between rewaz items, set per routine | 2026-10-15 | Rinat finds Edit notation tidier and the header cleaner |
| 10 | **Entering notes:** an Enter notes section with Write in and a note pad (Sa Re Ga Ma; Pa Dha Ni; komal and tivra; Hold, Silence, New line, Heading) between full-height buttons that move it an octave down or up; Undo, octave, Join and Split in a row under it; the song's sound a section of its own again ("+ Add notes" undone: it had meant the notes about a song) | 2026-10-15 | Rinat enters a song from the pad comfortably on a phone and a laptop |
| 11 | **One undo:** Undo and Ctrl+Z take back the song's text step by step whatever changed it (beat boxes, pad, free text, Join, Split, octave, heading), in either view; another song opened starts afresh | 2026-10-15 | Rinat finds Undo does what is expected |
| 12 | **The pad's octaves:** the note pad goes two octaves either side (lowest অতিমন্দ্র to highest অতিতার), as far as the notation reads; two dots for a note two octaves away | 2026-10-15 | Rinat enters the lowest and highest notes of a song from the pad |
| 13 | **The pad in colour, its tools beside it:** a faint colour for each octave (komal and tivra stronger); Undo, Lower/Higher and Join/Split in sections beside the pad (under it when narrow); Bengali two octaves up shown as two dots and written `সা''` | 2026-10-15 | Rinat finds the octaves and the tools easy to tell apart |
| 14 | ~~**Two short lines to a row** in the Practice view~~ — reverted the same day (`c277a8c`): Rinat wanted it in Edit notation; Practice keeps a line to a row, which shows it best | 2026-10-16 | — |
| 15 | ~~**Two lines to a row in the beat boxes**~~ — reverted the same day (`084274c`): too crowded for Rinat; the beat boxes keep a line to a row | 2026-10-16 | — |
| 16 | **Beat box fixes:** Join, Split, Higher and Lower work on the box chosen after typing in it, then move to the next box; New line puts the keyboard in the new line; each line's boxes centred, the beats kept aligned | 2026-10-16 | Rinat joins, splits and adds lines in the beat boxes without hunting for the result |
| 17 | **The tools kept in view:** Undo, Lower, Higher, Join and Split in a bar at the foot of the screen while the boxes or text are on it and the tools beside the pad are not | 2026-10-16 | Rinat edits a long song without scrolling up to the tools |
| 18 | **The note pad in the dock:** the pad's keys (notes, komal and tivra, Hold, Silence, New line) and octave buttons join the tools at the foot of the screen | 2026-10-16 | Rinat enters a long song's notes from the dock, on a laptop and a phone |
| 19 | **The next line readable ahead:** in Practice, the line after the one being sung has its words and notes as big; its pitch strip, and the rest, stay small | 2026-10-19 | Rinat reads the coming line while singing |
| 20 | **The pitch gauge:** in place of the text under the lines, a vertical gauge at the end of the line being sung: the note sung, a scale green, amber and red either side of the note expected, a marker sliding up when sharp and down when flat, the cents | 2026-10-19 | Rinat sings with the pitch check on and finds the gauge easier to read than the text |
| 21 | **Looking back at a run:** a tap or click opens any line to full size (big words, the tall strip, the voice thick) with each beat's cents under it; sung lines no longer stay faded; the footer's "Listening" text gone, the average first, the delay with the device's part; the gauge answers sooner | 2026-10-19 | Rinat finds where a song went wrong after singing it |
| 22 | **The device's delay, measured:** "Measure the delay" plays clicks and times them through the microphone; the delay under the lines splits into the device's and the voice's; once measured the voice is drawn when it was sung, keeping up with the playhead | 2026-10-19 | Rinat measures with the Scarlett and sees how much of the delay is the device's |
| 23 | **Judged when it was sung; one grid per song:** nothing fitted to the singing; the voice drawn, its colours, the gauge and the scores all at the time it was sung (the device's delay only); a note scored on all its readings, silence 0, unsung notes 0; each beat's lateness under it; how far behind the guide said, not taken off; every line of a song the same pitch strip, lowest note to highest | 2026-10-19 | Rinat sees true scores and works on their lateness |
| 24 | **Fair scoring, explained, and the data:** silence (consonants, breaths) and slides into a note left out, notes under half sung left out again; detector glitches read as no voice; the voice drawn in one octave (no flips); "How your singing is scored" at the foot of Practice; "Download the pitch data" after a run | 2026-10-20 | Rinat finds the scores fair, and sends Claude a run's data |
| 25 | **Session reports and song lengths:** each session in Progress (and a run just sung) has **Report**, a page on how it went (the score and a sentence, what went well and what to work on, timing, pitch, note by note, each line drawn, the song over time), and **For AI**, a JSON file with a brief for any AI and every note and reading; each session's detail kept from now on; how long each song plays at its tempo in Practice, Edit notation and the Music library | 2026-10-20 | Rinat reads a report after singing, gives an AI the file, and plans practice by the songs' lengths |
| 26 | **Progress redone:** four sections that fold and move as the Music library's (This week, Pitch over time, Songs and exercises, History); the week against the one before, in time and pitch; a line of each day's pitch score over 30 days; songs and exercises as library rows that open to practise, each with its scores' trend and the line that most needs work; each day's sessions as rows with Report and For AI at their end | 2026-10-20 | Rinat finds Progress as easy to read and arrange as the library, on a phone too |
| 27 | **Pitch song by song and note by note; starting afresh:** Progress's Pitch section for all songs and exercises or one (chosen there, or by a song's scores), over the last 30 or 90 days, the last year or all time: each day's average score by date, from the first day with a score to the last; and each note of the scale from the highest down, by octave, its average score as a bar and whether it is usually sharp or flat, with the best notes and those needing work in a sentence (the log keeps each session's notes). At the foot: **Download all practice data** (every session with its detail, one file with a brief for AI) and **Start afresh** (asked in place) | 2026-10-20 | Rinat sees which songs and notes improve, and can start the history again |
| 28 | **The notes on the keys, a report per song, titles of their own:** Note by note drawn on a harmonium's keys (Sa as C: komal and tivra are the black keys), each coloured by its score with ▲ ▼ for sharp or flat, a key tapped saying its numbers (in the session report too); Report and For AI on each song's row in Progress (all its practice on one page, and in one file); no two songs share a title (new, copied, imported, typed, and those already sharing one); Start afresh says "(delete all practice data)" and its Delete it all waits 20 seconds | 2026-10-20 | Rinat reads a song's progress in one page, and finds the keys clearer than bars |
| 29 | **One session deleted:** a bin at the end of each History session, asked in its row, deletes that session's log entry and detail (one interrupted by a call); the days opened in History stay open when Progress is drawn again | 2026-10-20 | Rinat removes an interrupted session without touching the rest |

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
