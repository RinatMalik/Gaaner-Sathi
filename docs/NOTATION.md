# Notation

How a song is written: the text the singer types, how it is read into beats and notes, how
the editor writes it, and the checker. The parser, the edit operations and the checker are
the prototype's (`reference/gaaner-sathi.html`, between `/*PARSER-START*/` and
`/*PARSER-END*/`), ported one-for-one to `src/core/notation/` and pinned by the reference
suites and the comparison tests. Sections and the beat boxes were added by the app.

## Song text

A song is plain text, one line per row. The text is the only record of the song: every
other view (the sheet, the beat boxes) is worked out from it.

| Line starts with | Meaning |
|---|---|
| `#` | A heading shown in the sheet (`# স্থায়ী`, `# অন্তরা`, a practice tip). Not timed. It can give its section a tempo and a taal of its own (Sections below). |
| `>` | Lyrics for the notes line directly above. One group per beat, split on spaces and bar characters. Several `>` lines under one notes line stack as extra rows (verses). A group made only of `০ 0 - – —` is drawn faded as a held vowel. More groups than beats is a warning. |
| anything else | A notes line. Blank lines are ignored. |

## Beats

- **A beat (matra) is a group of characters between spaces or bar characters.** `সা রা গা`
  is three beats.
- **Notes written together without a space share the beat**, split evenly: `পধা`, `পাধা`
  and `PD` are all Pa then Dha in one beat. `SRGM` is four quarter-beats.
- The আকার `া` is only the vowel sign of a note. It never ends a beat (`পাধা → [PD]`; the
  prototype once treated it as a separator, which was a reported bug).
- Bars `| । ॥ ‖ I` separate beats too. They do not change timing; they are kept for display
  and for the checker. `II` (double bar) is accepted.
- Inside a beat, each unit gets an equal share: a note, a hold or a rest.
  - **Hold** `- – — ~ ০` extends the previous note, even across beats and lines (`সা -া -া`
    is Sa for three beats; `S-R` gives Sa two thirds and Re one third of the beat).
  - **Rest** `x X _ ×` is silence and ends the previous note.
- A beat with nothing readable becomes a hold.

## Notes

| Semitone | Bengali | Latin | Name |
|---|---|---|---|
| 0 | স | S (s) | Sa |
| 1 | ঋ | r | komal Re |
| 2 | র | R | Re |
| 3 | জ্ঞ | g | komal Ga |
| 4 | গ | G | Ga |
| 5 | ম | M (m) | Ma |
| 6 | হ্ম | M# | tivra Ma (`#` is only valid after M) |
| 7 | প | P (p) | Pa |
| 8 | দ | d | komal Dha |
| 9 | ধ | D | Dha |
| 10 | ণ | n | komal Ni |
| 11 | ন | N | Ni |

Ignored inside beats: আকার `া`, বিসর্গ `ঃ`, ZWJ, ZWNJ. A BOM (U+FEFF) inside a line acts as
a space, because JavaScript counts it as whitespace (the port keeps this).

## Octaves (range −2 … +2)

| | Bengali | Latin |
|---|---|---|
| Upper (তার) | রেফ before the note: `র্সা` (repeat for +2: `র্র্সা`) | `'` after the note: `S'` (also `’`, `^`, `*` or a backtick) |
| Lower (মন্দ্র) | `.` before: `.না`, or হসন্ত after: `ন্` | `.` before: `.N` |

- A mark written after the আকার still applies: `সা'` is upper Sa.
- `র্` followed by a note letter is always a রেফ (upper octave on the next note). A lower Re
  has to be written `.রা`.
- **Phonetic keyboards** (Avro and similar) join consonants typed in a row into conjuncts,
  so typing `mpa` can give `ম্পা`; the হসন্ত reads as lower Ma + Pa. Open question 2 in
  `CONTEXT.md`.

## Errors

An unknown character flags its beat (`“ক” is not a note the player knows`); the beat still
plays what it could read. Errors carry the global beat index so the editor can jump to them.

## Placement in the taal

`startOn` (1-based) is the taal beat the song's first beat lands on, for songs that start
with a pickup. Every later position comes from counting beats; nothing in the text sets
timing, except that where a section's heading changes the taal (A taal per section, below),
the count starts again on the new taal's sam.

## Sections, their tempo and their taal

`src/core/notation/sections.ts`, worked out beside the parser (which stays the prototype's).

- A **section** is a run of notes lines under the same heading. When several headings come
  one after another, the last names the section (an exercise's tip, then `# আরোহ`, is
  "আরোহ"). Lines before any heading are a section with no name. Practice shows a button for
  each section when there are two or more; a tap plays from its first line, looping it when
  looping is on.
- **A tempo per section:** a heading may give one, as `tempo 110`, `লয় ১১০` (Bengali or Latin
  digits; য় in either spelling) or `♩=110`, anywhere in it: `# অন্তরা · tempo 110`,
  `# সঞ্চারী (লয় ৮০)`. A tempo in a heading just above the one that names the section
  counts too. Clamped to 30–240. Sections without one play at the song's tempo (no carrying
  on from the section before). The sheet shows the heading as written; the section buttons
  show the name and "♩110".
- The deck shows and changes the tempo of the section playing (or about to play): for a
  section with its own tempo, the change is written back into its heading, keeping its
  words and its digits; otherwise it is the song's tempo.

### A taal per section (taal pherta)

Songs in taal pherta (তাল ফেরতা) change taal from one part to another: Kaharwa in one part,
Dadra in the next. Built 2026-10-11 at Rinat's request.

- **Written in the heading,** as a tempo is: the taal's name anywhere in it,
  `# অন্তরা · কাহারবা`, `# Antara (Keherwa)`, `# সঞ্চারী · তাল: দাদরা`. Any of the nineteen
  taals, by its English or Bengali name in the usual spellings (`TAAL_NAMES` in
  `src/core/taal/taals.ts`; য় ড় ঢ় ো ৌ in either spelling; a name inside a longer word does
  not count). A heading naming two different taals, such as a note
  `তাল ফেরতা: দাদরা/কাহারবা`, names none. Of several headings in a row, the nearest naming
  a taal gives it.
- **That section plays and is checked in its taal;** sections without one are in the song's
  taal (no carrying on, as with tempos). Where the taal changes, the new taal starts on its
  sam; the song's first beat still falls on `startOn`, and a later section back in the song's
  taal starts on sam too. Singing that comes in after sam writes `x` (silence) for the beats
  before it. *Why sam:* a change of taal is where the drummer starts the new cycle, and the
  silent beats say so in the notation itself, where a start beat for each section would be
  another setting.
- **The map:** `taalMap(text, parsed, taal, startOn)` (`src/core/notation/taalmap.ts`) splits
  the song into runs in one taal, `{from, T, off}`, a beat g falling on taal beat
  `(g + off) mod cycle`. The checker, the sheet, the beat boxes, the printed sheet and the
  transport all read it; they also still take one taal and `startOn − 1`, as the prototype's
  functions did. A song whose headings name no taal is one run, exactly as before. A new line
  under a heading after the last line is in that heading's taal.
- **Shown:** the sheet shows the heading as written and marks each section's beats in its own
  taal; the section buttons add the taal's Bengali name; the checker's summary names the
  taals in order ("in Dadra, then Keherwa, then Dadra"); the taal over the Practice view's
  lines, and its figure, show the taal of the section playing (or about to play), and a
  count-in is a cycle of it; the printed
  sheet says the taal changes by section. The section's name (`headingLabel`) leaves the
  taal out, as it leaves out the tempo.
- In the **beat boxes,** each heading has a taal picker (the song's, or one of the nineteen):
  it writes the taal's Bengali name into the heading (" · কাহারবা", before any tempo),
  replaces one already there, or takes it out; renaming a heading keeps its taal and tempo.
- The prototype reads such a song in the song's own taal throughout.

## How the editor writes notation

- Bengali: upper `র্` prefix, lower `.` prefix, every note followed by `া` when it ends a
  beat, holds `-া`.
- Latin: upper `'` suffix, lower `.` prefix.
- Rinat's diaries may mark the lower octave with হসন্ত rather than `.`: Open question 1 in
  `CONTEXT.md`.

## Edit operations (pure text → text, tested)

- `shiftOctaves(text, selStart, selEnd, ±1)` rewrites only the octave marks of the selected
  notes. A bare caret picks the note just left of it in its beat. Clamps at ±2. Returns the
  new text, the new selection and an undoable `{lo, hi, rep}` replacement.
- `joinBeats(text, s, e)` merges the selected beats (or the caret's beat and the next one)
  into one beat, dropping inner আকার: `পা ধা → পধা`. Refuses across a bar or a line.
- `splitBeats(text, s, e)` gives every unit of the selected beat(s) its own beat, written
  canonically: `পধা → পা ধা`.
- `noteToken(semi, oct, script)` writes one note canonically (MIDI keyboards type with it).

## Beat boxes

The editor's default view (`src/app/boxes.ts`; the text changes are worked out, pure and
tested, in `src/core/notation/boxes.ts`). Every box edit is a text edit, so Free text shows
exactly what the boxes wrote, and headings, lyrics and anything else written there are kept.
Free text is one tap away and remembered. The beat boxes take the editor's whole width, with
no preview beside them (they show the same; Rinat, 2026-10-11); Free text keeps its preview,
where a beat is tapped to choose it. The Octave and Join/Split row sits above the boxes (or
the text) and works on the box chosen (or the beats chosen).

- **Rows** are the text's lines (round six, 2026-10-12): down the left, the row's number
  (a heading's #) the row's full height, behind the diary's red margin line; at the right
  end, buttons as tall as the row: on a line, play this line, play from here, and ×; on a
  heading, ×. On a phone the three stack, a third of the row's height each. A heading holds
  its name, a tempo field and a taal picker, which wrap among themselves; a notes line holds
  one box per beat, grouped by the vibhags of its section's taal (from where the line falls
  in the cycle, start beat included), with a box for the words of each verse below. The
  first beat of each vibhag is coloured by its kind instead of being marked above: sam (X)
  amber, khali (0) lavender, another tali (2, 3 …) green, with a key above the boxes and the
  kind in each box's label for screen readers. A row is faintly lit under the pointer. An unfinished line shows empty boxes to the end of its cycle. After the song,
  once its last line is finished or under a heading after it, an empty row as long as the
  line before it (whole cycles) starts a new line; Enter opens one after any line.
- **Typing:** a space or a bar moves to the next box. Several beats typed or pasted into a
  box write over the boxes after it, then fill the line's empty boxes, then make new lines
  after it (each as long as the line before). Text pasted with line breaks goes in whole,
  after the line. Backspace in an empty box goes back, and in an emptied beat removes it
  (its words too); a beat left empty becomes a hold, or goes if it was the line's last.
- **Two or more notes in one beat:** typed together with no space (`সারা`, `SR`, `sare`),
  as in the text. Arriving in a box by a space or Tab selects it, so typing replaces its
  note; to add one instead, tap at its end, or press → (an arrow first ends the selection,
  then moves on from the edge).
- **Readable input:** a beat the player cannot read is mended when that makes it readable:
  sargam spelt out, alone or among letters (`sa re`, `sare`, `Sre`, any case, with octave
  marks), becomes letters (`S R`, `SR`), and `রে`, `নি` become `রা`, `না`.
- **Moving:** each heading and line is dragged by its number, with a mouse or a finger;
  a brass line shows where it will go, and the boxes scroll near their edges (Escape cancels
  a drag). With the number focused, ↑ and ↓ move the row one place. A notes line moves with
  its lyric lines (and any blank lines between them); a heading moves on its own, so moving
  it changes which section the lines around it belong to. Other lines stay where they are.
  A row that is selected (below) moves with all the rows selected, gathered in the song's
  order where it is dropped (or one place up or down with the arrows), and they stay
  selected, to be moved on (`moveRows`).
- **Selecting:** tap a row anywhere but in a box, field or button, or tap its number: each
  tap selects or unselects it (the number turns brass). A press that began in a box (say,
  selecting text) and lets go elsewhere selects nothing. Clear, Escape on a number, or any
  other change to the song ends the selection.
- **Copying and pasting:** with rows selected, **Copy** in the bar at the top of the boxes
  keeps them, words and all, in the song's order (`copyRows`). The song is not changed, and
  the lines also go on the device's clipboard as text. For six seconds the bar says what is
  copied and how to paste it; tapping the number of a row offers **Paste after line N** (or
  **under the heading**): the copy goes in after the last row selected, after a line's words
  or just under a heading (`pasteRows`). What is copied stays, to paste as often as wanted,
  in this song or another, until something else is copied; nothing needs closing. With a
  number focused, Ctrl+C copies (the rows selected, or that row) and Ctrl+V pastes after it.
  Each move or paste is one undo step. (Round three put copies at the end of the song; round
  four had a Copy on each line and a Done that forgot the copy.)
- **Play this line** plays that line once, at its tempo, with no count-in, lighting each box
  as it sounds; ■ stops it. It is not logged as practice, kept as a take or scored.
  **Play from here** plays from that line to the end of the song, once, as a line number on
  the Practice sheet does (with the count-in, logged, scored); ■ stops it. Neither changes
  the Lines to practise.
- **Words:** typed in the boxes under the notes, a space between beats (`আ মার সো নার` typed
  in the first box fills four), `-` for a beat the vowel is held over. Enter in a word box
  opens another row of words (a second verse) at the same beat.
- **Pasting words** (`src/core/notation/lyrics.ts`): a line of words pasted into a word box is
  split into the syllables it is sung in and laid one to each beat where a note starts, `-` on
  held and silent beats, from that box on through the lines after it (a lone `-` in the paste
  takes a beat of its own). The split reads Bengali spelling: a letter with its vowel sign
  (and ঁ ং ঃ) is a syllable; a single consonant at the end of a word joins the one before
  (আমার → আ মার, বাংলা → বাং লা); ৎ and a consonant with হসন্ত join the one before; inside a
  word a conjunct's first consonant closes the syllable before it (আনন্দ → আ নন্ দ, স্বপ্ন →
  স্বপ্ ন); a final ই উ এ ও after a vowel is one syllable with it (যাও, এই). Punctuation is
  dropped; other scripts are kept whole. A note under the boxes says how many were placed,
  and any left with no note to go to. Typing is unchanged: a word typed stays whole.
- **Bars:** new lines get bars at the vibhags when the song's lines have bars (or there are
  none yet), in the bar character the song uses most; a line keeps its own style. Words
  rewritten under a line get bars where it has them only if they were written with bars.
  Blank words between others are written `-` (a held vowel).
- **Undo** (Ctrl+Z, or the Undo button) takes changes back one step at a time, in the beat
  boxes and free text alike (Rinat, 2026-10-15): the history belongs to the song's text
  (`src/app/undo.ts`), recorded wherever it changes. Typing on in one box, or on one line of
  free text, within 4 s is one step; a note from the pad, Join, Split, an octave, a heading, a
  line moved or pasted is a step of its own. Opening another song empties it. *Why one list:*
  the boxes are a view of the text, and their own list missed changes made outside them.
- **MIDI keyboards** type here too: each key is a beat, written from the song's Sa
  (`noteToken`, canonical as above), two octaves either side.

## Checker (`checkNotation(parsed, taals)`)

1. **Bars on vibhag lines.** Each bar (or each line with no bars) must end on a vibhag
   boundary of the taal (its section's own, counted from its sam, in a song that changes
   taal). Each bar is judged on its own: after a bad bar the position snaps
   to the nearest vibhag, so one extra beat is reported once instead of shifting every later
   bar. Reports the bar, its length and the likely intended length.
2. **Octave slips.** A run of 1–3 notes that leaps 8+ semitones away from both neighbours
   (in the same direction) and comes back, where moving the run one octave lands within 5
   semitones of both neighbours, is reported with a one-click fix. At line edges, single
   notes are checked against the two nearest notes on the inside. Exemptions: a single note
   that leaps away and straight back to the same note (`সা ধা সা`), and exact octave jumps
   onto a neighbour's note (`সা র্সা`).
3. Parse errors and lyric warnings are listed alongside.

The checker is advisory. Its false-negative and false-positive trade-offs are deliberate;
the built-in exercises must stay free of warnings, as a regression test. (One cost of that:
a Sa sung twice between two big leaps, `ধা সা সা ধা`, reads as a slip, so সা থেকে
স্বর-লাফ sings `সা ধা সা ধা | সা ধা সা -` rather than `সা ধা সা - | সা ধা সা -`.)

**Dismissing** (new, 2026-10-14). On one of the user's songs each warning (not a reading
error, which is always real) has Dismiss. A dismissed warning is remembered by a short
fingerprint (`issueKey`): its kind, which bar or which notes, and the notes and bars of its
whole line, not their spacing or script. So it stays dismissed while that line's notes stay
the same, wherever the line moves, and comes back as soon as they change, when it may apply
again. *Why not clear them at export, as first suggested:* exporting is also how a song is
backed up and shared, which says nothing about whether a warning applies; tying it to the
line keeps the judgement exactly as long as it holds. The fingerprints are kept with the
song (`dismissed`, DATA.md), the newest 200. "N dismissed · Show them" lists them, each with
Bring back. With no dismissing asked for (the comparison with the prototype), the panel is
exactly as before.
