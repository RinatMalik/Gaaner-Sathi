# Parity checklist: prototype → new app (Phase 0)

> Cold reference for the Phase 0 port. Every feature of `reference/gaaner-sathi.html`,
> built from the kickoff's feature list (§3) and a full read of the prototype's code
> (2026-10-09). Reach parity before adding features. Exact numbers for sound and timing
> are in `docs/ENGINE.md`; notation rules in `docs/NOTATION.md`; data in `docs/DATA.md`.
>
> **Status:** `—` not started · `Core` logic ported and tested, not yet in the UI ·
> `Done` works in the new app, with evidence in a `CONTEXT.md` Work log entry. A status
> is a pointer, not proof: the evidence is the Work log (see Source-of-truth order).
>
> **Parity means the same capabilities, not the same layout.** The prototype shows
> every control at once; the new app keeps the essentials up front (song, play, tempo,
> key) and puts the rest one tap away, so a first-time singer needs no tutorial.

## Notation (the pure core; contract: `docs/NOTATION.md` + `reference/tests/`)

| ID | Feature | Status |
|---|---|---|
| N1 | Bengali akarmatrik and Sa Re Ga letters, mixed freely; a beat is a group between spaces or bars | — |
| N2 | Komal ঋ জ্ঞ দ ণ / `r g d n` and tivra হ্ম / `M#` (`#` only after Ma, else an error) | — |
| N3 | Octaves −2…+2: upper রেফ `র্` before (repeatable) or `'` `’` `^` `*` `` ` `` after; lower `.` before or হসন্ত after; a mark after the আকার still applies | — |
| N4 | Holds `- – — ~ ০` extend the previous note across beats and lines; rests `x X _ ×` end it; an unreadable beat becomes a hold | — |
| N5 | Several notes in one beat without a space, split evenly (`পধা` = `পাধা` = `PD`; `S-R` is uneven); the আকার never ends a beat | — |
| N6 | Bars `\| । ॥ ‖ I` (and `II`) separate beats; display and checker only | — |
| N7 | Lyric lines `>` under a notes line, one group per beat; several `>` lines stack as verses; a group of only `০ 0 - – —` is drawn faded; more groups than beats → warning; lyrics with no notes line above → warning | — |
| N8 | Heading lines `#` (shown, not timed) | — |
| N9 | Pickups: `startOn` puts the first beat on any taal beat | — |
| N10 | Unknown characters flag their beat (`“ক” is not a note the player knows`); the beat still plays what it could read; errors carry the global beat index | — |
| N11 | Source offsets for every beat, note letter and octave mark (the editor needs them) | — |
| N12 | Note events: start and duration in matras; holds merge into the note before | — |
| N13 | Edit operations: `shiftOctaves`, `joinBeats`, `splitBeats` (pure text → text) | — |
| N14 | Checker: bar/line lengths against vibhag lines (each bar judged on its own), octave slips with a one-click fix, deliberate-leap exemptions | — |
| N15 | 12 built-in exercises generated from compact Sa Re Ga specs, plus the Sa Re Ga typing example; all check clean | — |

## Editor (Edit notation tab)

| ID | Feature | Status |
|---|---|---|
| E1 | Title field (empty → "Untitled song"); Taal select ("Dadra · দাদরা (6)"); "Song starts on taal beat" select, marking sam (X) and khali (0); `startOn` clamped to the cycle | — |
| E2 | Notation box in Tiro Bangla; spellcheck and autocapitalise off; re-parse 140 ms after typing; typing stops playback | — |
| E3 | Palette: "Insert notes in" Lower / Middle / Upper; 12 note buttons drawn in the current script with spoken names ("Insert komal Re"); Hold −, Silence x, Bar \|, New line, Lyrics line >; adds a leading space when needed; Bengali tokens end in আকার + space | — |
| E4 | Live preview (the diary sheet) beside the box: tap a beat to select its text; Shift-tap extends the selection; selected beats outlined | — |
| E5 | Selection info: one note shows the note and its line; several show "N notes · lines a–b"; prompts when nothing is selected | — |
| E6 | Octave fix: ↓ Lower / ↑ Higher, and Alt+↑ / Alt+↓ in the box; a bare caret picks the note just left of it; clamps at ±2 with a message | — |
| E7 | Join (selected beats, or this beat and the next; refuses across a bar or a line, with a message) and Split (every unit its own beat, written canonically) | — |
| E8 | On fine-pointer devices edits go through the browser's own typing, so Ctrl+Z undoes them | — |
| E9 | Checker panel, live: summary ("N lines · M matras · C cycles of Dadra and R matras"); read errors, lyric warnings, bar and line lengths, octave slips ("… Should it be …?"); **Show** selects and scrolls to it, **Fix** applies the octave shift; first 12 shown, then "and N more"; an all-clear line when clean | — |
| E10 | "How to type your diary notation" help panel | — |
| E11 | Built-in exercises are read-only: a note explains that edits are not kept and points to **Make a copy**; Delete is hidden | — |

## Playback (the harmonium deck and the Sound mixer)

| ID | Feature | Status |
|---|---|---|
| P1 | Brass play/stop button (accessible name switches Play/Stop); Space bar plays and stops unless focus is in a field, button or editable element | — |
| P2 | Tempo 30–240 matras/min: number field, − and + (steps of 4), slider; saved with the song | — |
| P3 | Sa: key (C … B, each with its CT-X3000 key, "C · White 1", "C♯ · Black 1" …) and octave (Low 3, Middle 4, High 5); saved with the song; retunes live (drone, tabla pitch, tanpura) | — |
| P4 | Six taals with theka, vibhags and marks: Dadra, Keherwa, Rupak, Jhaptal, Ektal, Teentaal | — |
| P5 | Rhythm: Tabla, Dholak, Drums, Click or Off, with a rhythm volume slider (live) | — |
| P6 | Speed: Half, Normal, Double | — |
| P7 | "Fill every 4th cycle" (also fills the count-in); the kit crashes on the sam after a fill | — |
| P8 | Layer chips per style (tabla/dholak: manjira, kartal, ghungroo, shaker; dholak adds tambourine; drums: shaker, tambourine, claps, cowbell, congas, ride); each style remembers its own | — |
| P9 | Harmonium guide: 1, 2 or 3 reeds (loudness-matched, tone updates live); Guide Full, Soft or Off (live) | — |
| P10 | Drone: Tanpura or Harmonium, with a volume slider (live; default 0, and picking a drone at 0 sets 0.5); tanpura 1st string Pa, Ma or Ni (shown only for the tanpura) | — |
| P11 | Master compressor and reverb as in ENGINE.md | — |
| P12 | Not looping: stops at the first beat after the song, with a final stroke if that beat is sam, ending 1.3 s later | — |
| P13 | Highlight compensates for output latency (Bluetooth) | — |
| P14 | One clock: melody, rhythm and highlight scheduled from the same audio-clock times (lookahead scheduler) | — |

## Practice

| ID | Feature | Status |
|---|---|---|
| R1 | "Lines to practise": from-line, loop checkbox, to-line (labels show the line's first 6 beats in the current script); picking a to-line ticks loop; from ≤ to is kept; changing while playing restarts | — |
| R2 | Tap a line number in the sheet to play from that line | — |
| R3 | Count-in of one cycle plus any pickup, always starting at sam; the panel counts down ("Count-in · you come in after 3 beats") | — |
| R4 | When looping, the guide plays every round, the first round only, or every other round (call and response: "your turn, sing it alone") | — |
| R5 | Tempo trainer: speed up each round by 2, 4, 6, 8 or 10, up to a ceiling (30–240, default 160); ticking it ticks loop; the song's saved tempo is unchanged | — |
| R6 | "Now singing" panel: "Line 3 · beat 2 of 8 · round 2 · 104 per min", the big note, lyric rows, the next four beats (wrapping inside a loop); idle "Ready · starts at line N after one Dadra cycle"; "Finished" at the end | — |
| R7 | Live taal strip: name in English and Bengali, "6 matras, 3 + 3"; each beat shows its mark, number and the current style's bol; the current beat is lit | — |
| R8 | Current beat highlighted in both sheets; the sheet scrolls to the current line (smoothly unless reduced motion) | — |
| R9 | Screen wake lock while playing, requested again when the page becomes visible | — |
| R10 | A note held across the loop start is re-sounded there; loop rounds clip notes at the loop end | — |

## Songs and files

| ID | Feature | Status |
|---|---|---|
| F1 | Song picker with "My songs" (by title) and "Exercises"; **+ New song** (Untitled song, Dadra, 100, the current Sa, text `# স্থায়ী`), opening Edit with the title selected | — |
| F2 | Each song is its own record; saves debounced (900 ms) and flushed when the page is hidden or another song loads; status line ("Saving…", "Saved in this browser", failures that say what to do) | — |
| F3 | **Make a copy** (exercise: drops an "Example ·" style prefix; own song: adds "(copy)") | — |
| F4 | **Delete song** with an inline Delete / Keep confirmation; then opens the first remaining song, or the first exercise | — |
| F5 | **Export this song** → `<title>.json` in the `gaaner-sathi` v1 envelope | — |
| F6 | **Back up all my songs** → `gaaner-sathi-songs-YYYY-MM-DD.json` (exercises left out; a message when there is nothing to back up) | — |
| F7 | **Import from file**: one or more `.json` (envelope, bare array or single song) or `.txt` (one song named after the file); 2 MB per file, 200 songs, 200 000 characters per song; always new ids; reports counts and problems; opens the first imported song | — |
| F8 | Opens on the last song used (default: exercise 3, "অলংকার · তিন স্বরের দল") | — |
| F9 | Device preferences kept per browser, with migrations of old keys (`extra` → `layers`, `dropGuide` → `guideLoop: 'first'`); the last tab is remembered | — |
| F10 | Show notes as বাংলা or Sa Re Ga (sheets, chips, line labels, note buttons) | — |

## Look and feel (keep this identity)

| ID | Feature | Status |
|---|---|---|
| L1 | Header "Gaaner Sathi" with "গানের সাথী · harmonium and rhythm from your own notation" | — |
| L2 | Rosewood harmonium deck with a brass play button | — |
| L3 | Ruled diary sheet with a red margin line and line-number buttons in the margin; headings; notes in ink, lyrics in red ink; held lyrics faded; multi-note beats under an arc; taal marks above beats; bar lines (the writer's bars, else vibhag lines); unreadable beats with a wavy underline and a tooltip | — |
| L4 | Note glyphs. Bengali: রেফ before for upper, a dot below for lower, আকার after the last note of a beat. Sa Re Ga: a dot above for upper, below for lower, komal underlined, tivra with a tick | — |
| L5 | Fonts: Tiro Bangla for notes and display, Hind Siliguri for the interface | — |
| L6 | Light and dark themes from the system setting, built on colour tokens | — |
| L7 | Usable at 360 px wide with no sideways scrolling (layout steps at 860 and 520 px) | — |
| L8 | `prefers-reduced-motion` respected | — |
| L9 | Keyboard and screen reader: labelled controls, pressed state on toggle buttons, tabs with selected state, live regions for status | — |

## Specific to claude.ai (remove in the port)

| ID | Feature | Status |
|---|---|---|
| X1 | `window.claude.use('db')` song storage (collection `songs`, live sync) → the app's own storage (`localStorage`, as the prototype's fallback; ADR-001) | — |
| X2 | `window.claude.use('downloads')` file saves → an ordinary browser download | — |
