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

### 2026-10-16 BST — Claude (Opus 5.5) — PH2-15 two lines to a row in the beat boxes

- **Goal:** Rinat, after Claude's plan for the beat boxes: "Yes, build two lines to a row in
  the beat boxes as you described."
- **Inspected:** boxes.ts: `boxesHTML` (rows: number, beats, ▶ ≡ ×), `render`, focus and
  `leave` (which `rendering` silences), the drag code (`dragTo` by height alone, the drop
  marker), ↑ ↓ on a number, selection, `becomeLine`, the pad's `type`; the row styles.
- **Changed:** `a51b534` (feat(edit)): boxes.ts: `pairRuns` (pure: runs of rows that fit,
  paired from the first, one left over alone), `goesBefore` (pure: the drop rule),
  `pairUp` (after each draw: rows measured at full width, number + boxes + buttons, an empty
  row with a line's buttons; pairs wrapped in `.bxpair`; the line of the box being typed in
  keeps its pair), a ResizeObserver pairing again when the width changes (keeping the focus),
  the drag in two dimensions (`RowBox`, the marker across or down, the boxes clipped
  sideways while dragging); styles: `.bxpair`, `.bxbtn` 36 px, `.boxes.dragging`, the marker
  placed by JS; tests (boxes: `pairRuns`, `goesBefore`). This commit (docs): NOTATION (Beat
  boxes → Two lines to a row), ROADMAP (Phase 2 row 15), this file (the first PH2-14 entry
  moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`, with real mouse drags and clicks):
  - `npm run typecheck` → 0; `npx vitest run` → 36 files, 381 passed. `npm run build` →
    229.2 kB JS (81.3 kB gzip), 52.6 kB CSS; `bash reference/tests/run-all.sh` →
    31/11/10/12/5 passed, 12 exercises valid.
  - A Keherwa song (স্থায়ী of five 8-beat lines, four with words; অন্তরা of three) at 1280 ×
    900: rows "H [1,2] [3,4] [5] H [6,7] [8,+]" (the empty row beside line 8). Line 1
    dragged to the right of line 4's middle: lines 2 3 4 1 5; line 7 dragged left of line
    2's middle: 1 7 2 3 …, the brass marker down beside line 2; ↑ ↓ on a number moved a line
    one place; Undo took each back. New line and eight notes from the pad after line 8: "[8,9]
    [+]". A click on a box of line 2 (the right half), then না on the pad: line 2's third
    beat became না. Pairs at 1440, 1280, 1240, 1200 and 1160 px; a line to a row at 1120 and 1024 (the empty row too); to Practice
    and back, Free text and back: pairs again. 360 × 780, night: a line to a row, no sideways
    scrolling. Day and night screenshots checked.
  - A pad note after a scripted `.focus()` went to the end of the song, on the old code as
    well: headless Edge does not fire focus events for it; with real clicks it goes to the
    box chosen.
  - CI run `38824838275` (`a51b534`): core, reference and deploy jobs green. Live: the bundle index-CMbOCfhS.js served; the Keherwa song in the beat boxes in rows "H [1,2] [3,4] [5] H [6,7] [8,+]" at 1280 px.
- **Decisions made:** see Decisions (two lines to a row in the beat boxes).
- **Risks or disagreements:** always on where it fits, with no setting (say if one is
  wanted). Inserting or moving a line reflows the pairs after it (lines change halves).
  The boxes' width is fixed by `width: 2.6em` (`field-sizing` does not widen them), so a long
  syllable does not widen a line; noted, not changed.
- **Next handoff:** Rinat enters a Keherwa or Dadra song in the beat boxes on a laptop.

### 2026-10-16 BST — Claude (Opus 5.5) — PH2-14 reverted: Practice a line to a row again

- **Goal:** Rinat: "i didn't want two lines in practice section, i wanted in the edit notation
  section. Practice section was fine with one line per row as that gives the best
  visibility. please reverse this."
- **Inspected:** `287fe14` (the only code commit since `5ce09ed`; `c14b9e1` was docs); for
  the beat boxes, `boxesHTML` (a row: grip, beats, ▶ ≡ × buttons), the drag code
  (`dragTo`, by height alone), the styles; widths measured at 1280 px.
- **Changed:** `c277a8c` (revert of `287fe14`): lines.ts, styles, store (`plOne` gone; a stored
  `plOne` is dropped on load), view, index.html, app.ts and the tests as they were at
  `5ce09ed` (`git diff 5ce09ed HEAD -- src index.html tests` empty). This commit (docs):
  DATA (`plOne` gone), ROADMAP (row 14 struck), this file (decision, PH2-14 row, the PH2-13
  entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10):
  - `npm run typecheck` → 0; `npx vitest run` → 36 files, 379 passed. `npm run build` → the
    same JS and CSS files as `5ce09ed` (index-D-Axru-c.js, index-DQNoU8-u.css);
    `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid.
  - Beat boxes at 1280 × 900 (headless Edge), a Keherwa song of 8-beat lines with words: the
    box area 1148 px; each line's number 36 px, its boxes 373 px, its ▶ ≡ × 120 px, so two
    lines (about 1,100 px with gaps) fit at this width and not much narrower.
  - CI run `%s` (`c277a8c`): core, reference and deploy jobs green. Live: %s.
- **Decisions made:** Practice keeps a line to a row (new; the pairing row struck).
- **Risks or disagreements:** none from the revert. The beat boxes plan (drag needs left and
  right as well as up and down; regroup only when not typing; fits from about 1,250 px)
  waits for Rinat's go-ahead.
- **Next handoff:** Rinat decides on two lines to a row in the beat boxes.

### 2026-10-16 BST — Claude (Opus 5.5) — PH2-14 two short lines to a Practice row

- **Goal:** Rinat chose the second of Claude's two ways to fill the empty space of a Keherwa
  or Dadra song with a cycle to a line: "ok let's go with option 2 please" (a Practice
  setting that puts two short lines side by side, the song's text unchanged).
- **Inspected:** lines.ts (`build`, `layout`, `columnsFor`, `scrollTo`, `current`, `gridFor`,
  the voice and score code, all a line to a row); the `.pll.cur` styles (size, strip, bars,
  voice, figure, highlight); the Lines settings, `applyLinesPrefs`, `practiceSummary`,
  the prefs.
- **Changed:** `287fe14` (feat(practice)): lines.ts: `rowsOf` (pure: headings, pairs within a
  section, a line left over in half a row, long lines alone), `regroup` (the lines moved into
  `.plpair` rows only when the grouping changes, the headings between), `markBig` (the row
  being sung large, the semitone grid on both its lines), `layout` (pairs when each beat has
  46 px, 32 on a phone, in half the width; `--cols` for whole rows, `--pcols` for halves; row
  heights for the view's height), `scrollTo` by rows; host `pair()`; styles: `.plpair`, the
  sizes on `.pll.big` (the highlight, Now and the figure stay on `.cur`); store: `plOne`;
  view: "One line to a row" in the summary; index.html: the Lines checkbox; app.ts: wiring;
  tests (lines: `rowsOf`; store: `plOne` and its summary). This commit (docs): DATA
  (`plOne`), ROADMAP (Phase 2 row 14), this file (the PH2-12 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 36 files, 381 passed. `npm run build` →
    228.5 kB JS (80.9 kB gzip), 52.6 kB CSS; `bash reference/tests/run-all.sh` →
    31/11/10/12/5 passed, 12 exercises valid.
  - A new Keherwa song: স্থায়ী of five 8-beat lines (four with words), অন্তরা of three.
    1280 × 900, day: rows "H [1,2] [3,4] [5] H [6,7] [8]" (line numbers), each half 8 beats
    of 58 px; idle, line 1 Start with the figure and line 2 Next, both large. Played from
    line 2: its half lit (In 6, then Now), line 1 dimmed. With the line being sung 1st, at
    tempo 200: the current row stayed at the top of the view (0 px) and the view scrolled
    only on a new row (33 → 105 px), not from one half to the other. The checkbox off: a line
    to a row (8 across), the line being sung kept; on again: pairs.
  - 1024 × 800, night: pairs, beats 47 px, the row inside the view (the last beat ends at its
    edge; an element screenshot looked clipped, a viewport one does not). 360 × 780, night: a
    line to a row, no sideways scrolling.
  - The fake singer (Edge's fake microphone playing a recorded scale) on ex-alankar-bn (Dadra,
    four 6-beat lines a section): rows "H H [1,2] [3,4] H [5,6] [7,8]"; the voice drawn in
    both halves (55 strokes in lines sung, the dot in the line being sung), each line's
    score and tint in its own box (88, 83, 83, 83, 71, 88, 83), the average 83.
  - CI run `38821848291` (`287fe14`): core, reference and deploy jobs green. Live: the bundle index-CA3FX-6U.js served; ex-alankar-bn in Practice in rows "H H [1,2] [3,4] H [5,6] [7,8]", the setting on.
- **Decisions made:** see Decisions (two short lines to a row).
- **Risks or disagreements:** on by default (Rinat asked for the option to fill the space);
  Lines shown counts rows, so 7 can show 14 lines. A song whose lines differ in length pairs
  only those that fit; a pair's halves use the longest such line's columns.
- **Next handoff:** Rinat practises a Keherwa or Dadra song on a laptop.

### 2026-10-15 BST — Claude (Opus 5.5) — PH2-13 the pad in colour, its tools beside it

- **Goal:** Rinat: "make the upper ones two dots as well, ref not showing properly"; "all 5
  octaves to have different faint colours and the alternative 5 notes tivra, komal etc, to
  have different noticeable intensity of the same colour or a different colour"; Join,
  Split, higher, lower "there is real estate remaining on the right side of the note pad.
  can these buttons be located there? sectioned and all"; and, not to build yet, whether two
  cycles in one Practice line would cause issues elsewhere.
- **Inspected:** `unitHTML`; every place that writes octave marks (`noteToken`,
  `shiftOctaves`, `splitBeats`; the exercise generator, whose exercises never reach +2, left
  alone); the parser's marks after a note (`'` after the আকার adds an octave); the beat boxes
  (inputs showing the text itself); the differential tests' edit comparisons; for the
  question, `columnsFor` (46 px columns, 32 on a phone), the practice log's per-line scores,
  rewaz items' and takes' line ranges.
- **Found:** the prototype's `shiftOctaves` puts a note's after-marks behind the next note's
  before-marks where they meet (`Nহ্ম` up gave `Nর্'হ্ম`, read as a Re): fixed with the new
  ordering (the prototype's notes came out wrong in 1,759 of the differential test's random
  selections, texts that mix the two scripts).
- **Changed:** `5ce09ed` (feat(edit)): edit.ts: `bnUpper` (two up: `''` after the note and its
  আকার), used by `noteToken`, `splitBeats` and `shiftOctaves`, whose after-marks now sort
  first; view.ts: `up2` for Bengali two up; app.ts: `data-oct` on the pad and side buttons;
  index.html: the tools (`#fixRow`) inside the section beside the pad, in three sections, and
  the help table's two-octave rows; styles: `--o-n2` … `--o-2` in day and night, the keys'
  tints, `.padwrap` / `.padlay` with container queries (beside at 640 px and up, one row per
  section under 440 px), two dots over a Bengali headline; tests (pad: the writing and the
  order; midi: Bengali two up and down; the differential tests accept the new spelling and
  order when the notes come out the same as the prototype's or as intended). This commit
  (docs): NOTATION (Octaves, How the editor writes, Edit operations, Beat boxes), ROADMAP
  (Phase 2 row 13), this file (the PH2-11 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 36 files, 379 passed. `npm run build` →
    227.2 kB JS (80.4 kB gzip), 52.3 kB CSS; `bash reference/tests/run-all.sh` →
    31/11/10/12/5 passed, 12 exercises valid.
  - 1280 × 960, day, a new song: সা and tivra Ma from the middle, upper and highest octaves
    wrote `সা হ্মা র্সা | র্হ্মা সা'' হ্মা''`; the keys violet, blue, green, amber and rose from
    lowest to highest, komal/tivra deeper, the side buttons in the next octave's colour; the
    tools a 250 px column beside the 720 px pad (Last change, Selected notes, Beats, then the
    status); in Free text (the preview beside, the column 565 px) the three sections in a row
    under the pad. The beat boxes show `সা''`; the preview and Practice show two dots over
    সা, রা, গা.
  - 360 × 780, night: the rose and violet tints readable, the tools one row per section (200
    px in all, was 288), no sideways scrolling.
  - CI run `38819778754` (`5ce09ed`): core, reference and deploy jobs green. Live: the bundle index-D-Axru-c.js served; a new song's pad at the highest octave rose-tinted (`data-oct` 2), its Sa `u up2`, writing `সা''`; the tools a 250 px column beside the 720 px pad.
- **Decisions made:** Two octaves up in Bengali (new); Entering notes, redesigned (updated).
- **Risks or disagreements:** songs written before with `র্র্সা` keep that text (read the
  same, shown with two dots) until Lower/Higher rewrites them. In Sa Re Ga a lower komal's
  dots touch its underline, as one dot did. The tools now fold away with the pad. Two cycles
  per Practice line: Claude's view given in chat, nothing built.
- **Next handoff:** Rinat tries the coloured pad and decides on two cycles per line.

### 2026-10-15 BST — Claude (Opus 5.5) — PH2-12 the pad's octaves

- **Goal:** Rinat, to "The pad only goes from the lower to the upper octave, though the
  notation can go one octave further each way. I can extend it if you need that": "do this".
- **Inspected:** `PAD_OCTAVES`, `renderNoteButtons`, `setInsOct`, `tokenFor` (app.ts);
  `noteToken` (core edit.ts, already writing ±2); `unitHTML` and the `.u.lo`/`.u.hi` dots,
  which drew one dot for a note one or two octaves away; the tivra line, which hid an upper
  Sa Re Ga Ma's dot.
- **Changed:** `53ccbc0` (feat(edit)): view.ts: `PAD_OCTAVES` −2 … +2 (Lowest octave ·
  অতিমন্দ্র, Highest octave · অতিতার), `PAD_LOWEST`, `PAD_HIGHEST`, `padOctaveWord`;
  `unitHTML` adds `lo2` / `hi2`; app.ts: the side buttons named for the octave they move to,
  off at either end, `setInsOct` clamped to the pad's range, `tokenFor` through `noteToken`;
  styles: two dots side by side, the upper tivra Ma's dot beside its line; tests (pad.test.ts;
  the differential test's `oneDot` allows the second dot). This commit (docs): NOTATION
  (Octaves → Shown), ROADMAP (Phase 2 row 12), this file (the PH2-10 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 36 files, 378 passed. `npm run build` →
    226.9 kB JS (80.3 kB gzip), 50.5 kB CSS; `bash reference/tests/run-all.sh` →
    31/11/10/12/5 passed, 12 exercises valid.
  - 1280 × 960, day, a new song in the beat boxes: the left button said Lower, then Lowest
    (pad "Lower octave · মন্দ্র"), then was off at "Lowest octave · অতিমন্দ্র" (its own label
    Lowest, the right one Lower); সা and না wrote `..সা ..না`; right four times: Lower, Middle,
    Upper, Highest, then off at "Highest octave · অতিতার"; সা and tivra Ma wrote `র্র্সা`,
    `র্র্হ্মা`. Free text: রা and, four octaves down, ধা wrote `র্র্রা ..ধা`. Sa Re Ga: the pad's Sa
    `u lo lo2` at the lowest, `u hi hi2` at the highest; the preview drew `lo2`/`hi2` on all six
    notes. No console errors.
  - 360 × 780, night: no sideways scrolling; "Highest" 35 px in its 42 px button; two dots
    under and over the notes, and the upper tivra Ma's dot beside its line, readable.
  - CI run `38816617432` (`53ccbc0`): core, reference and deploy jobs green. Live: the bundle index-Dplr_f9i.js served; a new song's pad went down to "Lowest octave · অতিমন্দ্র" (left button off, Sa `u lo lo2`) and up to "Highest octave · অতিতার" (right button off), writing `..সা র্র্সা`.
- **Decisions made:** the Entering notes row updated (two octaves either side).
- **Risks or disagreements:** in Bengali the highest octave is two রেফs (`র্র্সা`), as the
  notation already wrote it; fonts draw the first as a visible র্, and the highest Re
  (`র্র্রা`) as a conjunct. Nobody has entered a song this low or high yet.
- **Next handoff:** Rinat enters a song's lowest and highest notes from the pad.

### 2026-10-15 BST — Claude (Opus 5.5) — PH2-11 one undo for the song's text

- **Goal:** Rinat: Undo "seems unintuitive … when writing anything through beat boxes, it is
  just editing the free text underneath, right? … why can't the undo just be attached to the
  text editor … If it is not as simple, then leave it as it is."
- **Inspected:** boxes.ts's undo (`undoStack`, filled only by its `write`, never emptied);
  every path that changes the text (app.ts `changed('text')` from `setTextFromBoxes`,
  `setText` and the notation box's input event; `applyTextEdit` for Join, Split and octaves;
  `insertText` for the pad in free text; `addHeading`).
- **Found:** the boxes' list missed changes made outside the boxes, so after + Heading an undo
  took back the step before it too; and, never emptied, Undo after opening another song wrote
  the previous song's text into the one just opened (a lost-work bug, fixed here).
- **Changed:** `d78ac22` (fix(edit)): `src/app/undo.ts` (new: `TextUndo` with `remember`,
  `undo`, `clear`, `firstDifference`); app.ts: the step recorded in `changed` with `textKey`
  (a box's key, `line:N` for free text typing, a step of its own otherwise via `inputKey` and
  `ownStep`), `undoText` (the text put back, the boxes refocused or the caret placed),
  Ctrl+Z in the notation box, the list emptied in `loadSong`; boxes.ts: `write` passes its key
  to the host, Ctrl+Z calls the host's undo, `restored(key)` in place of `undo`; Undo shown in
  free text too; tests (undo.test.ts). This commit (docs): NOTATION (Undo), ROADMAP (Phase 2
  row 11), this file (the PH2-09 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 36 files, 377 passed (new: steps taken back
    in turn; typing in one place joined until a pause or another place; steps of their own
    never joined; the latest 200 kept; emptied; where texts differ). `npm run build` → 227 kB
    JS (80.3 kB gzip), 50.1 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed,
    12 exercises valid.
  - A new song, beat boxes: New line, সা, রা, গা, Hold, Heading from the pad; Undo took back
    the heading alone ("সা রা গা | -"), then Hold, then গা. Free text: " মা পা" typed and ধা
    from the pad; Undo took back ধা alone, then the typing; Ctrl+Z in the text took back রা
    (typed in the boxes). Back in the boxes, Undo took back সা, then "Nothing to undo.". A
    note typed, then ex-scale opened: Undo said "Nothing to undo." and ex-scale's text was
    unchanged (185 characters).
  - CI run `38763430833` (`d78ac22`): core, reference and deploy jobs green. Live: https://rinatmalik.github.io/Gaaner-Sathi/ in headless Edge: a new song, the pad's Heading undone alone, then Hold, then গা; no console errors.
- **Decisions made:** see Decisions (one undo).
- **Risks or disagreements:** no redo (there was none before). Typing a long stretch on one
  line without a 4 s pause is one step, as typing in one box was. Ctrl+Z in free text no longer
  uses the browser's own finer undo. The history is not kept across a reload.
- **Next handoff:** Rinat tries Undo while entering a song.

### 2026-10-15 BST — Claude (Opus 5.5) — PH2-10 design, round ten: the note pad

- **Goal:** Rinat: round nine's Add notes was a misreading ("i actually meant about the
  feature of adding notes about the song - which is now inside settings so that's fine");
  "redesign the whole note buttons": a collapsible section with every button and setting for
  entering notes; the pad's rows (Sa Re Ga Ma / Pa Dha Ni / secondary re, ga, ma, dha, ni /
  Hold, Silence, Add New Line, Add Header); full-height buttons either side sliding it to the
  lower or upper octave; Join, Split and Undo "somewhere sensible"; Write in in the section;
  the song's sound back out of Settings as a main section.
- **Inspected:** the palette (`noteButtonsHTML`, its prototype comparison), `insertText`,
  `tokenFor`, the palette's and `+ Heading`'s handlers, the boxes' own undo (Ctrl+Z), the fix
  row.
- **Changed:** `628efc2` (feat(edit)): view.ts: `padHTML`, `PAD_ROWS`, `PAD_OCTAVES` (in place
  of `noteButtonsHTML`); app.ts: `renderNoteButtons` drawing the pad, its octave name and
  side buttons, `setInsOct` (the slide), `addHeading` (beat boxes or free text),
  `setPadOpen`, `renderPadSummary`, one handler for the pad; the octave picker, "+ Add notes"
  and the palette's handlers gone; `showSongSound` no longer opens Settings; index.html: the
  Enter notes section, the fix row with Undo, the song's sound after Settings, Write in out
  of Settings; store.ts: `padFold` (`palOpen` dropped); styles; tests (pad.test.ts; the
  differential test's old row dropped). This commit (docs): DATA (`padFold`), ENGINE (holds
  and rests from the pad), ROADMAP (Phase 2 row 10), this file (the PH2-08 entry moved to
  HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 35 files, 373 passed (new: the pad's rows,
    captions and names, the octave shown in both scripts, the octave names, Bar and Lyrics
    line in free text only). `npm run build` → 226 kB JS (80.0 kB gzip), 50.1 kB CSS;
    `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid.
  - 1280 × 960, day, a new song: Enter notes open ("Beat boxes · middle octave"), the song's
    sound its own section, Settings "Untitled song · Dadra". Tapped New line, সা, রা, গা,
    Hold: "সা রা গা | -"; the left button: "Lower octave · মন্দ্র", itself disabled, the right
    saying Middle; .না; right twice: "Upper octave · তার", disabled; র্সা, then Silence on a new
    line (the Dadra line full); Heading added a heading row; Free text: "Free text · upper
    octave", Bar and Lyrics line added, Undo hidden; Heading then র্পা and Bar wrote "# র্পা |"
    (the note goes where the cursor is, on the heading line); the section folded ("Show",
    `padFold`) and unfolded.
  - 360 × 780, night: the pad 298 px wide with the side buttons full height, the komal buttons
    38 px wide, notes 48 px tall, lower-octave dots; no sideways scrolling.
  - CI run `38742686144` (`628efc2`): core, reference and deploy jobs green. Live: https://rinatmalik.github.io/Gaaner-Sathi/ in headless Edge at night: Edit notation with Enter notes open, 12 note buttons, "Middle octave · মধ্য", the right button moving it to "Upper octave · তার", the song's sound its own section, no "+ Add notes"; no console errors.
- **Decisions made:** see Decisions (entering notes, redesigned).
- **Risks or disagreements:** the octave buttons stop at lower and upper (the notation reads
  two octaves either way; say if the pad should go further). The row with Undo, the selected
  notes' octave, Join and Split stays shown when the pad is folded, since it works on the
  boxes chosen. Undo after a Heading also takes back the step before it (as + Heading did
  before). In free text a note tapped after Heading goes into the heading line, where the
  cursor is. Nobody has used it on a phone yet.
- **Next handoff:** Rinat enters a song with the pad.

### 2026-10-15 BST — Claude (Opus 5.5) — PH2-09 design, round nine: Edit notation's Settings, one header menu, delete in the library, a rewaz break

- **Goal:** Rinat: in the Music library "next to print or save button in each line, add the
  option to delete this song"; in Rewaz "add a few seconds break between each song that the
  use will specify"; in Edit notation the note buttons "after pressing a 'Add Notes' button"
  and "title, taal, copy, print - all to be put inside a Settings section"; the বাংলা / Sa Re
  Ga choice "inside settings but … available in all other tabs as well … want a cleaner look".
- **Inspected:** songs.ts rows; app.ts's delete (`#delYes`); routine.ts (`ITEM_GAP`),
  `RoutineStore.save` (it names the fields it keeps), rewaz.ts's runner (`next`, Skip,
  Stop); Edit notation's markup and its wiring (`applyEditMode` hid `#pal .tonly/.bonly`,
  `newSong`, `showSongSound`); the header and the tabs row.
- **Changed:** `e3aecc1` (feat): songs.ts: a delete button on the user's rows and the asking
  row (`confirmDel`), host `remove`; app.ts: `deleteSong` (shared with Edit notation's),
  `setEditSetOpen`, `setPalOpen`, `renderEditSummary`, `renderDisp`, `setDispOpen` (Escape
  and a tap elsewhere close it); routine.ts: `gap`, `gapOf`, the limit 120, the estimate;
  store.ts: the routine's `gap` kept, prefs `editSetOpen`, `palOpen`; rewaz.ts: the break
  field beside the name, the countdown (`setInterval`, cleared by Skip and Stop);
  index.html: Edit notation's Settings bar around the details, About, Write in, the song's
  sound and the file buttons, "+ Add notes" with + Heading and Undo, the palette hidden at
  first, the header menu in place of the colours and the tabs row's script switch; styles;
  tests. This commit (docs): DATA (`gap`, `editSetOpen`, `palOpen`), ROADMAP (Phase 2 row
  9), this file (the PH2-07 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 34 files, 370 passed (new: the break kept 0
    to 120 and rounded, not kept when not given, stored, and in the estimate (30 s, none);
    the break field; delete on the user's rows only, the asking row and only that row).
    `npm run build` → 225 kB JS (79.4 kB gzip), 48.8 kB CSS; `bash reference/tests/run-all.sh`
    → 31/11/10/12/5 passed, 12 exercises valid.
  - 1280 × 900, day: the menu button "বাংলা · Auto", no switch in the tabs row; Sa Re Ga from
    the menu: notes in Latin, "Sa Re Ga · Auto"; a tap elsewhere closed it. + New song: Edit
    notation with Settings open and the title focused, "Untitled song · Dadra · Beat boxes",
    the note buttons hidden, + Heading shown; + Add notes showed them ("Hide the note
    buttons"), remembered; Settings folded by its bar. Rewaz: a new routine of the test song,
    1 round, break 3, a second item added (2 items · about 1 min); started: "Next: … starting
    in 3 s", a second later "2 s", then the second item playing. Library: Delete asked in the
    row (focus on Keep), Keep put it back (focus on Delete), Delete removed the open song and
    opened লম্বা স্বর, "Deleted “Short test”.".
  - 360 × 780, night and day: the menu within the screen (16 to 268 px); Edit notation's
    Settings and note buttons; the asking row; the routine's break field; no sideways
    scrolling anywhere.
  - CI run `38739059662` (`e3aecc1`): core, reference and deploy jobs green. Live: https://rinatmalik.github.io/Gaaner-Sathi/ in headless Edge: the menu button "বাংলা · Auto" and no switch in the tabs row, Edit notation's Settings and note buttons folded ("অলংকার · তিন স্বরের দল · Dadra · Beat boxes"), the warm-up's break 4, the library's 12 exercises with Print and no Delete (a fresh browser has no songs of its own); no console errors.
- **Decisions made:** see Decisions (Edit notation cleaner; the header menu; delete in the
  library; the rewaz break).
- **Risks or disagreements:** বাংলা / Sa Re Ga is in the header menu only, not also inside
  Edit notation's Settings (one place for every view; say if it should be in both). Write in
  and the song's sound moved into Settings too, so switching to free text is one tap further.
  A new song still lands with Settings open; existing songs open in Edit notation as last
  left. Deleting from the library does not delete the song's takes (as in Edit notation).
- **Next handoff:** Rinat tries round nine.

### 2026-10-15 BST — Claude (Opus 5.5) — PH2-08 design, round eight: the last 10 % unscored, the figure stacked, the keys in their own section

- **Goal:** Rinat: how notes are scored and what singers aim for (answered in the reply); "go
  on, make the last 10% not count"; the taal shapes "added vertically, that way they can be
  even bigger"; the keys "a little bit more taller … a separate section, no need to be
  collapsible, it will only appear when the box is checked … as wide as the other section.
  don't stretch it, add more keys on both sides".
- **Inspected:** `scoreNote` and the score tests (track.ts, pitch-track.test.ts);
  `keyRange` and `keyboardHTML` (keyboard.ts); the figure's CSS.
- **Changed:** `96b944a` (feat): track.ts: the steady part ends at the last 10 %;
  lines.ts: `--nv`, `--nh` on the figure and a flatter lens box; styles: the shapes in a
  column sized by container units (`container-type: size` on the figure) with a minimum,
  the keys' section and colours (`--key-w`, `--key-b`, `--key-sa`); keyboard.ts:
  `keysToFill`; app.ts: `renderKeys` filling the width (a ResizeObserver redraws it, the last
  keys lit put back); index.html: the keys' section after the lines; tests. This commit
  (docs): ENGINE (Scores; Which key to press), ROADMAP (Phase 2 row 8), this file (Open
  question 6 removed; the PH2-06 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 34 files, 368 passed (new: the last 9 % sung
    50 cents sharp scores 100 with no wobble, which fails with the old window (checked by
    running it against the previous track.ts); `keysToFill` adding keys below then above,
    keeping the song's, stopping at A0 and C8; the figure's `--nv`, `--nh` and lens box).
    `npm run build` → 221 kB JS (78.4 kB gzip), 47.3 kB CSS; `bash reference/tests/run-all.sh`
    → 31/11/10/12/5 passed, 12 exercises valid.
  - 1280 × 960: Keherwa's squares 63 px (42 before), Teentaal's four 40 px each, the line
    playing 282 px tall (211 before); the keys' section 1148 px wide, 43 white keys, 140 px
    tall, light and dark keys at night, each Sa marked, the key sounding lit. 360 × 780,
    night: Teentaal's squares 30 px; the keys' section 328 px with the song's 14 white keys
    (too narrow for more), 120 px tall; no sideways scrolling.
  - CI run `38732708313` (`96b944a`): core, reference and deploy jobs green. Live: https://rinatmalik.github.io/Gaaner-Sathi/ in headless Edge at night: Keherwa's squares 63 px, the keys in their own section (not inside the lines), 43 white keys, light keys at night; no console errors.
- **Decisions made:** see Decisions (the last 10 %; the figure stacked; the keys' section).
- **Risks or disagreements:** with the shapes stacked, a taal of four or more vibhags makes
  the line being sung taller than in round seven (Teentaal 282 px against 211), so a few
  pixels fewer lines fit; two columns would have made Teentaal's squares 46 px without that.
  The scoring change matters mostly for notes longer than about 300 ms (shorter ones already
  left out their last 10 %), and only shifts a score when the end of a note pulls the median.
  Nobody has sung with it.
- **Next handoff:** Rinat sings with round eight.

### 2026-10-15 BST — Claude (Opus 5.5) — PH2-07 design, round seven: the lines' number boxes, the figure drawn round, the run's average, the settings moved

- **Goal:** Rinat on round six ("looking pretty good"): the number box wider and clickable as
  a whole; the taal figure bigger, with more movement, and the problem that "when the
  following cycle starts, it never gets to reach the last corner of the first cycle" (perhaps
  "have the connecting lines slowly light up as each of the beat progresses"); a total
  average, updating as the song goes; a red-amber-green colour for each line sung without
  losing the notes' own colours; the lines' settings into the Practice settings, with which
  line is the one being sung and 12 lines; the keys taller; the line over the lines removed;
  and how a note is scored (Open question 6).
- **Inspected:** lines.ts, pitch.ts and app.ts as built in round six; `PitchTracker.summary`
  and `scoreNote` (track.ts); the differential view tests that compared the now-singing
  builders, now unused.
- **Changed:** `e3752f2` (feat(practice)): lines.ts: the number box a `button.pln` (number,
  state, score; the figure appended when the line is being sung), `shapePath` (polygons, and a
  lens for two beats), `taalFigureHTML` with a fill, an outline and a drawn path (`pathLength`
  1) per shape and the name, `figureProgress(T, p, f)` as fractions, `ragColour`, `taalFrac`
  (the path's dashes every frame), `taalBeat` (the pop and the sam pulse with the Web
  Animations API, not under reduced motion; shapes done fill), the box's tint and label, the
  line's place from `at()`, the tail and a `dense` class for 9 or 12 lines, and the scroll
  allowing for the shrinking line above the target (then checked again after 300 ms);
  pitch.ts: `showAverage`, after each line and at the end; app.ts: the header line's code
  gone (`showMessage` for errors only, `lineState` for the box: Now, Round N, Your turn, In N,
  Paused, Done), `taalFrac` from `frame`, the Lines settings (`plAt`, 12 lines), the summary;
  index.html: the header line and settings button removed, a Lines and a Pitch group in the
  Practice settings, Show the keys under Keyboard; store.ts: `plRows` 12, `plAt`; view.ts:
  `practiceSummary(s, view)`, the now-singing builders removed; styles; tests. This commit
  (docs): DATA (`plAt`, 12), ENGINE (Shown: the tint and the average), ROADMAP (Phase 2 row
  7), this file (Open question 6; the 2026-10-14 entry moved to HISTORY, its heading, split
  over two lines by the last edit, joined again).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 34 files, 367 passed (new or rewritten: the
    number box as the button; the shapes' paths, the lens; the figure's fill, outline and
    drawn path; progress as fractions, a square closed at the end of its 4th beat; the line
    colours from red to green; the three settings stored; the summary naming them; the
    now-singing comparisons removed). `npm run build` → 221 kB JS (78.1 kB gzip), 46.9 kB CSS;
    `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid.
  - 1280 × 900, night, with the fake singer (ex-alankar-bn, some notes sharp and flat): the
    count-in box said "In 3"; lines scored 88, 83, 84, 84, 71, 87, 83, 87, each box tinted by
    its score (71 amber-red, 87 green-amber); "Average so far" updated as lines ended, then
    "Average for this run · 83 · 100% of the notes sung"; the last line "Done". The number box
    104 px, each Keherwa square 42 px.
  - The figure at four moments, day and night (dpr 2): sam's pulse and glow, a square drawn
    on edge by edge in sam's colour and filling once closed, the khali square dashed and drawn
    in lavender, the next cycle starting.
  - 360 × 780, day and night: 8 columns, no sideways scrolling, the box 60 px with 25 px
    shapes; the Practice settings' Lines and Pitch groups; 12 lines and the 2nd being sung
    named in the summary; the view 756 px, `dense`; the keys 112 px tall.
  - 1280 × 960: a click near the bottom of line 6's box (on its empty part) played from line 6
    with the Lines to practise unchanged. The line being sung sat 4th, 1st and 3rd as chosen,
    also after the jump, once the scroll allowed for the line shrinking above it (before that
    fix it sat 2nd when 4th was chosen).
  - CI run `38728792012` (`e3752f2`): core, reference and deploy jobs green. Live: https://rinatmalik.github.io/Gaaner-Sathi/ in headless Edge: no line over the lines, the box of line 1 saying Start with the Dadra figure, the 12-lines and 5th-place buttons in Practice settings; a click on line 2's box played from it ("Now"), the first triangle drawn round; no console errors.
- **Decisions made:** see Decisions (the lines, round two); Open question 6 asked.
- **Risks or disagreements:** the figure's pop and pulse are skipped under reduced motion,
  but the edges still draw on (they show where the beat is). The tint mixes the theme's red,
  amber and green, so it differs a little between day and night. Twelve lines do not fit a
  laptop screen at the normal size: the window stops at the screen's height and the rest
  scroll. The scroll's correction uses the median small line's height, so a line with several
  verses may land a few pixels off until the check 300 ms later. Nobody has sung with it; the
  fake singer is a clean tone.
- **Next handoff:** Rinat sings with round seven and answers Open question 6.

### 2026-10-15 BST — Claude (Opus 5.5) — PH2-06 design, round six: the Practice view as the song line by line, the taal as a figure, Print in the Music library

- **Goal:** Rinat: "a full redesign of the practice page. Leave the settings section alone";
  combine "the section where it shows the current and upcoming notes, pitch checker with the
  lyrics section … a vertical carousel where about 7 lines are visible. The currently playing
  line is the 3rd one. As each line plays, the carousel slides one line down", the playing
  line as in a mockup ("The lyrics part is bigger, full width pitch performance strip. When the
  microphone is off it still shows the strip with lines representing the notes. when mic is
  available, it also shows my pitch"); the section chips and playing from a line number stay;
  "an elegant way you could visually demonstrate the taal" (a square whose corners light up;
  the bols do not help); "a settings button to adjust a few relevant things"; "Remove the save
  as pdf option from here and put it in the Music Library".
- **Inspected:** index.html's Practice view; app.ts (play, pause, stop, frame, showBeat,
  showIdle, highlight, the taal strip, the sheets, switchTab, print); pitch.ts (meter, trace,
  marks, line chips); core/pitch/track.ts (expected notes, `errorFor`, `expectedAt`, the lag);
  transport.ts (`BeatEntry.tempo` is `60 / spb` rounded); view.ts's builders and which the
  comparison tests cover (`taalStripHTML` was compared with the prototype); songs.ts; print.ts;
  the taals' vibhags (2, 3 and 4 beats only).
- **Changed:** `73dc9dc` (feat(practice)): `src/app/lines.ts` (new): `columnsFor`,
  `stripRange`, `stripY`, `linesHTML` (a cell per beat: notes, words, mark, an SVG strip with
  note bars), `shapeCorners`, `taalFigureHTML`, `figureProgress`, and `initLines` (lazy drawing
  when Practice shows, the HTML compared before redrawing, columns from the width, `--r` for
  lines over more than one row, the window's height measured, scrolling the line playing to
  third, the beat, playhead, figure, the voice as SVG paths per cell carried across beat edges,
  scores); pitch.ts: the meter and canvas trace gone, the beats scheduled kept to place each
  reading, the voice and line scores sent to the lines, the run's score under them; app.ts:
  the lines wired into play, pause, the end, stop, idle, highlight, frame (the playhead),
  switchTab and loadSong, the section pill, the settings (`applyLinesPrefs`), printing any
  song; index.html: the lines' section (header, settings, view, keys, the pitch line) in place
  of the Now singing panel and sheet; Print removed from Practice; songs.ts: a print button on
  each row; print.ts: prints a song given; store.ts: `plRows`, `plSize`; view.ts:
  `taalStripHTML` removed; styles (the old panel's rules removed); rhythm.ts's `beatLabel`
  comment; tests. This commit (docs): ENGINE (frame, the bols, Pitch feedback → Shown),
  NOTATION (taal pherta shown), DATA (`plRows`, `plSize`), ROADMAP (Phase 2 row 6), this file
  (the 2026-10-13 02:40 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; the browser pane on `npm run
  dev`; headless Edge through the DevTools protocol, as in Environment gotchas):
  - `npm run typecheck` → 0; `npx vitest run` → 34 files, 369 passed (new: columns for every
    taal on a phone and a laptop; strips two semitones beyond the notes and ten tall; cells per
    beat with notes, escaped words, a held vowel faded; notes alone on a line without words;
    vibhag marks by kind, Teentaal from beat 9 starting on khali; note bars inset where a note
    starts and ends, carried over a held beat, two in a shared beat, none for silence; the
    figure's corners, kinds, sam's corner and progress; the library row's print button; the
    two settings stored). `npm run build` → 220 kB JS (78.0 kB gzip), 46.5 kB CSS;
    `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid.
  - In the browser pane (night): an exercise played, the beat column and playhead moving, the
    figure traced, line 2 large with line 1 faded above.
  - Headless Edge at 1200 × 1000 with a fake microphone (`ex-alankar-bn` sung at its tempo,
    110, every fifth note 45 cents sharp, every seventh 25 flat, with vibrato): the voice drawn
    on each strip, green, amber and red as expected; each line scored 83 or 88; "This run · 83
    · 100% of the notes sung"; 25 beats marked; no console errors. (A first WAV made at 120 read
    "400 cents sharp" and scored 0–19: the WAV's tempo, not the app.)
  - A Teentaal song with words and a second verse, at 360 × 780 (phone emulation), night and
    day: 8 columns, each line over two rows, no sideways scrolling (`scrollWidth` 360); after
    two fixes (a line over two rows had two full strips; the header took three rows) four lines
    fit and the header takes two. At 1280: 16 beats across.
  - At 1280 × 900, day: line 3's number played from line 3 ("Line 3 · beat 5 of 16", the pill
    অন্তরা, the Lines to practise still from line 1); Pause: "Paused · Line 3 …", the number
    says Paused, beat 36 still lit; the keys row from the settings; Go on: Now; Edit notation
    and back while playing: the line playing still third; Stop: line 1 "Start", no playhead,
    no lit beat; 5 lines and Bigger kept (`plRows` 5); the library: 13 print buttons, none on
    Practice; printing আরোহ-অবরোহ from the library filled the print sheet with it while the
    test song stayed open, and the open song printed its own.
  - CI run `38662305398` (`73dc9dc`): core, reference and deploy jobs green. Live: on https://rinatmalik.github.io/Gaaner-Sathi/ in headless Edge, the 8 lines of the first exercise with the figure, no Print on Practice, playing lit the beat with the playhead ("Line 2 · beat 1 of 6"), 12 print buttons in the library, no console errors.
- **Decisions made:** see Decisions (the Practice view as lines; the taal figure; the
  settings over the lines; Print in the Music library).
- **Risks or disagreements:** the mockup's blue for in tune became the app's green, amber and
  red, and its gold column the brass highlighter; the red-ink words and ruled sheet stay. The
  section pill over the lines repeats the pressed chip above (the mockup had both). The window
  is measured from the lines and capped at the screen's height, so many verses, or a long line
  over two rows on a phone, show fewer lines. The voice is drawn at the delay found, so for the
  first seconds it may sit a little early or late; nobody has sung with it, and the fake singer
  is a clean tone. A finished run leaves the last line large with the drawing, until Play or a
  change. If a browser never fires `afterprint`, a later Ctrl+P prints the song last printed
  from the library. `beatLabel` (the bols) is now used only by tests. The Practice settings
  are as they were. The browser pane's screenshots are downscaled, so the details were checked
  in headless Edge.
- **Next handoff:** Rinat sings with the new Practice view, and sends more design comments
  (the Practice settings next, as Rinat said).

### 2026-10-14 BST — Claude (Opus 5.5) — PH2-05 design, round five: the exercises redone, warnings dismissed, sections dragged, routines filled at once

- **Goal:** Rinat: a way "to dismiss the error it found as some of these are not applicable
  … maybe after the song has been exported, the dismissed list should be refreshed?";
  "have the Exercises first, then My songs. Or make these sections draggable is probably
  better"; "Redo the whole Exercise section. There will be 12 built in exercises … Don't
  number them" (the list, with changes to each, two deletions, komal and tivra "can these be
  combined?", three new patterns); in Rewaz "There should be a way to choose all the items I
  want to add in a routine".
- **Inspected:** `src/core/exercises/` (the specs carried over byte for byte from the
  prototype, held to `reference/exercises.json` by `tests/ported/exercises.test.ts`, and the
  fixture of four comparison suites and `dev/render.ts`); the checker (`check.ts`), its panel
  (`issuesHTML`, also compared with the prototype) and its wiring; songs.ts; rewaz.ts.
- **Changed:** `26f8550` (feat(exercises)): the new `specs.ts` (an `alankar()` helper builds
  the climbing patterns: up from Sa until a shape starts on upper Sa, down from where the top
  one ended), `index.ts` without the typing example, the warm-up's last item, the prototype's
  specs and typing example moved to `tests/reference-exercises.ts`, which the ported test, the
  `data`, `audio`, `notation` and `view` comparison suites and `dev/render.ts` now use; the
  ported test checks the app's 12 by the same rules plus the shapes asked for. `bb7b51f`
  (feat): `issueKey` (FNV-1a of kind, bar or notes, and the line's notes and bars);
  `Song.dismissed` (`cleanDismissed`, storage, files); `issuesHTML(…, dis?)` with Dismiss,
  "N dismissed · Show them" and Bring back; app.ts's `showDismissed`; songs.ts: `LIB_ORDER`
  (exercises first), `order` in ListOptions, `.lgrip` handles, dragging (headings only while
  moving, the list keeping its height, a brass drop line) and ↑ ↓; prefs `libOrder`;
  `libraryHTML(…, exFirst)` and the rewaz pickers in the same order; rewaz.ts: `pickerHTML`,
  `pickedButton`, the `picking` state, ticking updating in place, the find box; styles;
  tests (`dismiss.test.ts` new). This commit (docs): NOTATION (Checker → Dismissing, and why
  not at export), DATA (`dismissed`, `libOrder`), ROADMAP (Phase 2 row 5), this file (the
  2026-10-13 01:30 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; the browser pane on `npm run
  dev`, at 1200 × 800 and 360 × 780, night and day):
  - `npm run typecheck` → 0; `npx vitest run` → 33 files, 356 passed (new: each of the 12
    plays the same in Sa Re Ga and Bengali and checks clean, their ids and order, no numbers,
    the shapes asked for (lines of the long notes, the tops and turns of each alankar, no lone
    Sa line, full leap lines); the fingerprint the same across spacing, script and a line put
    before, changed by the line's notes only; the panel's Dismiss, count, list, Bring back,
    and nothing without the option; `dismissed` cleaned, kept, stored, exported; the section
    order and handles; the picker's groups, numbers, open mark and button). A first leap
    pattern (`S X S - | S X S -`) failed the checker (a Sa twice between two big leaps reads
    as a slip), so the exercise sings `S X S X | S X S -`. `npm run build` → 212 kB JS
    (74.9 kB gzip), 41 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed,
    12 exercises valid.
  - In the pane: the library lists the 12 unnumbered, Exercises first, the picker's groups
    the same; a real drag of My songs' handle 45 px up put it first (saved, the picker
    following, focus on the handle); ↑ on Exercises' handle put it back (no stored order);
    with Exercises open (12 rows), a 60 px drag of its handle moved it below My songs, but
    only after a fix: at first the page, shortened by hiding the bodies, scrolled from under
    the pointer, so the list now keeps its height while dragging. Edit notation, a new song
    with a short bar and an octave slip: "2 things to check", each with Dismiss (Fix too on
    the slip); a real click on the first: "1 thing to check · 1 dismissed · Show them", saved,
    focus on the next Dismiss; a line added above: still dismissed (now "Line 2"); its notes
    changed: back ("2 things to check"); changed back and the other dismissed: "Nothing to
    check apart from what you dismissed · 2 dismissed", the same after a reload; Show them,
    Bring back; a built-in exercise has no Dismiss. Rewaz: "+ Add songs and exercises" opens
    the checklist (Exercises then My songs, 13 rows, the open one marked, focus in Find);
    ticking চার স্বরের দল, লম্বা স্বর, then the song numbers them 1, 2, 3; unticking the
    middle renumbers; Find "অলংকার" shows the 6 alankars and hides My songs; Add puts the 3
    after the warm-up's 4 in that order ("Added 3.", the warm-up saved as the user's); Cancel
    adds nothing. 360 px: no sideways scrolling on the library, Edit notation, Rewaz (picker
    open) and Practice, night and day. No console errors. Test song and routine deleted
    through the app, colours back to Auto.
  - CI run `38593941487` (`bb7b51f`): core, reference and deploy jobs green. Live: 12
    exercises, Exercises first with two handles, the routine checklist, no console errors.
- **Decisions made:** see Decisions (the 12 exercises; dismissing; the library's order;
  adding to a routine).
- **Risks or disagreements:** dismissals are not reset at export (Rinat suggested it; the
  reason is in NOTATION.md); say if export should clear them too. Komal and tivra are one
  exercise of two scales, not one scale with all three (that would be Purvi thaat). The new
  seven-note pattern is in Rupak; the leap exercise sings each leap back and forth. A routine,
  take or practice-log entry that named a removed exercise finds it gone. The checklist adds
  2 rounds of each. Nobody has heard the new exercises; no Edge scenario script this round.
- **Next handoff:** Rinat tries round five, sings the new exercises, and sends more design
  comments.

### 2026-10-13 02:40 BST — Claude (Opus 5.5) — PH2-04 design, round four: your own exercises, Practice settings in Practice, Rewaz as folding rows

- **Goal:** Rinat: "yes build the exercises option as you recommended"; "I am thinking the
  practice settings should be under practice tab?"; the headings "collapsible by clicking
  anywhere along the full width of those rows"; "Recently Changed" → "Recently Added or
  changed"; "also add a button for 'songs'"; in Rewaz "collapse each routine and show all the
  created routines in collapsible rows, similar to how the things are shown in music library
  … highlight on hover, big, square buttons etc".
- **Inspected:** `src/core/song/library.ts`, `model.ts`, `file.ts` and `store.ts`'s `bodyOf`
  (it writes only the fields it names: the mark had to be added there too); `createSong` and
  the import (both set `example = false` after `normalize`); `src/app/rewaz.ts` (one routine at
  a time behind a picker) and its tests.
- **Changed:** `da17be0` (feat): `Song.exercise?: true` (`normalize`, `bodyOf`,
  `songForFile`, which also marks an exported built-in exercise); `LibraryFilter` `mine` and
  `isExercise`; songs.ts: own exercises under Exercises (newest first, or by title, before the
  built-in ones), `.lheadrow` (an `h3` with a full-width `.lfold`, then `+ New song` / `+ New
  exercise`), the Songs chip; app.ts: `newSong(kind)`, `pickerGroups()`, `what()`,
  `loadSongLabels()` ("List under", the title tag, Delete / Export / sound wording), `#listSeg`,
  a copy of a built-in exercise marked `exercise`, `normalize({ … example: false … })` for new
  and imported songs, Practice settings folded at first; index.html: the Practice settings
  block moved into `#practice`, `#libNew` and the routine picker gone, `#rwRoutines`; rewaz.ts:
  `routineHTML`, `metaText`, items with `.rwfields` and `.rwside` buttons, the host's
  `unfolded` (prefs `rewazOpen`, `rewazId` dropped), per-routine Start, add, delete with a
  confirmation, a name or a rounds, tempo, guide or last-line change updating in place, a
  song or first-line change redrawing with the focus put back; styles; tests. This commit
  (docs): DATA (`exercise`, `rewazOpen`, `soundOpen`), ROADMAP (Phase 2 row 4), this file (the
  2026-10-12 16:43 entry moved to HISTORY; Open question 6 removed).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; the browser pane on `npm run
  dev`, at 1200 × 800 and 360 × 780, night and day):
  - `npm run typecheck` → 0; `npx vitest run` → 32 files, 334 passed (new: the mark through
    `normalize`, a song file and storage, never on a built-in one, an exported built-in coming
    back marked; own exercises' order, star, tags and wording; the Songs chip, `mine`, `fav`
    and tag filters reaching them; "My songs 0" when all one's own are exercises; the heading
    rows' + buttons; `rewazOpen` read back and `rewazId` dropped; item rows' layout and icon
    buttons; a routine folded and unfolded, its Start, name, items, add and delete; the
    ready-made one unsaved, an empty one unable to start); `npm run build` → 205 kB JS
    (72.9 kB gzip), 39 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12
    exercises valid.
  - In the pane: chips "All 13 | Songs 0 | Exercises 13"; the sort says "Recently added or
    changed"; a click on empty space at the far end of the Exercises heading folds it (the
    fold button 1013 of 1148 px, the + button the rest), lit under the pointer (5 % ink);
    "+ New exercise" opens Edit notation with "Untitled exercise" selected, stored with
    `exercise: true`, in the picker's Exercises, "Sound of this exercise", "Delete exercise";
    "List under: My songs" moves it (the stored mark gone, the picker's My songs, the library's
    My songs) and back; "Make a copy" of exercise 2 at first went to My songs (the bug above:
    `normalize` saw the copy while it was still `example`), fixed and checked again: an
    exercise. Practice settings in `#practice`, above Now singing, folded, absent from the
    other views. Rewaz: the warm-up "4 items · about 3 min · ready-made", folded; "+ New
    routine" opens a routine with its name selected; renamed by typing and Tab, then Tab, Tab
    to Rounds (focus never lost), 6 typed and Tab to Tempo, "about 2 min", stored; another song
    chosen keeps the focus on its picker (groups My songs 1, Exercises 15); add, up (Move up
    disabled on the first), remove; a click on its heading's empty space folds it and keeps
    focus; Start shows Practice, "Evening rewaz · 1 of 2 · ১২ · আকার সাধনা · round 1 of 6" and
    Pause; Stop rewaz ends it; Delete asks, Keep keeps; a change to the warm-up saves it as
    the user's (Delete appears, "ready-made" goes). 360 px: no sideways scrolling on the
    library, Edit notation, Rewaz and Practice, night and day; an item's three buttons stacked
    (40 × 84 px); Start 124 px wide. No console errors. Test songs and routines deleted through
    the app afterwards, colours back to Auto.
  - CI run `38329377823` (`da17be0`): core, reference and deploy jobs green. Live: the chips,
    the heading buttons, the sort wording, Practice settings in Practice, "List under" and the
    Rewaz rows checked on https://rinatmalik.github.io/Gaaner-Sathi/, no console errors.
- **Decisions made:** see Decisions (your own exercises; Practice settings in the Practice
  view; the library's headings, Songs chip and sort wording; Rewaz as folding rows).
- **Risks or disagreements:** connecting a MIDI keyboard for the editor's typing now means
  visiting Practice once (it reconnects by itself after). The Practice settings start folded
  for anyone who never unfolded them. The ready-made warm-up's first change redraws it and
  puts the focus back on the field changed (so a Tab out of its Rounds stays there once).
  Removing or moving an item leaves the focus on the page. No Edge scenario script this
  round (the browser pane was visible); nothing about sound changed.
- **Next handoff:** Rinat tries round four, answers round two's two questions, and sends more
  design comments.

### 2026-10-13 01:30 BST — Claude (Opus 5.5) — PH2-03 design, round three: a song's sound in Edit notation, Practice settings, the Music library

- **Goal:** Rinat, with a screenshot of the Sound settings: "are all of these settings song
  specific? or generic to the app? The ones that are specific to the song should go into a
  separate section inside the Edit Notation Tab … let me know if you don't agree"; "Rename
  Songs Tab to 'Music Library'"; song rows like the lines in the beat boxes ("faint highlight
  when hovered", "two full height buttons on the right … 'Practice this Song' and … 'Edit
  this song' … quite wide"); "Make both sections Exercise and My Songs collapsible"; the
  headings bigger; asked how to add exercises, and whether Edit notation or Practice should
  come first in the tabs. The numbers on the left were withdrawn ("forget about the numbers").
- **Inspected:** `src/core/song/sound.ts` and the `sound` proxy in `src/app/app.ts` (Melody
  and Rhythm saved with a song, the guide among them; Practice and Keyboard the device's);
  `src/app/songs.ts` (rows, sections); `index.html` (the mixer); `store.ts` (prefs, tabs); the
  Songs view in the browser pane (exercise titles carry their own number, "১ · …").
- **Changed:** `4269b81` (feat): `SongSound` without `guide` (`cleanSound` leaves an old one
  out; `SoundSettings` keeps it as a practice setting); `practiceSummary` and
  `songSoundSummary` instead of `soundSummary`; the mixer split: `#mixer` (Practice settings:
  Guide, Rounds, Keyboard, and `#toSongSound`) and `#songMixer` in Edit notation after "About
  this song" (`#songSoundBtn`, folded, `songSoundOpen`), the proxy taking only
  `SONG_SOUND_KEYS` from a song; the tabs reordered and renamed; library rows (`.lmain`,
  `.lacts` with `.lplay` / `.ledit`, hover, under the row below 720 px), sections
  (`.lsec`, `.lfold`, `libFold`; plain headings while searching), "My songs 0" with the
  invitation when empty; "As in Practice settings" for a rewaz item's guide; tests. This
  commit (docs): DATA (song `sound`, settings), ENGINE (one label), ROADMAP (Phase 2 row 3;
  the phase table's "now" moved to Phase 2), this file (the 2026-10-11 18:56 entry moved to
  HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; the browser pane on `npm run
  dev`, at 1200 × 800 and 360 × 780, night and day):
  - `npm run typecheck` → 0; `npx vitest run` → 32 files, 323 passed (new: a guide saved with
    a song is left out, also through `normalize`; both summaries; `libFold` and
    `songSoundOpen` read back, junk ignored; each row's two buttons, named for a song or an
    exercise; sections folding, and all shown under plain headings while searching);
    `npm run build` → 201 kB JS (71.6 kB gzip), 36 kB CSS; `bash reference/tests/run-all.sh`
    → 31/11/10/12/5 passed, 12 exercises valid.
  - In the pane: tabs "Practice | Music library | Edit notation | Rewaz | Voice | Progress";
    a row lit under the pointer (4 % ink), its two buttons the row's full height (87 of 88
    px), "Practise this exercise" on one line (labels measured: 129 px at most); a click on
    "Exercises" folds it, keeps focus, saves `{ex: true}`, still folded after a reload; a
    search while folded shows 4 matches under a plain "Exercises 4"; Enter on the heading
    unfolds it; "Edit this exercise" opens exercise 2 in Edit notation with "Your usual sound
    · 3 reeds · No drone · Tabla" folded; a new song: "Sound of this song", Drums and Double
    saved with the song (no `guide`), "Use my usual sound" shown; Guide Soft in Practice
    settings saved to the device and the song's sound unchanged; "Change this song's sound"
    on Practice opens Edit notation with the section unfolded, in view and focused; "Use my
    usual sound" removes it; "Practise this exercise" opens exercise 3 on Practice; 360 px:
    no sideways scrolling on the library, Edit notation and Practice, the buttons under each
    row (42 px), night and day; no console errors after a clean load. The test song deleted
    and the guide and colours put back afterwards.
  - CI run `38326026128` (`4269b81`): core, reference and deploy jobs green. Live: the tabs,
    "Practice settings", the folding headings, the row buttons and "Change this song's
    sound" checked on https://rinatmalik.github.io/Gaaner-Sathi/, no console errors.
- **Decisions made:** see Decisions (a song's sound in Edit notation and Practice settings;
  the Music library and the tab order; its rows and folding sections; Open question 6).
- **Risks or disagreements:** the guide is no longer saved with a song (my disagreement with
  "all song-specific settings in Edit notation": say if it should go back); a song set to
  guide Soft or Off before now plays the guide as the Practice settings say. Changing a
  song's drums while practising is now two taps away (Change this song's sound). The song's
  sound starts folded in Edit notation. No Edge scenario script this round (the browser pane
  was visible); nothing about sound changed, so no offline render.
- **Next handoff:** Rinat tries round three, answers Open question 6 and round two's two
  questions, and sends more design comments.

### 2026-10-12 16:43 BST — Claude (Opus 5.5) — PH2-02 design, round two: Pause and Stop, the Lines to practise left alone, the mic only while playing, beat box rows redesigned

- **Goal:** Rinat (with a sketch of a line: the number down the left, "Play this line", "Play
  From here" and "X" at the right, all full height): "mic should only be listening when play
  button is pressed and stop when the song is finished or the stop button is pressed"; "there
  should be pause button when playing and a separate stop button"; a line "selected when click
  on any empty space on the whole line … subtly highlighted when hovered"; "full line height
  buttons"; "Colour code the first beat of the sections of the line so we can get rid of X and
  the O"; "when selecting a line to play from - don't auto update the 'Lines to Practice'
  selection … app-wide"; "let me know if any of these things conflicts with something else".
- **Inspected:** `src/app/pitch.ts` (the button opened the microphone and kept it open, a
  tuner while idle); `play()`/`stop()`/`userToggle` and every caller in `src/app/app.ts` (the
  pickers were written by `play()`, the sheet's line numbers, the section buttons, rewaz items
  and takes with the guide); the transport's start (count-in, carry); the practice log's
  seconds; takes (`Recorder` kept open while Record me is on); `PitchTracker`.
- **Changed:** `f7d6ec0` (feat): `Transport.start(…, { at: { s, pass } })` goes on from a
  beat and round at once, a note held across it sounding again; `PitchTracker.cut(t)`; the
  app: `PlayAsk` (what plays is passed in, the pickers only read by the deck's Play),
  `pause()`/`resume()`/`userStop()`, `#stopBtn`, a pause icon in `#playBtn` (aria "Pause",
  "Go on"), the log's `seg`/`done` (time played without pauses), a take ending at a pause,
  rewaz seeing a pause as playing; `userPlay` plays from a line to the end once (sheet line
  numbers, the editor's "play from here"), section buttons play their section, rewaz items and
  takes their own lines, none touching the pickers; pitch: "Check my pitch" arms, the
  microphone opens on play or going on and closes on pause, stop or the end, scoring from the
  first beat scheduled, not for the editor's quick listen; beat boxes: the number (a
  heading's #) full height behind the red margin line, full-height buttons at the row's end
  (play this line, play from here, ×; stacked on a phone), `v-sam`/`v-tali`/`v-khali` on the
  first beat of each vibhag (theme tokens `--v-*`, a key `#bxKey`, the kind in each box's
  label) instead of the X/0 row, a tap on a row's empty space selects it (not a press begun in
  a box), rows lit on hover; help and hint; `tests/unit/pause.test.ts`, the boxes' HTML tests.
  This commit (docs): NOTATION (Beat boxes), ENGINE (What plays, Pause, Capture), DATA (`secs`),
  ROADMAP (Phase 2 row 2), this file (the 2026-10-11 17:53 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through the
  DevTools protocol on `npm run dev`, real mouse and key events; the microphone a WAV through
  Edge's fake device, with `getUserMedia` counted):
  - `npm run typecheck` → 0; `npx vitest run` → 32 files, 319 passed (new: going on at beat
    5 plays Dha, Ni, Sa at once with no count-in; a held Sa sounds again for its last two
    beats; round 2 of 3 resumed ends after round 3; no `at` counts in as before; `cut` ends
    the note sounding and forgets the later ones; the rows' order, buttons and labels; the
    vibhag colours in Teentaal and Rupak, in the empty row too, none of `bxmark`); the
    comparisons with the prototype still pass; `npm run build` → 198 kB JS (70.7 kB gzip),
    35 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid.
  - Scenario `round6` (42 checks, twice): a line's number, then boxes, then play, play from
    here, × each the row's full height at its right end, icons only, a heading's × in line;
    no X or 0, sam and khali boxes coloured differently, the key (not in Free text); a row lit
    under the pointer; a tap on its empty space selects it and another unselects; a tap in a
    box types; a press in a box let go over empty space selects nothing; a heading selects
    too; play this line shows ■ and stops; play from here on line 3 plays from line 3, ■
    stops it, the pickers unchanged; the deck: Stop greyed out when idle, Play then "Pause",
    Pause keeps the beat marked with "Paused · …", Play goes on from that beat at once, Stop
    clears; the space bar plays and pauses; played 5 s, paused 4 s, played 7 s: one log
    entry of 12 s; a sheet line number and a section button play there with the pickers
    unchanged; the microphone: off when switched on, on with Play (1 open), off on Pause, on
    again going on (2), off on Stop, on and then off when the song ends by itself (3), the
    scores kept, the quick listen leaves it off; 360 px: the buttons stacked down the row's
    end, at least 30 px each, no sideways scrolling day and night; no console errors.
    `rewaz6` (5): Pause holds a rewaz item with its bar, Play goes on from the same beat,
    the item never touched the pickers (0/7, loop off), Stop while paused ends the rewaz.
    Updated for this round and passing: `round5` (30), `move` (30), `edit3` (30), `sections`
    (15), `pherta` (25, the marks read from the colours), `takes` (20, stopped with Stop);
    passing unchanged: `paste` (27), `boxes`, `words`, `midi` (19), `theme_notes` (20),
    `print` (7). A 16-beat line (two notes in each of 8 beats) needs 754 px of boxes: one
    row from a 980 px window (900 before this round).
  - CI run `38271975694` (`f7d6ec0`): core, reference and deploy jobs green. Live: `round6` (42 checks, with the WAV microphone) and `rewaz6` (5) against https://rinatmalik.github.io/Gaaner-Sathi/ passed, no console errors; `/` 200, `/new/` 200.
- **Decisions made:** see Decisions (Pause and Stop; what plays; the microphone only while
  playing; beat box rows, round six).
- **Risks or disagreements:** a take ends at a pause (a recording cannot go on mid-line);
  Record me still keeps the microphone open while on (asked); no tuner while nothing plays;
  a line number on the Practice sheet no longer starts a loop of the Lines to practise; a rewaz
  item loops while the deck's "loop" may show unticked; X/0 stay on the Practice and printed
  sheets (asked); the sketch's colours read as zone markers. On an iPhone, opening the
  microphone at each play may ask again or move the sound to the earpiece: not tried. With
  the count-in off, the first notes before the microphone opens go unscored. Nobody has used
  Pause with a real voice.
- **Next handoff:** Rinat tries round two and answers the two questions; more design comments.

### 2026-10-11 18:56 BST — Claude (Opus 5.5) — PH2-01 design, round one: beat boxes round five; a fade before silence

- **Goal:** Rinat, starting the design phase ("mostly design amends … you could call this
  moving to the design phase"): no Copy at the end of each line, and "Bring the play button to
  the front of the line … just below the line number … just have the icons"; no Done ("just
  copy and paste"); the heading's ×, "at the bottom left corner", to the top right like the
  others; "the faded ending on any note that is followed by a 'Silence x' beat"; no preview
  pane in the editor, so "the beat boxes can have the full width and can fit 16 boxes in one
  line".
- **Inspected:** `src/app/boxes.ts` (row HTML, the selection bar, Done clearing the copy);
  the heading row (one flex row with `flex-wrap`, so its × wrapped to the start of a new line
  whenever the fields did); the editor grid in `index.html` (the Octave and Join/Split row
  lived in the preview column; in the boxes it works on the box chosen through `focusBeat`);
  the transport's note scheduling and how the parser makes events (a rest ends a note; a hold
  lengthens it).
- **Changed:** `8d02aed` (feat): `silenceAt(P, t)` in `src/audio/transport.ts`; a note whose
  next share of a beat is a rest lets go with `endFade / 3` (off with `endFade` 0); a test;
  `/dev/render.html` measures it. `51d2543` (feat): a line's number with ▶ just under it in
  front (▶ / ■, labelled), × alone at its top right, no Copy on the line; the number of a
  selected row shows as a brass chip (the ⠿ / ✓ under it made way); a heading's fields in
  their own wrapping group, its × at the top right; the selection bar only while rows are
  selected (Copy, Paste after line N, Clear), and for six seconds after Copy a hint with no
  button; no Done (the copy stays until something else is copied); the preview column hidden
  in the beat boxes (`#prevCol`, `.edgrid.solo`), kept in Free text; the Octave and Join/Split
  row moved above the boxes and its messages say "Choose a beat box"; help and hint. This
  commit (docs): NOTATION (Beat boxes), ENGINE (the fade before silence, its measurement),
  ROADMAP (Phase 1 closed, Phase 2 now, its first row), this file (the 14:10 entry moved to
  HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through the
  DevTools protocol on `npm run dev`, real mouse and key events; the browser pane was hidden):
  - `npm run typecheck` → 0; `npx vitest run` → 31 files, 313 passed (new: Re for half a beat
    then `x`, and Ga held into `x`, let go with 0.083 s at 0.845 s and 2.095 s, Ni (last) too;
    Sa, Pa, Dha before notes with 0.04 s; none with `endFade` 0; the boxes' HTML: ▶ under the
    number, icon only, × last, no Copy, a heading's fields then its ×); `npm run build` → 195
    kB JS (69.4 kB gzip), 33 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed,
    12 exercises valid.
  - Scenario `round5` (32 checks): in the beat boxes no preview, one column, the boxes as wide
    as the editor (1148 px at 1280), the Octave row just above them; Free text shows the
    preview beside the text; ▶ just under line 1's number, centred on it, level with the
    words, in front of the boxes, "▶" labelled "Play line 1", no Copy; it plays the line
    showing ■ and ■ stops it; a line's × and a heading's × at the top right, the heading's
    level with its name, at 1280 and 360 px (where its fields wrap onto three lines); a number
    tapped: "1 line selected Copy Clear"; Copy: "1 line copied. Tap the number of the line to
    paste after." with no button, the song unchanged; Paste after line 4, then again after
    line 2 with no second Copy; two Undos; the hint gone by itself after six seconds and the
    copy still pasting under a heading; no Done anywhere; ↑ Higher on a chosen box raises its
    note (the row says "র্সা · line 1") and ↓ Lower restores it; a Teentaal song's two 16-beat
    lines (one with two notes in each of 8 beats) on one row each at 1366, 1280, 1024 and 900
    px windows (two rows at 860, 800 and 768); 360 px day and night without sideways
    scrolling; no console errors. `paste` (27), `move` (30) and `edit3` (30), their Copy, Done
    and "▶ Play" checks rewritten for round five, and `boxes`, `words`, `sections`, `pherta`
    pass.
  - Audio (`/dev/render.html`, OfflineAudioContext 48 kHz in headless Edge): the port still
    matches the prototype within its own run-to-run variation (three runs: at most 6.8 × 10⁻⁶
    against the prototype, which differed from itself by up to 6.4 × 10⁻⁶); Ga before a beat
    of silence falls 20 dB in 195 ms (95 ms with the old release); the last note 175 ms and a
    tanpura at the end 195 ms, as before.
  - CI run `38161509189` (`51d2543`): core, reference and deploy jobs green. Live: `round5` (32 checks) and `paste` (27) against https://rinatmalik.github.io/Gaaner-Sathi/ passed, no console errors; `/` 200, `/new/` 200.
- **Decisions made:** see Decisions (Phase 2 begun; beat boxes, round five; a fade before
  silence).
- **Risks or disagreements:** the preview stays in Free text (Rinat's reason, that the boxes
  show the same, does not hold there); say if it should go there too. Below a 900 px window a
  16-beat line with two-note beats takes two rows, and on a phone always. The drag dots (⠿)
  under each number are gone, so a number no longer hints that it can be dragged except by
  its pointer and the hint text. After Copy the hint shows for six seconds only. Nobody has
  heard a note fade into silence.
- **Next handoff:** Rinat tries round five and sends more design comments (Phase 2).

### 2026-10-11 17:53 BST — Claude (Opus 5.5) — PH1-11 beat boxes round four; a gentle ending

- **Goal:** Rinat, "a few more snags before we move on": all the lines selected should drag,
  not one; a smaller preview, "8 beats are breaking into two lines … I would like one line to
  be shown in one line"; at the end "the sound stops abruptly … maybe quarter of a second of
  fade out? … happy to skip it if complicated"; copies no longer pasted at the end: "a paste
  button … paste after whichever line is selected".
- **Inspected:** where an 8-beat line wraps (scenario `widths`, headless Edge, 900–1920 px
  windows): the beat boxes wrapped Kaharwa's 8 boxes into two rows at every width (each box
  53 px; the widest column 565 px is about a pixel short), the preview never did above 900
  px. The end of playing: the last note's release (time constant 0.04 s) and, 1.3 s after
  the song, the session cut with 0.025 s (`endSession`); the drone is off by default, so the
  last note is what stops short.
- **Changed:** `e7efd4e` (feat): `moveRows`, `copyRows`, `pasteRows` in
  `src/core/notation/boxes.ts` (`copyRowsToEnd` gone; `moveRow` is `moveRows` of one); the
  boxes: Copy keeps lines (and writes them to the clipboard as text), a bar offers Paste
  after the last row selected (or under a heading) until Done, across songs; Ctrl+C and
  Ctrl+V on a number; a selected row dragged, or moved with ↑ ↓, takes every selected row
  and they stay selected; boxes 16 px at 2.6em (were 17 px at 3.1em), the editor preview
  18/14 px (were 20/15); help and hint. `7585139` (feat): `Transport.endFade` (0.25 s): the
  last note of a song, or of the last of a set number of rounds, lets go with a time
  constant of `endFade / 3`, and the session's output and reverb send fade over the last
  `endFade` before the end; `reed()` takes a release; the comparisons with the prototype run
  with `endFade` 0; `/dev/render.html` measures both endings. This commit (docs): NOTATION
  (Beat boxes), ENGINE (a gentle ending, its measurement), ROADMAP (row 11), this file.
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through the
  DevTools protocol on `npm run dev`, real mouse and key events):
  - `npm run typecheck` → 0; `npx vitest run` → 31 files, 312 passed (new: copying rows in
    order, pasting after a line's words, under a heading and at the end, nothing to paste;
    several rows moved together from anywhere, dropped on themselves, already in place; the
    ending: the last note's release 0.083 s at 8.095 s, the output and send at 9.17 s, the
    other 15 notes 0.04 s, the same after the last of 2 rounds, none in an endless loop, none
    with `endFade` 0); the comparisons with the prototype still pass; `npm run build` → 195
    kB JS (69.3 kB gzip), 33 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5
    passed, 12 exercises valid.
  - Scenario `widths`: after the change, both 8-beat lines (with two-note beats and words)
    fit one row of boxes at 1024, 1100, 1180, 1366 and 1920 px windows, and one row of the
    preview down to 900 px; a 16-beat Teentaal line takes two rows of boxes from 1100 px (it took four).
  - Scenario `paste` (27 checks): Copy leaves the song alone and the bar says "1 line
    copied. Tap the number of the line to paste after."; a number tapped offers "Paste after
    line 4", which puts the line and its words there, marked, its handle focused, the copy
    kept; one Undo takes it back; two lines copied and pasted under a heading go before its
    lines, in order; the copy is still there in a new song and pastes under its heading;
    Done forgets it; dragging one of two selected lines lifts both and drops them together
    at the end, in order, still selected; ↑ moves both on; two Undos take both moves back; an
    unselected line dragged moves alone; Ctrl+C on a number and Ctrl+V on another paste
    after it; 360 px day and night without sideways scrolling; no console errors. `move`
    (30) and `edit3` (30), with their copy checks rewritten for Copy and Paste and the font
    sizes for round four, `boxes` (30), `words` (17), `sections` (15) and `pherta` (25) pass.
  - Audio (`/dev/render.html`, OfflineAudioContext 48 kHz in headless Edge): the port still
    matches the prototype (at most 2.4 × 10⁻⁶, as the prototype against itself); the last
    note falls 20 dB in 175 ms (95 ms before), a tanpura at the end in 195 ms (65 ms).
  - CI run `38157178276` (`7585139`): core, reference and deploy jobs green. Live: `paste` against https://rinatmalik.github.io/Gaaner-Sathi/ passed all 27 checks, `widths` the same rows at 1366 and 1024 px, no console errors; `/` 200, `/new/` 200.
- **Decisions made:** see Decisions (beat boxes, round four; the gentle ending).
- **Risks or disagreements:** below a 1024 px window (two columns until 860 px) an 8-beat line
  still takes two rows of boxes, and on a phone always. Copy also overwrites the device's
  clipboard. The selection bar stays while something is copied, until Done. Nobody has
  heard the new ending.
- **Next handoff:** Rinat tries pasting, dragging several lines and the ending; then Phase 2,
  the design.

### 2026-10-11 14:10 BST — Claude (Opus 5.5) — PH1-10 taal pherta: a taal per section

- **Goal:** Rinat: "do taal pherta now, then we'll start design" (Open question 6 answered:
  build it before the design phase).
- **Inspected:** every place that took one taal for the whole song: the transport (count-in,
  taal beat, rhythm table, fills, closing stroke on sam), the sheet's marks and bars, the
  checker and its panel, the beat boxes (rows, typing, new lines, bars), the deck's taal
  strip and Ready line, the section buttons, the printed sheet; the heading reader
  (`sections.ts`, which already gave sections their tempo).
- **Changed:** `03e3b31` (feat): a heading's taal read and written (`headingTaal`,
  `headingTaalPart`, `setHeadingTaal`, `TAAL_NAMES`; `headingLabel` leaves the taal out;
  `SongSection.taal`; `endHeadings`); `src/core/notation/taalmap.ts` (`taalMap`, `oneTaal`,
  `asTaals`, `placeIn`); the checker, the core boxes, the transport (`taalAt`), the sheet, the
  checker panel and the printed sheet take the map (and still take one taal and `startOn − 1`);
  a taal picker on each heading row of the beat boxes; the strip follows the taal playing and
  shows the starting taal as soon as play is pressed; the section buttons name a section's
  taal; a help row; the heading row's fields narrower under 520 px so its × stays beside
  them; 16 tests in `tests/unit/pherta.test.ts`. This commit (docs): NOTATION (A taal per
  section), ENGINE, DATA, ROADMAP (row 10; the idea taken out), README, this file (Open
  question 6 answered and removed; the 10:35 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through the
  DevTools protocol on `npm run dev`, real mouse and key events):
  - `npm run typecheck` → 0; `npx vitest run` → 30 files, 308 passed (16 new: taal names in
    19 spellings and forms, two taals naming none, a name inside a word not counting; labels;
    writing, replacing and taking out a taal, renaming a heading keeping it; sections; the map
    (runs from sam, the start beat, a song naming none as one run, a heading after the last
    line); the checker, the sheet's marks, the boxes and their picker, typing a Kaharwa line;
    the transport counting each section in its taal, a Kaharwa count-in, a Kaharwa section's
    Web Audio calls equal to a Kaharwa song's, a song naming no taal equal to before). Made to
    ignore section taals, the code fails 9 of the 16. The comparisons with the prototype (sheet,
    checker, checker panel, transport) still pass. `npm run build` → 193 kB JS (68.7 kB gzip),
    33 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid.
  - Scenario `pherta` (25 checks): each heading row has a taal picker (song's and 19);
    picking Kaharwa writes `# অন্তরা · কাহারবা`, keeps the focus, and the empty row under it
    is 8 boxes marked X···0···; typing 8 notes there makes `পা ধা না র্সা | না ধা পা মা`,
    boxes 4 | 4 while the sthayi stays 3 | 3; the checker says "in Dadra, then Keherwa" and
    is happy; the preview marks it in Kaharwa; a sthayi after it is Dadra again; the section
    buttons read "স্থায়ী / অন্তরা কাহারবা / স্থায়ী"; ready at the antara the strip and the
    panel say Keherwa; played through, the strip goes Dadra → Keherwa → Dadra, 6 and 8 beats,
    Kaharwa's lit 0–7 in order; the antara's button counts in with one Kaharwa cycle (the
    strip on Kaharwa from the start: a bug found and fixed, it showed Dadra until the first
    beat); the printed sheet says "changing taal by section: Dadra, then Keherwa, then Dadra";
    "song's" takes it out and the boxes go back to 3 | 3; Undo puts it back; renaming the
    heading keeps it; 360 px day and night without sideways scrolling; no console errors.
    `boxes` (29), `move` (31), `edit3` (27), `words` (17) and `sections` (15) still pass.
  - Sound: no new render. A Kaharwa section's Web Audio calls equal a Kaharwa song's (above),
    so its levels are Kaharwa's (ENGINE.md → Verifying sound).
  - CI run `38142030205` (`03e3b31`): core, reference and deploy jobs green. Live: `pherta` against https://rinatmalik.github.io/Gaaner-Sathi/ passed all 25 checks, no console errors; `/` 200, `/new/` 200.
- **Decisions made:** see Decisions (taal pherta); Open question 6 answered.
- **Risks or disagreements:** a section whose singing comes in after sam needs `x` for the
  beats before it (no start beat per section), and a change of taal cuts the old cycle short
  where the section begins: right for a sthayi ending on sam, to be heard on Rinat's songs.
  Any taal's name in a heading is read as its taal ("Dadra practice" is Dadra); a name inside
  a longer word does not count. The prototype plays these songs in the song's taal. A rewaz
  estimate counts a count-in in the song's taal. On a phone the picker shows a shortened
  name. Nobody has heard a change of taal.
- **Next handoff:** Rinat tries a song in taal pherta; then Phase 2, the design, with Rinat.

### 2026-10-11 13:36 BST — Claude (Opus 5.5) — PH1-09 words split into syllables; Teora, Kawali, Garba

- **Goal:** Rinat: "yes please" to pasting a line of words and having it split into syllables
  under the notes (Rinat's diaries split words as `আ মার সো নার`); "add a few more taals that
  are common: Kawali, Teora, Ferta, garba/dandiya"; a roadmap idea for later, after the app is
  public: Hindi users, and Western music with piano notes. "That's it for features, we'll then
  move onto the design phase after this."
- **Inspected:** the taal tables, grooves and their tests; the word boxes' typing and paste
  paths. Sources: geetabitan.com's taal index and its Teyora and Taal Pherta pages;
  onushilon.org's Kawali and Kaharba pages (fetched over plain HTTP, read as data; they cite
  *Tabla Bigyan*, Manas Dasgupta's *Taal-abhidhan*, Prafullakumar Das); nazrulkosh.org entries
  marked "তাল ফেরতা (দাদরা/কাহারবা)"; kksongs.org's tabla guide (a Qawwali Kaherva); a 2001
  chandrakantha.com tabla forum thread on the garba rhythm. tablatheka.com was not fetched
  (it redirected through a gambling site before).
- **Found:** "Ferta" is taal pherta, songs that change taal between parts, not a taal: asked
  (Open question 6), not built. No written Garba theka exists in a book; the forum's 6-matra
  rhythm was used.
- **Changed:** `bbeba89` (feat): `src/core/notation/lyrics.ts` (`wordSyllables`, `syllables`,
  `fillWords`), paste into a word box (and a paste that arrives as `insertFromPaste`) fills
  syllables, a note under the boxes (`#bxNote`), help and hint; 4 tests. `4a6ef09` (feat):
  Teora, Kawali, Garba in `taals.ts`, their dholak and drum grooves, the picker's More taals
  group; tests updated. This commit (docs): NOTATION, ENGINE, DATA, ROADMAP (row 9; taal
  pherta and phonetic typing as ideas; "After the app is public": Hindi, Western music),
  README, this file (the 08:57 entry moved to HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through the
  DevTools protocol on `npm run dev`):
  - `npm run typecheck` → 0; `npx vitest run` → 29 files, 292 passed (lyrics 4 new: 28 words
    split as sung, a pasted line with punctuation, laying under notes across lines, the box
    chosen, a lone `-`, a second verse, words left over; taals: thekas, marks, lengths, 19 in
    the picker); `npm run build` → 187 kB JS (66.4 kB gzip), 33 kB CSS;
    `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed, 12 exercises valid.
  - Scenario `words` (17 checks): a real Ctrl+V (clipboard granted) of
    "আমার সোনার বাংলা, আমি তোমায়" under line 1's first note gives `> আ মার সো | নার - বাং`
    and `> লা আ মি | - তো` (held and silent beats `-`), the boxes and sheet show them, the
    focus goes on, the note says "9 syllables placed … No notes left for: মায়.", one Undo
    takes it back; a word typed stays whole; the picker offers 19; Teora, Kawali and Garba each
    check clean with bars on their vibhags, play, and show their theka on the strip; 360 px
    both themes; no console errors. `boxes` (29) still passes.
  - Audio (`/dev/render.html`, OfflineAudioContext 48 kHz in headless Edge): the port still
    matches the prototype (differences 0 on the compared sessions shown); the three new taals'
    levels are in ENGINE.md → Verifying sound (tabla −18.1 to −19.2 dB RMS, dholak −18.4 to
    −20.4, drums −21.0 to −23.3, peaks −1.9 to −4.5 dBFS, no silent beats).
  - CI run `38139753394` (`4a6ef09`): core, reference and deploy jobs green. Live: `words` against
    https://rinatmalik.github.io/Gaaner-Sathi/ passed all 17 checks, no console errors; `/` 200,
    `/new/` 200.
- **Decisions made:** see Decisions (the three newest rows); Open question 6.
- **Risks or disagreements:** the syllable split is a spelling rule, not a dictionary: words
  whose sung syllables differ from their spelling (হাওয়া, medial vowels dropped in speech)
  need a correction by hand. Kawali has other thekas; Garba has no book theka; Kawali's
  dholak and drums are about 2 dB louder than the other taals'. Nobody has heard the three.
- **Next handoff:** Rinat answers Open question 6 (taal pherta) and tries pasting words and
  the three taals; then the design phase (Phase 2).

### 2026-10-11 10:35 BST — Claude (Opus 5.5) — PH1-08 beat boxes round three

- **Goal:** Rinat ("all works and happy with the decision you made"): remove "+ words" (a
  row of words is always there); a Play button that plays just that line, to hear a line
  just written; fonts a little smaller in the editor and its preview; the × at the top of a
  line; Copy to the end rather than just below, and several lines selected and copied at
  once, "as long as it doesn't break anything else". Rinat also asked what the colours in a
  Practice screenshot mean, and whether there is an easier way to type Bengali lyrics.
- **Inspected:** the transport's start and rounds, `play()`, `stop()`, the practice log and
  take hooks in `app.ts`; the pitch colour thresholds (`src/app/pitch.ts`: good from 85, ok
  from 60, off below, not sung); the lyric typing path in the boxes.
- **Changed:** `3eae75f` (feat): `copyRowsToEnd` replaces `duplicateLine` in
  `src/core/notation/boxes.ts`; the boxes get ▶ Play (the host's `playLine`: one round of
  that line, `countIn: false`, the pickers, log and takes left alone; ■ Stop), the box of
  the beat sounding lit (`markBeat`), tap-to-select on the numbers with a sticky bar (Copy
  to the end, Clear; Escape or any change ends it), Copy to the end, × first in the row's
  buttons, Enter in a word box for another verse row; "+ words" removed; CSS sizes; help
  rows for Play, copying and the words. This commit (docs): NOTATION → Beat boxes, ROADMAP
  (row 8; a feature idea for writing the words), this file (the 02:20 entry moved to
  HISTORY).
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through the
  DevTools protocol, real mouse, key and touch events):
  - `npm run typecheck` → 0; `npx vitest run` → 28 files, 288 passed (the copy test rewritten
    for the end; the HTML test checks the buttons and the selection marks); `npm run build`
    → 183 kB JS (65.0 kB gzip), 33 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5
    passed, 12 exercises valid.
  - Scenario `edit3` (27 checks) on `npm run dev`: a line's buttons are × ▶ Play Copy, the ×
    8 px from the row's top and flush right; fonts 17/15 px in the boxes, 20/15 px in the
    editor preview, 22 px still on Practice; ▶ Play on line 2 says ■ Stop, its first box lit
    125 ms after the tap (no count-in), boxes b:1:0 to b:1:5 lit in order and no others, then
    it stops by itself, the button back to ▶ Play, the from-line picker and the practice log
    unchanged; ■ Stop stops; Copy puts line 1 with its words at the end, marked and scrolled
    to; taps select a heading and two lines ("2 lines and 1 heading selected"), a second tap
    unselects, Copy to the end copies them in order and ends the selection, one Undo takes
    it back; Clear and Escape end a selection; Space on a focused number selects; a drag
    moves and selects nothing; Enter in a word box opens row 2 at the same beat and typing
    writes `> - তু মি`; on a 360 px touch phone a tap on a number selects; 360 px day and
    night without sideways scrolling; no console errors. Bug found and fixed on the way:
    the copies were not marked (writing the text redraws the rows first, so the count was
    read too late).
  - Scenario `move` (31 checks, its copy checks changed to "at the end") and `boxes` (29)
    still pass.
  - CI run `38128789762` (`3eae75f`): core, reference and deploy jobs green. Live: `edit3`
    against https://rinatmalik.github.io/Gaaner-Sathi/ passed all 27 checks, no console
    errors; `/` 200, `/new/` 200.
- **Decisions made:** see Decisions (beat boxes, round three).
- **Risks or disagreements:** ▶ Play needs sound on the device, which Rinat will hear but
  nobody here can. A tap on a number now both selects the row and focuses it, so selecting
  and moving share the number; a phone that scrolls on a drag elsewhere may still surprise.
  The pitch marks in Rinat's screenshot were mostly red: either the singing was off by more
  than 30 cents, or the delay or thresholds need tuning on a real voice (asked).
- **Next handoff:** Rinat tries ▶ Play and copying several lines; answers on the red marks
  and on a lyric helper; then the design phase.

### 2026-10-11 08:57 BST — Claude (Opus 5.5) — PH1-07 beat boxes round two; lean docs

- **Goal:** Rinat: clean up the documentation and framework files no longer needed, remove
  duplicates, "a lean framework with context, history and roadmap", rewrite files that have
  become unorganised (Rinat's two blank lines at the end of ROADMAP deletable); make each
  beat-box line draggable to reorder, with a button that copies a line just below it; how to
  type several notes in one beat (typing over a box replaces its note, which is right); and
  how sharing the link, moving to another device and progress work underneath.
- **Inspected:** every doc (CONTEXT, HISTORY, ROADMAP, NOTATION, ENGINE, DATA, PARITY,
  SECURITY, the five ADRs, README, CLAUDE, AGENTS, reference/README); `src/app/boxes.ts` and
  `src/core/notation/boxes.ts`; what song files carry (`songForFile`) and what import does
  (new ids, no merging).
- **Changed:**
  - `8170085` (feat): `rowBlocks`, `moveRow`, `duplicateLine` in `src/core/notation/boxes.ts`;
    in the boxes each heading and line has a handle (its number, ⠿): pointer drags (mouse or
    touch, a brass line where it will land, the boxes or page scrolling at the edges, Escape
    cancels), ↑ ↓ on a focused handle, Copy on each line; each move or copy one undo step,
    and undo from a handle keeps the focus on one. An arrow first ends a box's selection
    (→ then typing adds a note to the beat); `readableBeat` mends sargam among letters
    (`Sre` → `SR`). Help row and hint say how. 3 new tests.
  - This commit (docs): CONTEXT rewritten lean (The documents, a list of what waits for a
    real voice or device, rules merged from SECURITY and the old defaults, decisions in
    force); HISTORY gains the finished PH0 items, 12 decisions no longer in force and four
    older log entries, all word for word (moved by a script that checks each boundary);
    ROADMAP rewritten (a table of what is built and its check, ideas left, a new one: one
    file that moves everything to another device); NOTATION, ENGINE, DATA rewritten in order,
    with the ADRs' reasons folded in and DATA → "Where things live, and what travels";
    CLAUDE and AGENTS short pointers; README and reference/README brought up to date;
    `SECURITY.md`, `docs/PARITY.md`, `docs/adr/` removed; source comments that named ADR
    files now name the doc sections.
- **Tests / verification** (Git Bash, Node 24.20.0, Windows 10; headless Edge 155 through the
  DevTools protocol on `npm run dev`, real mouse, key and touch events):
  - `npm run typecheck` → 0; `npx vitest run` → 28 files, 288 passed; `npm run build` → 181 kB
    JS (64.1 kB gzip), 32 kB CSS; `bash reference/tests/run-all.sh` → 31/11/10/12/5 passed,
    12 exercises valid.
  - Scenario `move` (31 checks, all passed, no console errors): handles numbered in row order
    (`0:# 1:1 2:2 3:# 4:3`), a Copy on each line; a mouse drag lifts the row and shows the
    drop line, and line 2 dropped above line 1 moves with its words; Undo; a heading dragged
    up moves alone; Ctrl+Z on the handle; a drop below the last row; Escape mid-drag changes
    nothing; a 2 px wobble is a tap that focuses the handle; ↓ ↓ ↑ ↑ ↑ ↑ move it down past
    the heading, back, above the heading and stop at the top; Copy puts the line and its
    words just below, marked as line 2, which then drags to the end; two Undos; a space
    selects the next box, → keeps the box and typing গা makes `রাগা`; on a 360 px phone
    with touch, a line dragged by a finger moves; on an 18-line song (boxes 560 of 3 396 px)
    held at the bottom edge, the boxes scrolled 2 567 px and the line landed at line 17; 360
    px day and night with no sideways scrolling. The first run failed 7 checks, all from one
    cause: after a mouse drop nothing had focus, so Ctrl+Z missed; a drop now focuses the
    moved row's handle (and edge scrolling now speeds up nearer the edge).
  - Scenario `boxes` from PH1-06 (29 checks) still all passed.
  - CI run `38123035124` (`8170085`): core, reference and deploy jobs green. Live: the
    `move` scenario against https://rinatmalik.github.io/Gaaner-Sathi/ passed all 31 checks,
    no console errors; `/` 200, `/new/` 200.
- **Decisions made:** see Decisions (the three newest rows: lean docs; decision records
  without ADR files; drag and copy in the beat boxes).
- **Risks or disagreements:** dragging was tried with emulated touch, not a real phone; a long
  press is not needed (the handle takes the touch at once), which may surprise on a phone
  that scrolls by dragging anywhere else. Copy copies the words too (Rinat may prefer the
  notes only, for a repeat with new words). Moving a line changes where it falls in the taal
  if lines are not whole cycles (the checker then says so). Progress, routines, settings and
  takes do not move between devices yet (a feature idea).
- **Next handoff:** Rinat tries dragging and copying lines, and the other features; then the
  design phase.

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
