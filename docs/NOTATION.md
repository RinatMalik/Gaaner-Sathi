# Notation spec (as implemented in the prototype)

This is the behaviour of `parseNotesLine` / `parseSong` in `reference/gaaner-sathi.html`
(the block between `/*PARSER-START*/` and `/*PARSER-END*/`). The test suites in
`reference/tests/` pin it down. Treat this file and those tests as the contract when porting.

## Song text

A song is plain text, one line per row:

| Line starts with | Meaning |
|---|---|
| `#` | Heading shown in the sheet (`# স্থায়ী`, `# অন্তরা`, a practice tip). Not timed. |
| `>` | Lyrics for the notes line directly above. One group per beat, split on spaces and bar characters. Several `>` lines under one notes line stack as extra rows (verses). A group made only of `০ 0 - – —` is drawn faded as a held vowel. More groups than beats is a warning. |
| anything else | A notes line. Blank lines are ignored. |

## Beats

- **A beat (matra) is a group of characters between spaces or bar characters.** `সা রা গা` is three beats.
- **Notes written together without a space share the beat**, split evenly: `পধা`, `পাধা` and `PD` are all Pa then Dha in one beat. `SRGM` is four quarter-beats.
- The আকার `া` is only the vowel sign of a note. It never ends a beat. (The prototype once treated it as a beat separator, akarmatrik-print style; that was the reported bug and is fixed. Test: `পাধা → [PD]`.)
- Bars `| । ॥ ‖ I` separate beats too. They do not change timing; they are kept for display and for the checker. `II` (double bar) is accepted.
- Inside a beat, each unit gets an equal share: a note, a hold, or a rest.
  - **Hold** `- – — ~ ০` extends the previous note, even across beats and lines (`সা -া -া` is Sa for three beats; `S-R` gives Sa two thirds and Re one third of the beat).
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

Ignored inside beats: আকার `া`, বিসর্গ `ঃ`, ZWJ, ZWNJ. A BOM (U+FEFF) inside a line acts as a space, because JavaScript counts it as whitespace (checked 2026-10-10; the port keeps this).

## Octaves (range −2 … +2)

| | Bengali | Latin |
|---|---|---|
| Upper (তার) | রেফ before the note: `র্সা` (repeat for +2: `র্র্সা`) | `'` after the note: `S'` (also `’`, `^`, `*` or a backtick) |
| Lower (মন্দ্র) | `.` before: `.না`, or হসন্ত after: `ন্` | `.` before: `.N` |

- A mark written after the আকার still applies: `সা'` is upper Sa.
- `র্` followed by a note letter is always a রেফ (upper octave on the next note). A lower Re has to be written `.রা`.
- **Known gotcha:** phonetic keyboards (Avro and similar) join consonants typed in a row into conjuncts, so typing `mpa` can give `ম্পা`. The হসন্ত reads as lower Ma + Pa. Decide with Rinat whether conjuncts should be read as two plain notes instead.

## Errors

An unknown character flags its beat (`“ক” is not a note the player knows`); the beat still plays what it could read. Errors carry the global beat index so the editor can jump to them.

## Placement in the taal

`startOn` (1-based) is the taal beat the song's first beat lands on, for songs that start with a pickup. Every later position comes from counting beats. Nothing in the text sets timing.

## Canonical output when the editor writes notation

- Bengali: upper `র্` prefix, lower `.` prefix, every note followed by `া` when it ends a beat, holds `-া`.
- Latin: upper `'` suffix, lower `.` prefix.
- **Open decision:** Rinat's diaries may mark the lower octave with হসন্ত rather than `.`. Ask which the app should write.

## Edit operations (pure text → text, tested)

- `shiftOctaves(text, selStart, selEnd, ±1)` rewrites only the octave marks of the selected notes. A bare caret picks the note just left of it in its beat. Clamps at ±2. Returns the new text, new selection and an undoable `{lo, hi, rep}` replacement.
- `joinBeats(text, s, e)` merges the selected beats (or the caret's beat and the next one) into one beat, dropping inner আকার: `পা ধা → পধা`. Refuses across a bar or a line.
- `splitBeats(text, s, e)` gives every unit of the selected beat(s) its own beat, written canonically: `পধা → পা ধা`.

## Checker (`checkNotation(parsed, taal, startOff)`)

1. **Bars on vibhag lines.** Each bar (or each line with no bars) must end on a vibhag boundary of the taal. Each bar is judged on its own: after a bad bar the position snaps to the nearest vibhag, so one extra beat is reported once instead of shifting every later bar. Reports the bar, its length and the likely intended length.
2. **Octave slips.** A run of 1–3 notes that leaps 8+ semitones away from both neighbours (in the same direction) and comes back, where moving the run one octave lands within 5 semitones of both neighbours, is reported with a one-click fix. At line edges, single notes are checked against the two nearest notes on the inside. Exemptions: a single note that leaps away and straight back to the same note (`সা ধা সা`), and exact octave jumps onto a neighbour's note (`সা র্সা`).
3. Parse errors and lyric warnings are listed alongside.

The checker is advisory. Its false-negative and false-positive trade-offs are deliberate; keep the exercise library free of warnings as a regression test.

## Sections (added 2026-10-11)

`src/core/notation/sections.ts`, worked out beside the parser (which stays the prototype's).

- A **section** is a run of notes lines under the same heading. When several headings come one
  after another, the last names the section (an exercise's tip, then `# আরোহ`, is "আরোহ").
  Lines before any heading are a section with no name. Practice shows a button for each
  section when there are two or more; a tap plays from its first line, looping it when
  looping is on.
- **A tempo per section:** a heading may give one, as `tempo 110`, `লয় ১১০` (Bengali or Latin
  digits; য় in either spelling) or `♩=110`, anywhere in it: `# অন্তরা · tempo 110`,
  `# সঞ্চারী (লয় ৮০)`. A tempo in a heading just above the one that names the section counts
  too. Clamped to 30–240. Sections without one play at the song's tempo. The sheet shows the
  heading as written; the section buttons show the name and "♩110".
- The deck shows and changes the tempo of the section playing (or about to play): for a
  section with its own tempo, the change is written back into its heading, keeping its words
  and its digits; otherwise it is the song's tempo.

## Beat boxes (added 2026-10-11)

The editor's default view (`src/app/boxes.ts`; text changes in `src/core/notation/boxes.ts`).
The text stays the only record: every box edit is a text edit, so Free text shows exactly
what the boxes wrote, and headings, lyrics and anything else written there are kept.

- **Rows** are the text's lines: each heading (its name and a tempo field), and each notes
  line as one box per beat grouped by the taal's vibhags (from where the line falls in the
  cycle, start beat included), taal marks above, a box for the words of each verse below.
  An unfinished line shows empty boxes to the end of its cycle. After the song, once its last
  line is finished or under a heading after it, an empty row as long as the line before it
  (whole cycles) starts a new line; Enter opens one after any line.
- **Typing:** a space or a bar moves to the next box; several beats typed or pasted into a box
  write over the boxes after it, then fill the line's empty boxes, then make new lines after
  it (each as long as the line before). Text pasted with line breaks goes in whole, after the
  line. Backspace in an empty box goes back, and in an emptied beat removes it (its words
  too); a beat left empty becomes a hold, or goes if it was the line's last. Undo (Ctrl+Z)
  takes changes back one box at a time.
- **Readable input:** a beat the player cannot read is mended when that makes it readable:
  sargam spelt out (`sa re ga ma pa dha ni`, any case, with octave marks) becomes letters
  (`S R G M P D N`), and `রে`, `নি` become `রা`, `না`.
- **Bars:** new lines get bars at the vibhags when the song's lines have bars (or there are
  none yet), in the bar character the song uses most; a line keeps its own style. Words
  rewritten under a line get bars where it has them only if they were written with bars.
  Blank words between others are written `-` (a held vowel).
- **MIDI keyboards** type here too: each key is a beat, written from the song's Sa
  (`noteToken` in `edit.ts`, canonical as above), two octaves either side.
