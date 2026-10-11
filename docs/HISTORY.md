# History

> What is no longer current, kept word for word from `CONTEXT.md` so the reasons behind
> things can be traced: finished work items, decisions no longer in force, and older work log
> entries (newest first). Git history holds every earlier version of every file.

## Finished work items

| ID | Owner | Status | Scope / paths | Acceptance evidence | Notes |
|---|---|---|---|---|---|
| PH0-01 | Claude | Done | framework docs, `docs/`, `reference/`, CI; remove `handover/` | Handover merged and removed; reference suites green locally and in CI run `38001060696`; pushed (`c0b057c`) | Framework and repo setup |
| PH0-02 | Claude | Done | `src/core/`, `src/audio/dsp/`, `tests/`, `package.json`, configs, CI | 69 reference tests and 12 exercises ported one-for-one and green; differential tests against the prototype green and shown to catch injected bugs; `src/core` type-checks with no DOM library; CI run `38005291130` green (`8b5b933`) | Core port |
| PH0-03 | Claude | Done | `src/audio/`, `tests/differential/`, `dev/` | Identical recorded Web Audio calls to the prototype for 16 sessions, every lane, closing strokes and live controls (17 tests, 5 injected bugs caught); Chromium offline renders match the prototype within its own run-to-run variation; commits `ded3ee4`, `218467a` | Audio engine and transport |
| PH0-04 | Claude | Done | `src/app/`, `index.html`, `vite.config.ts`, `tests/` | 69 of 71 `docs/PARITY.md` items Done and 2 Ported (Bluetooth latency, wake lock: need a phone); rendering identical to the prototype's in differential tests; every view checked at 360 px in both themes in headless Edge (Work log 2026-10-10 12:00); Rinat tried it on a phone and a laptop and kept the folding Sound settings | The prototype's screen, plus foldable Sound settings |
| PH0-05 | Claude | Done | CI deploy job | CI run `38073368085` (`ee7bf13`) green; the live root serves the new app and `/new/` forwards to it; in headless Edge the live page loads exercise 3, plays with the highlight moving, no console errors (Work log 2026-10-10 20:00) | The new app at the site's root |

## Decisions no longer in force

Superseded by a later row (in `CONTEXT.md` → Decisions, or below), or done and only of
historical interest.

| Date | Decision | Authority / evidence | Consequence |
|---|---|---|---|
| 2026-10-09 | Handover pack merged into the framework: kickoff → this file, `docs/ROADMAP.md`, `docs/PARITY.md`; specs → `docs/`; prototype and suites → `reference/`; `handover/` deleted. | Rinat, chat 2026-10-09 | The original pack stays in git history at `e0ea8d8`. This file is the hot path; `docs/` is cold. |
| 2026-10-09 | Stack and architecture baseline: TypeScript, React, Vite, Vitest, Playwright, Node 24 LTS; one package with a DOM-free core. | Kickoff §5 defaults; `docs/adr/ADR-001-stack.md` | Node 24 needed on every dev machine; core tests run in plain Node. |
| 2026-10-09 | Decision records: every decision gets a row here; one with a real architectural trade-off also gets a short ADR in `docs/adr/`, linked from its row. | Claude, reconciling kickoff §2 with this log; confirmed by Rinat 2026-10-10 | One index of decisions, with depth where it is needed. |
| 2026-10-09 | `CHANGELOG.md` holds the user-facing notes; the Work log stays agent-facing. | Kickoff §8 | Superseded 2026-10-10 (no changelog). |
| 2026-10-09 | Licence GPL-3.0. | Rinat, when creating the repo (initial commit `4dfc1e2`) | Superseded 2026-10-10 (no licence for now). |
| 2026-10-10 | Clean project folder: removed `bootstrap.bat`, `CHANGELOG.md`, `.env.example` (no keys used), the empty `.agents/`, `reference/tests/README.md` (folded into `reference/README.md`), unused `.editorconfig` and `.gitignore` sections. | Rinat, chat 2026-10-10 ("remove anything unnecessary or obsolete") | All recoverable from git history. |
| 2026-10-10 | Roadmap trimmed: v1 is Phase 0 (port) and Phase 1 (publish); pitch feedback, recorded instruments, ornaments, riyaz routine and log, error reporting, accounts and native apps are parked ideas needing Rinat's go-ahead. | Claude, following Rinat's direction; `docs/ROADMAP.md`. Rinat can veto | Nothing lost: the kickoff's notes on parked ideas are kept. Partly superseded the same day (Phase 2 row below). |
| 2026-10-10 | Planned, not parked: pitch feedback from the microphone, then a daily rewaz routine with a practice log (Phase 2, in that order). Each song remembering its own rhythm, speed and drone settings stays in Phase 1. Recorded instruments, ornaments, error reporting, accounts and native apps stay parked. | Rinat, chat 2026-10-10 | `docs/ROADMAP.md` Phase 2 restored with the kickoff's design notes; the microphone privacy invariant is back. |
| 2026-10-10 | Continue the TypeScript port rather than grow the single HTML file. | Rinat, chat 2026-10-10 ("yes") | PH0-03 and PH0-04 go ahead. |
| 2026-10-10 | Publish the prototype on GitHub Pages now, as an interim, until the new app has a screen. | Rinat, chat 2026-10-10 ("yes") | A CI deploy job publishes `reference/gaaner-sathi.html` as the site after the tests pass; it needs Pages switched on once. |
| 2026-10-10 | The new app keeps the prototype's screen with one layout change, for Rinat to keep or undo: the Sound settings (Melody, Rhythm, Practice) fold away behind a bar that says what is on. They start folded on narrow screens and open on wide ones, then stay as the user leaves them. | Claude's proposal. Rinat (chat 2026-10-10) is unsure that an extra step is simpler: "only do the UI change that you want and let me decide after looking at it". Measured at 360 × 780: the prototype's settings fill 602 px before the song (sheet at 1,675 px); folded, the sheet starts at 1,131 px | Open question 5. Undoing it means removing the bar: the `.sound` wrapper in `index.html`, its CSS block and two functions in `app.ts`. |
| 2026-10-10 | The new app is published at `/Gaaner-Sathi/new/` beside the prototype until Rinat has looked at it; then it takes over the main address. | Claude, so Rinat can try it on a phone before deciding (Rinat asked to look first) | The deploy job builds the app and copies it to `_site/new/`. |

## Files removed

- 2026-10-11, making the docs lean (Rinat): `SECURITY.md` (generic framework rules, now in
  `CONTEXT.md` → Working rules → Secrets, privacy and safety); `docs/PARITY.md` (the Phase 0
  checklist: 69 of 71 prototype features Done, 2 Ported but needing a phone, wake lock and
  Bluetooth latency, now in `CONTEXT.md` → Current state); `docs/adr/ADR-001-stack.md`,
  `ADR-002-storage.md`, `ADR-003-pitch-feedback.md`, `ADR-004-takes.md`,
  `ADR-005-midi.md` (folded into `CONTEXT.md` → Conventions and the NOTATION, ENGINE and
  DATA docs). Last in commit `8170085`.
- 2026-10-10: `bootstrap.bat`, `CHANGELOG.md`, `LICENSE` (GPL-3.0), `.env.example`, the
  empty `.agents/`, `reference/tests/README.md` (Decisions above).
- 2026-10-09: `handover/`, merged into the framework (the original pack is at `e0ea8d8`).

## Work log, older entries

### 2026-10-11 02:20 BST — Claude (Opus 5.5) — PH1-06 Rinat's ten picks

- **Goal:** Rinat picked ten features before the design phase: a range finder (as a tab
  beside Rewaz and Progress); MIDI (type a song on the keyboard, the guide on the Casio's
  harmonium voice, the key to press for each note), brand-agnostic and light; record takes
  and play them back against the guide; notes per song; jump between sections by heading;
  a hold-a-note trainer; a tempo per section; print or PDF; night and day; and a structured
  way to write notation (a box per beat, filled like 2FA boxes), keeping headings and
  comments working. Rinat also asked what the "permanent web address" question means.
- **Inspected:** the notation parser, edit operations and checker; `app.ts`, `view.ts`,
  `store.ts`, the transport, mic and pitch code; DATA, NOTATION, ENGINE, ROADMAP; Casio's
  CT-X3000 pages (it is General MIDI level 1, 16 parts; its MIDI implementation PDF was not
  reachable, so channel and tone details are not claimed).
- **Changed:** `741eb4a` (day and night; notes per song); `232d771` (sections and their
  tempo; `src/core/notation/sections.ts`, `tempoAt` in the transport); `1a2d9d1` (print or
  PDF); `d5d7bcf` (beat boxes: `src/core/notation/boxes.ts`, `src/app/boxes.ts`); `84a04ce`
  (the Voice tab: `src/core/pitch/voice.ts`, `src/app/voice.ts`, "your Sa"); `9c7d03f`
  (takes: `src/audio/recorder.ts`, `src/audio/dsp/pcm.ts`, `src/core/practice/take.ts`,
  `src/app/takes.ts`, ADR-004); `4799fa6` (MIDI and the keys: `src/audio/midi.ts`,
  `src/app/keyboard.ts`, `onNote`/`localGuide` in the transport, ADR-005); this commit
  (README, NOTATION, DATA, ENGINE, ROADMAP without Rinat's blank lines, this file).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through
  the DevTools protocol on `npm run dev`, real key and mouse events, profiles under %TEMP%):
  - `npm run typecheck` → 0; `npx vitest run` → 28 files, 285 passed (59 new: notes and
    theme 3, sections 8, print 2, boxes 15, voice 13, pcm 3, takes 6, MIDI 8, store 1);
    `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid;
    `tests/differential/audio.test.ts` 17/17 after the transport changes (section tempos,
    guide notes out); `npm run build` → 176 kB JS (62.6 kB gzip), 31 kB CSS.
  - Theme and notes (20 checks): Auto follows the device, Day and Night override it and
    survive a reload with no flash; notes saved, shown, searched, copied, removed when
    emptied. Sections (15): buttons named by headings (আরোহ / অবরোহ on exercises), a tap
    plays from there and loops the section; the deck follows each section's tempo while
    playing (120 → 184 → 80) and writes a change into its heading; a Bengali `লয় ৮০` read.
    Print (7): the button and Ctrl+P fill a print-only sheet, black on white in night
    colours, PDF named after the song; `Page.printToPDF` made a 51 kB PDF.
  - Beat boxes (29): typing `s`, `a`, space, `re ga ma` gives `S R G | M`; Bengali; a pasted
    line fills a row and spills into a new one; Backspace goes back and removes a beat;
    words a beat each, a gap held with `-`; Enter puts a line in between; Ctrl+Z; + Heading
    with a tempo; ↑ Higher on the box; note buttons; Free text both ways; Teentaal regroups;
    a reload keeps it. Bugs found and fixed: lines started from one beat never got bars;
    two rows of empty boxes after an unfinished last line; lyric bars not shifting when a
    beat is removed; verses gaining bars they never had.
  - Voice with WAVs as the microphone: range (16): B2 held, A4 only passed through, G4 held →
    lowest B2, highest G4, "Your Sa: E (White 3), low octave"; Use as my Sa → exercises and
    new songs in E3; for a song from `.পা` to `র্সা`, F♯ fits; kept after a reload. Hold (10):
    a 6 s C4 held 5 cents sharp → "Held 6.0 s, very steady (±5 cents), in tune", best kept.
  - Takes with a WAV microphone (21): Record me → each play a take (a 15 s play after the
    count-in: a 16.8 s take, 808 544 bytes of 24 kHz samples in IndexedDB, delay 0.062 s);
    kept after a reload; Just me; With the guide stopped by itself 17.0 s after the tap;
    not logged as practice (the recorded play was); WAV download (RIFF, 24 kHz, 808 588
    bytes); a changed notation noted; delete asks first and removes the samples. Bugs found and
    fixed: a take ending while the next started shared state; editing a song did not
    refresh its takes' notes.
  - MIDI with a stand-in keyboard (20): connect, keys typed as beats from Sa C4
    (`সা রা পা | র্সা .পা`), an octave typed once, out-of-range refused; the guide on the
    keyboard: bank 0 / program 20 first, then notes on and off 83–130 ms ahead, spaced
    545 ms at 110 a minute, first note included; all-notes-off twice on Stop; nothing sent
    on "This device"; the drawn keys light in turn and stay on after a reload. Bug found and
    fixed: the first note was sent at once (stamped in the past, then 32 ms early): the
    audio clock's reading drifts ~32 ms over its first 20 ms (measured), so notes wait for it.
  - 360 px in both themes for every view touched: no sideways scrolling.
  - CI runs `38097120319` (`1a2d9d1`), `38098253189` (`d5d7bcf`), `38098711083` (`84a04ce`),
    `38099833105` (`9c7d03f`), `38100429528` (`4799fa6`): all green, deployed. Live
    (`s_live`): six tabs with Voice, section buttons, record, keys, print and keyboard
    controls, exercise 3 plays, a song typed in boxes, no console errors; `/` 200, `/new/` 200.
- **Decisions made:** see Decisions log (the 2026-10-11 rows on beat boxes, section tempo,
  your Sa, takes, MIDI, the Voice tab); ADR-004, ADR-005; Open question 3 reworded.
- **Risks or disagreements:** nothing here has met a real voice, ear or keyboard. The beat
  boxes are Claude's reading of Rinat's idea (lines a cycle long, writing over on paste);
  phone keyboards (Gboard, Avro) were not tried. MIDI is untested on the CT-X3000: which
  tone channel 1 plays and whether its GM reed organ answers are guesses until Rinat tries.
  Takes line up by the delay pitch feedback found (or the device's guess): Rinat should
  listen for a voice late against the guide. The Sa suggestion assumes songs span mandra Pa
  to taar Ga. IndexedDB can be evicted under storage pressure; Download is the safe copy.
  The deck and settings keep growing above the views: for the design phase.
- **Next handoff:** Rinat tries the ten on real songs; then the design phase.

### 2026-10-11 00:40 BST — Claude (Opus 5.5) — PH1-04 each song's own sound; PH1-05 more taals

- **Goal:** Rinat checked the three features and asked for two more, only these: each song
  remembers its own sound (rhythm, drone, guide); Tagore's own taals (Jhampak, Shashthi,
  Nabatal, Ekadashi, Rupakra, Nabapanchatal), plus Deepchandi, Dhamar, Jhumra and Khemta.
  The rest comes in a separate session.
- **Inspected:** the taal tables, rhythm engine and bol map; the Sound settings' wiring in
  `app.ts`; the song model, files and storage; the comparison tests. For the taals:
  gitabitan.net's page on the taals Rabindranath made (fetched over plain HTTP: its HTTPS
  certificate is for another name), geetabitan.com's taal pages (Dhamar, Khemta, Kashmiri
  Khemta) and search results for Deepchandi, Jhumra and Khemta. tablatheka.com's pages now
  redirect through other domains, one of them a gambling site, so they were not followed.
- **Changed:** `31726ce` (ten taals, their dholak and drum patterns, the mridanga bols,
  the grouped picker, tests, the dev audio check); `588ed8c` (each song's own sound:
  `src/core/song/sound.ts`, the song model, files, storage, the app, a note in the Sound
  settings, tests); `e1eb3e5` (the comparison tests read the prototype with LF endings);
  this commit (README, DATA, ENGINE, ROADMAP without Rinat's draft, this file).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through
  the DevTools protocol):
  - `npm run typecheck` → 0; `npx vitest run` → 21 files, 226 passed (10 taal and 8
    sound tests new); `npm run build` → 120 kB JS (42.5 kB gzip), 24 kB CSS;
    `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid.
  - Commits alone, each in a detached worktree after `npm ci`: `31726ce` with the
    prototype file checked out with LF endings, as CI has it → `npm ci` 0, type-check 0,
    20 files, 218 passed; `e1eb3e5` on a default Windows (CRLF) checkout → `npm ci` 0,
    type-check 0, 21 files, 226 passed. The first check of `31726ce` (CRLF) found that the
    view comparison could not load at all on a Windows checkout, because its markers
    expect LF: broken since the interface port, fixed in `e1eb3e5`.
  - The comparison tests still check the prototype's six taals exactly. A first version of
    the "–Dha" strip label changed the prototype's own Rupak label at double speed (the
    bols of a beat are listed in theka order, not time order); those tests caught it.
  - Audio (`npm run dev`, `/dev/render.html` in headless Edge, OfflineAudioContext 48 kHz):
    the port still matches the prototype (largest difference 2.5e-6, against its own
    run-to-run 2.3e-6). The new taals: tabla −18.4 to −21.9 dB RMS (Dadra −19.4), dholak
    −20.3 to −22.6, drums −22.7 to −25.7, peaks −1.9 to −3.8 dBFS; the beats that start
    silent are exactly the rests (Deepchandi 3, 7, 10, 14; Dhamar 7, 14; Jhumra 2, 9);
    light strokes −14 to −18 dB, like the prototype's Keherwa and Ektal.
  - The built site served like Pages at 127.0.0.1:8085, scenario `taals1`: the picker in
    three groups (6, 6, 4). For each new taal, a song written to its vibhags gives the
    right name and vibhags, strip marks and theka (rests "·", Jhumra "–Dha"), start-beat
    options marking khali, sheet marks, and the checker happy with every bar; each plays;
    the taal survives a reload and shows in the Songs view; no console errors.
  - Scenario `sound1`: an exercise shows the usual sound, and Dholak set there changes it.
    A new song uses it ("uses your usual sound until you change something here"). Drums,
    Tanpura (turned on at half volume), 1st string Ma, Shaker and Double on the song are
    saved with it as the whole set, the usual sound untouched. The exercise is back on
    Dholak with no drone, and the song back on its own, also after a reload. A Soft guide
    set while playing is saved with the song; a copy keeps the sound; "Use my usual sound"
    on the copy removes it; export writes `sound` (version 1) and import brings it back;
    no console errors.
  - Scenario `sound2`: a rewaz of the song (Drums, Jhampak) and exercise 3 plays each item
    with its own sound (Drums, then Dholak) to "Rewaz done". At 360 px in both themes there
    is no sideways scrolling, the note and its button sit inside the page, and
    Nabapanchatal's 18-beat strip wraps by vibhag.
  - CI run `38094062227` (`e1eb3e5`): core, reference and deploy jobs green. Live: `/` 200
    (the app, 19,504 bytes) and `/new/` 200 (the forward page); in headless Edge the live
    app shows the three taal groups and the Sound note, and a new song in Deepchandi on
    dholak keeps its sound and plays, with no console errors.
- **Decisions made:** see Decisions log (the 2026-10-11 rows); Open question 5.
- **Risks or disagreements:** nobody has heard the new thekas. Three of Tagore's taals have
  only mridanga thekas, played here on a tabla; Dhamar's sam is a soft closed stroke; the
  dholak and drum patterns for the ten are Claude's own; each theka follows one source, so
  Rinat's teacher may play another. Changing the usual sound only on an exercise may not
  be obvious, though the note in the Sound settings says so. Rinat's draft of the next
  prompt sits uncommitted at the end of `docs/ROADMAP.md`.
- **Next handoff:** Rinat tries the two features (and the three before them); Rinat starts
  a separate session for the next features.

### 2026-10-10 20:00 BST — Claude (Opus 5.5) — PH0-05 done; Phase 1: library, pitch feedback, rewaz

- **Goal:** Rinat kept the folding Sound settings ("finalise it, log it"), set the order
  of work (features and functionality first; then the design; then a fresh native mobile
  app; the web screen only needs to stay responsive), and asked for three features (pitch
  feedback, a designed session routine, a library for many songs) plus a list of what
  else could be added.
- **Inspected:** the app's wiring (`app.ts`, `view.ts`, `store.ts`, `transport.ts`), the
  song model and files, exercise 3's notation; the live site after each deploy.
- **Changed:** `0a84814` (CI: the app at the site's root, `/new/` forwards); `ee7bf13`
  (roadmap reordered: Phase 1 features, 2 design, 3 native app, feature ideas, offline web
  app parked; this file's direction and decisions); `79cf406` (Songs view, tags and
  favourites, practice log); `44db208` (pitch feedback: FFT, McLeod detector, microphone,
  tracker, meter, trace, beat marks, scores); `0124537` (rewaz routines, rounds in the
  transport, Progress view); this commit (ADR-003, README, this file).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through
  the DevTools protocol on the built site served like Pages at 127.0.0.1:8085):
  - `npm run typecheck` → 0; `npx vitest run` → 19 files, 208 passed;
    `npm run build` → 114 kB JS (41 kB gzip), 24 kB CSS; `bash reference/tests/run-all.sh`
    → 31/11/10/12/5 passed, 12 exercises valid; `tests/differential/audio.test.ts` still
    17/17 after the transport gained `onBeat` and rounds.
  - CI runs `38073368085` (`ee7bf13`), `38074312838` (`79cf406`), `38075718866`
    (`44db208`), `38076752956` (`0124537`): core, reference and deploy all green. Live:
    `/` 200 (the app), `/new/` 200 (the forward page); in Edge `/new/` lands on `/`, all
    five views open, the starter routine shows, exercise 3 plays, no console errors.
  - Library (scenario `lib1`): 3 tagged songs imported; search "সোনার" (written "সো নার"
    across beats), "আমি তোমায়", "purano", "rupak" (a taal), "learning" (a tag) → 1, 1, 1,
    2, 1 results; tag, favourite and exercise filters; a star survives a reload; opening
    from the list goes to Practice; 12 s of practice logged (4 rounds), a 3 s listen not;
    tags edited in the editor update the chips; title sort remembered; the backup file
    carries tags and stars; 360 px both themes, no overflow; no console errors. Search on
    300 songs of about 4,000 characters: 53 ms to open the list, then 0.5–2.3 ms a
    keystroke (41 ms a keystroke before caching each song's search text).
  - Pitch: detector worst error 0.03 cents (pure tones) and 1.3 cents (sung-like), C2–C6
    at 44.1 and 48 kHz, 0.24 ms a window. Node end to end (the real transport, a
    synthetic singer 150 ms late with vibrato, a scoop and noise): in tune → 100, delay
    found 140 ms; 40 cents flat → 43. Edge with WAVs as the microphone: a steady Sa + 20
    cents (±10 cents vibrato) read 13–29 cents sharp, "You: সা"; exercise 3 sung in tune →
    every line 100, 37 beats marked, logged score 100 with per-line scores, delay found
    within the first line (260–280 ms, the fake file's offset); 35 cents flat → lines
    48–50, meter "35 cents flat"; 360 px both themes; no console errors. Bug found and
    fixed: the first note of each run was never scored (the transport schedules it inside
    `start()`, before the run had begun).
  - Rewaz (scenario `rewaz1`): the starter shows 4 items, about 3 min; a 2-item routine
    (line 1, 4 rounds, tempo 120; the second with the guide every other round) ran
    hands-free: rounds 1–4, "Next … starting in 4 s", "your turn" on rounds 2 and 4,
    "Rewaz done · 2 items in 35 s"; both logged at 120 with the routine's name; Skip
    moves to the next item; Play stops the rewaz; Progress shows the run of days, the
    week, the songs and the history; the log downloads (`gaaner-sathi-log`, 2 entries);
    360 px both themes; no console errors. Bugs found and fixed: the Rewaz and Progress
    tabs were not wired; the log kept the song's tempo, not the item's; the starter
    vanished once a routine was saved; "0 min" for under a minute; five tabs overflowed
    at 360 px (now they wrap).
- **Decisions made:** see Decisions log (the last nine 2026-10-10 rows); ADR-003.
- **Risks or disagreements:** nobody has sung into the real app yet, so the meter's
  thresholds (in tune within 15 cents; 100 within 10 cents, 0 from 60) and the delay
  finding need Rinat's voice. On a first run on a new device, the first second or two can
  compare against the wrong note until the delay is found. iOS Safari may move the sound
  to the earpiece once the microphone is on (the native app will manage audio sessions).
  The log shares localStorage with the songs: about 150 bytes a practice, so years fit,
  but a full browser would refuse writes (the status line says so). The deck and Sound
  bar sit above all five views, so on a phone the lists start well down the page (for the
  design phase).
- **Next handoff:** Rinat tries the three features and picks from Feature ideas; then
  "each song remembers its own sound" or Rinat's picks.

### 2026-10-10 12:00 BST — Claude (Opus 5.5) — PH0-04 interface; new app at /new/

- **Goal:** Rinat tried the live prototype (works, sound fine), doubts that tucking
  settings away is simpler, and asked for "only the UI change that you want" to look
  at. Port the screen to parity with that one change.
- **Inspected:** the prototype's whole interface script (lines 805–866, 1444–2324);
  the live prototype at 360 × 780 (Sound settings 602 px tall, sheet at 1,675 px).
- **Changed:** `6102b7f` (index.html, `src/app/` view, store, app, styles; tests
  `view.test.ts`, `store.test.ts`, prefs in `data.test.ts`); `9640ad8` (CI builds,
  deploys the app to `/new/`); this commit (ADR-002, ADR-001 settled details, DATA,
  PARITY, ROADMAP, README, CLAUDE.md, AGENTS.md, this file).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10):
  - `npm run typecheck` → 0; `npx vitest run` → 14 files, 153 passed; `npm run build`
    → 72 kB JS (25 kB gzip), 17 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5
    passed, 12 exercises valid.
  - Mutation check on the new comparisons: 6 planted bugs (bar span, round number,
    held-lyric pattern, loop wrap, 12-row limit, dropGuide migration) all failed tests
    and were restored byte-identical; the held-lyric one was caught only after adding
    em-dash lyric cases.
  - Headless Edge 155 (muted, throwaway profile) via the DevTools protocol, on the
    built site laid out like Pages (`/Gaaner-Sathi/` prototype, `/new/` app): a song
    saved through the prototype's own UI opens in the new app; count-in 6→1, beats,
    highlight and taal strip in time; Space stops; tempo, Sa, lines, loop, tempo
    trainer (200 → 210, "your turn" rounds), line tap, end of song ("Finished", stop
    after 1.24 s); Sound bar fold, summary, remembered state; editor (copy, title,
    taal, start beat, palette, octave up/down with the ±2 cap, Alt+↑, Join/Split and
    their refusals, identical to the prototype on the same steps, checker Fix and Show,
    undo with a mouse); export and backup files; import (3 songs, junk reported);
    delete with confirmation; new song; reload reopens the last song and tab; a song
    saved in a prototype frame and a rename in a second app frame show up live; the
    prototype's stored songs byte-identical throughout. Every view at 360 px in both
    themes: page width 360, no element past the edge; no console errors.
  - CI run `38046102749` (`9640ad8`) was still running when this entry was written.
- **Decisions made:** see Decisions log (the last four 2026-10-10 rows); Open question 5.
- **Risks or disagreements:** Rinat may prefer the settings always shown (undo is
  small). Wake lock and Bluetooth latency are ported but need a phone to check. Nobody
  has heard the new engine on a device yet. The first CI deploy of `/new/` must be
  checked (run above).
- **Next handoff:** Rinat's answer to Open question 5, then PH0-05 (new app at the
  root).

### 2026-10-10 09:30 BST — Claude (Opus 5.5) — PH0-03 audio engine; PH0-05 prototype live

- **Goal:** Rinat said yes to both: continue the port, and publish the prototype on
  GitHub Pages now. Port the audio engine and transport, proven identical to the
  prototype.
- **Inspected:** the prototype's audio engine, rhythm scheduling, voices, transport and
  live controls (lines 867–1560, 2098–2111); the GitHub Pages API (needs a login, so
  enablement could not be checked beforehand); action versions (configure-pages v6,
  upload-pages-artifact v5, deploy-pages v5).
- **Changed:**
  - `6a28b26`: CI deploy job (after the core and reference jobs, `main` only; publishes
    `reference/gaaner-sathi.html` as the site; runs queue instead of cancelling).
  - `ded3ee4`: `src/audio/` (engine, session, harmonium, tanpura, percussion, sound
    settings, transport, `dsp/pitch.ts`); `tests/differential/webaudio-recorder.ts` (a
    recording stand-in for Web Audio), the prototype's audio world in `prototype.ts`,
    `audio.test.ts` (16 sessions, every lane, closing strokes, live changes).
  - `218467a`: `npm run dev`, `.claude/launch.json`, `dev/render.html` + `render.ts`.
  - This entry's commit: this file, `docs/PARITY.md` (10 more rows → Core),
    `docs/ENGINE.md` (how the port's sound is checked, measured levels), `README.md`.
- **Tests / verification** (Git Bash, Node v24.20.0, npm 9.8.1, Windows 10):
  - `npx vitest run tests/differential/audio.test.ts` → 17 passed. Mutation check (a
    script applying one bug at a time, then restoring each file byte-identical):
    harmonium attack 28 → 29 ms failed 17/17; a tanpura gap 0.36 → 0.37 s failed 4;
    the mid tom 150 → 151 Hz failed 3; the tempo trainer one round early failed 1; two
    Web Audio calls swapped in `noiseHit` failed 15.
  - `npm run typecheck` → 0; `npx vitest run` → 12 files, 129 passed; `npm run
    test:reference` → 31/11/10/12/5 passed, 12 exercises valid.
  - `ded3ee4` checked alone in a detached worktree in the scratch folder: `npm ci` 0,
    both type-checks 0, 129 passed. (A first attempt with `git stash -u` could not
    remove the untracked `dev/` and `.claude/` folders and left a duplicate stash; the
    working tree was verified identical to it, apart from line endings, before
    dropping it. Now a gotcha under Conventions.)
  - Browser pane, `preview_start dev` → `/dev/render.html` (Chromium, OfflineAudioContext,
    48 kHz), five sessions: port vs prototype max sample difference 1.9e-6, 6.5e-6,
    5.1e-7, 0, 3.0e-7; prototype vs itself (control) 2.5e-6, 2.1e-6, 5.1e-7, 0, 3.0e-7.
    Same size, so Chrome's mixing order explains it. Levels −16.7, −16.4, −15.3, −29.9,
    −19.6 dB RMS; peaks −1.7 to −4.7 dBFS; no console errors.
  - Deploy: CI run `38036764465` (`6a28b26`) failed at configure-pages ("Get Pages site
    failed… Pages enabled… GitHub Actions"), core and reference jobs green; after Rinat
    switched Pages on, run `38037906311` (`218467a`) → core, reference and deploy all
    success. `curl` of https://rinatmalik.github.io/Gaaner-Sathi/ → 200, 139,839 bytes,
    byte-identical to `reference/gaaner-sathi.html`.
  - Browser pane on the live site: renders exercise 3; 360 × 780 viewport, page width
    360 (no sideways scroll); Play → "Stop", the page's AudioContext `running` and its
    clock advancing (2.0 s → 4.0 s); no console errors. The highlight did not advance
    because the pane drew no frames (0 `requestAnimationFrame` callbacks in 2 s: the
    pane was off-screen), which is the test environment, not the site.
- **Decisions made:** see Decisions log (the last three 2026-10-10 rows).
- **Risks or disagreements:** nobody has heard the new engine yet. The renders match the
  prototype, but Rinat should listen once there is a screen. The live site is the
  prototype as-is: on an iPhone the ringer switch can silence Web Audio (known
  limitation, docs/ENGINE.md).
- **Next handoff:** PH0-04, the interface: then switch the deploy job to the built app.

### 2026-10-10 01:05 BST — Claude (Opus 5.5) — roadmap and hosting decisions

- **Goal:** record Rinat's answers (GitHub Pages, keep every feature) and bring pitch
  feedback and the rewaz routine back into the plan; answer whether the Bengali folder
  name causes problems and why the TypeScript port was needed.
- **Inspected:** this session's tool runs for any path trouble (none: git, Node 24, npm,
  TypeScript 7, Vite, Vitest, Git Bash, PowerShell and CI all worked with the Bengali
  path); a web search on Android builds and non-ASCII paths (community reports of the
  Android Gradle plugin's "Your project path contains non-ASCII characters" error,
  still seen with plugin 8.2.2, and the `android.overridePathCheck=true` override).
- **Changed:** `docs/ROADMAP.md` (Phase 2 restored: 1. pitch feedback, 2. daily rewaz
  routine and practice log, with the kickoff's design notes and done criteria; recorded
  takes marked optional; Phase 0 deploy on GitHub Pages; ASCII-path note for a future
  Android build); this file (direction, roadmap summary, microphone privacy invariant,
  decisions, open questions 3, 5, 6, PH0-05, path gotcha, current state);
  `SECURITY.md` (microphone line).
- **Tests / verification:** documentation only; no code changed, so no test run.
- **Decisions made:** see Decisions log (the last three 2026-10-10 rows).
- **Risks or disagreements:** Rinat questioned the TypeScript port; Claude recommends
  continuing it and holds PH0-03 until Rinat answers (Open question 5), to avoid
  rework.
- **Next handoff:** Open questions 5 and 6, then PH0-03.

### 2026-10-10 00:40 BST — Claude (Opus 5.5) — PH0-02 (and Rinat's setup answers)

- **Goal:** apply Rinat's answers (decisions, a clean folder, a lighter plan); port the
  pure core to TypeScript with the reference suites carried over one-for-one.
- **Inspected:** the Node upgrade (node 24.20.0; npm still 9.8.1, from an old global
  copy in `%APPDATA%\npm`, because the upgrade left Program Files' npm at 9.8.0); every
  invisible or look-alike character in the prototype's parser and tests, by code point
  (only the ZWNJ/ZWJ/BOM set and one ZWNJ in a parser test case).
- **Changed:**
  - `4d21c9c`: removed `bootstrap.bat`, `CHANGELOG.md`, `LICENSE`, `.env.example`, the
    empty `.agents/`, `reference/tests/README.md` (folded into `reference/README.md`) and
    unused config sections; ADR-001 revised (no React, Playwright or IndexedDB); roadmap
    trimmed to port and publish, the rest parked; this file, CLAUDE.md, AGENTS.md and
    SECURITY.md updated for the answers.
  - `00e5768`, `7e7de7a`: `package.json` (typescript 7.0.2, vite 8.3.4, vitest 5.0.3,
    exact; no runtime dependencies), `tsconfig.json`, `tsconfig.core.json` (no DOM
    library for `src/core`, `src/audio/dsp`), `vitest.config.ts`; `src/core/notation`
    (parse, edit, check), `src/core/taal` (taals, rhythm), `src/core/exercises` (specs
    generated byte-for-byte from the reference generator by a one-off script, the
    generator, the 13-item list), `src/core/song` (model, file),
    `src/audio/dsp/ksPluck.ts`. One deliberate change from the prototype: a taal name
    inherited from Object (`constructor`, `toString`…) or a non-string now normalises
    to Dadra; the prototype accepted it and then crashed on play. `00e5768` also adds
    `reference/tests/package.json` (CommonJS) and ignores `.vitest/`.
  - `8b5b933`: `tests/differential` (port versus the prototype's code, cut out of the
    HTML) and a CI core job.
  - This entry's commit: `docs/NOTATION.md` (BOM line), `docs/PARITY.md` (22 rows →
    Core), this file.
- **Tests / verification** (Git Bash, Node v24.20.0, npm 9.8.1, Windows 10):
  - `npm run typecheck` → exit 0. A probe file in `src/core` using `document`, `window`
    and `console` made `npx tsc -p tsconfig.core.json` fail (TS2584, TS2304; exit 1) and
    passed the full config; probe removed.
  - `npm test` → 11 files, 112 passed, 0 failed, 8.1 s: ported parser 31, checker 11,
    join-split 10, rhythm 12, tanpura 5 + 5 added, exercises 14 + 2 added;
    differential 13; unit 9. Each commit checked alone with the rest stashed:
    `00e5768` → typecheck 0, 52 passed, reference suites green; `7e7de7a` → typecheck 0,
    99 passed.
  - Mutation check: dropping `~` from the holds failed all 4 notation differential
    tests (the ported reference suites alone missed it); changing a tabla-fill
    velocity (0.3 → 0.31) and the string's DC blocker (0.995 → 0.9951) each failed one
    differential test. Files restored byte-identical (`cmp`).
  - Tanpura, 100 seeded plucks: worst pitch error 0.054 cents; −16.2 dB at 1.5 s
    (−18.6…−14.5) and −33.0 dB at 3.5 s (−37.2…−30.1) relative to the attack, matching
    ENGINE.md. A 504-beat song: 31 parse-and-check rounds in 38 ms (about 1.2 ms each).
  - `npm run test:reference` failed once after `"type": "module"` was added (`require
    is not defined in ES module scope`); after `reference/tests/package.json`: parser
    31/0, checker 11/0, join-split 10/0, rhythm 12/0, tanpura 5/0, exercises 12 valid.
  - `git push origin main` → `4da4f8d..8b5b933`. CI run `38005291130`: Core job (npm ci,
    typecheck, npm test) success; reference job success. This also proves the npm 9
    lockfile installs on Linux.
- **Decisions made:** see Decisions log (2026-10-10 rows).
- **Risks or disagreements:** the lighter stack and trimmed roadmap are Claude's
  proposals on Rinat's direction; Rinat may veto. The prototype treats a BOM inside a
  line as a space (JavaScript counts U+FEFF as whitespace), not as "ignored" as
  NOTATION.md said; kept for parity, doc corrected. No screen exists yet, so nothing is
  "done" in the app sense.
- **Next handoff:** PH0-03, the audio engine. Rinat's answers to Open questions 3
  (hosting) and 5 (features to drop) are needed before the deploy and the interface.

### 2026-10-09 23:45 BST — Claude (Opus 5.5) — PH0-01

- **Goal:** take over from the handover pack: read it, set up the repo on `main`, merge
  everything into the co-working framework, delete `handover/`, report conflicts.
- **Inspected:** `handover/KICKOFF.md`, `README.md`, `docs/NOTATION.md`, `ENGINE.md`,
  `DATA.md`; all of `reference/gaaner-sathi.html` (2,324 lines); `reference/tests/*`;
  the framework files; the GitHub repo (one commit `4dfc1e2`: GPL-3.0 `LICENSE`, a
  two-line `README.md`); the local toolchain (Node 20.5.1, npm 9.8.1, git 2.53).
- **Changed:** `git init -b main` on top of `origin/main`; commit `e0ea8d8` keeps the
  framework and handover as received. Then: specs moved to `docs/`, prototype and
  suites to `reference/` (`git mv`; `run-all.sh` marked executable); kickoff merged
  into this file, `docs/ROADMAP.md` (phases, done criteria, Phase 2 specs) and
  `docs/PARITY.md` (60-odd features traced through the prototype's code); new
  `docs/adr/ADR-001-stack.md`, `reference/README.md`, `CHANGELOG.md`, public
  `README.md`, `.github/workflows/ci.yml`; `CLAUDE.md`, `AGENTS.md`, `SECURITY.md`
  filled in; `.gitignore` trimmed to this stack; `.env.example` emptied (no keys);
  `handover/` removed.
- **Tests / verification:** `bash reference/tests/run-all.sh` (Git Bash, Node v20.5.1,
  Windows 10), run in `handover/reference/tests` before any change and again from
  `reference/tests` after the move, both times: parser 31 passed 0 failed, checker
  11/0, join-split 10/0, rhythm 12/0, tanpura 5/0, exercises 12 valid 0 failed,
  exit 0. Checked with node: `reference/exercises.json` equals the generator's
  output and the first 12 exercises embedded in the HTML (the 13th, the Sa Re Ga
  typing example, exists only in the HTML). `git diff -M --summary e0ea8d8 c684d36`:
  every moved spec, prototype and suite file is a 100% rename (unchanged).
  `git push origin main` → `4dfc1e2..c0b057c`. GitHub Actions run `38001060696`
  (`.github/workflows/ci.yml`, ubuntu-latest, Node 24) on `c0b057c`: completed,
  success, every step including `bash reference/tests/run-all.sh`.
- **Decisions made:** see Decisions log (2026-10-09 rows).
- **Risks or disagreements:** conflicts between the kickoff and the framework are
  listed in Open questions 5 and 8–12. The machine's Node 20.5.1 blocks the planned
  toolchain.
- **Next handoff:** PH0-02, the core port, once Node 24 is available (Open question 8).
