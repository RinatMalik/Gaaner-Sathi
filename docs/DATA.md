# Data: songs, files, settings and storage

Everything the app keeps, where it keeps it, and what moves between devices. There is no
server: the website is only the app's files, and everything a singer makes stays in their
own browser until they export it.

## Where things live, and what travels

The browser keeps each website's data under the site's address
(`rinatmalik.github.io`), separately for each browser on each device: Chrome and Edge on the
same computer do not share, and a private window forgets everything when it closes.
Clearing a browser's site data ("cookies and site data") deletes it all.

| What | Kept in | Moves to another device or person |
|---|---|---|
| Your songs: notation, title, taal, tempo, Sa, start beat, section tempos and taals, tags, star, notes, the song's own sound, whether it is listed under Exercises | `localStorage` | Yes: **Export this song** (one) or **Back up all my songs** (all), then **Import** there |
| The built-in exercises and the starter rewaz | The app itself | Everyone has them |
| Your settings: your usual sound, your Sa, the practice settings, script, theme, the editor view, the MIDI choice | `localStorage` | No |
| Practice log (Progress) | `localStorage` | Downloadable as a file from Progress, but not importable |
| Rewaz routines | `localStorage` | No |
| Takes (recordings) | IndexedDB | Each downloads as a WAV file; not importable |
| The microphone | Not kept: analysed as it arrives | Never leaves the device |

So a friend opening the link sees the app as it is for everyone: the exercises, the starter
rewaz, the default sound, and none of anyone else's songs. A song file sent to them imports
as it was set up (its sound and notes included), without the sender's log, takes or settings.

## Song

```json
{
  "id": "song-mv0nc4fn-pdioa",
  "title": "Any text",
  "taal": "dadra",
  "tempo": 100,
  "saKey": 0,
  "saOct": 4,
  "startOn": 1,
  "text": "# স্থায়ী\nসা -া রা | গা -া মা\n> সা ০ রে | গা ০ মা\n",
  "updatedAt": 1791544356355,
  "tags": ["Rabindrasangeet", "Learning"],
  "fav": true,
  "notes": "From Gitabitan. Teacher: slower in the antara.",
  "sound": { "reeds": 3, "droneType": "tanpura", "droneVol": 0.5, "tanTune": "M",
             "beat": "dholak", "tablaVol": 0.7, "speed": "normal", "fills": true,
             "layers": { "tabla": [], "dholak": ["manjira"], "kit": [] } }
}
```

| Field | Meaning |
|---|---|
| `taal` | One of 19 taal ids (ENGINE.md → Taals): `dadra`, `keherwa`, `rupak`, `jhaptal`, `ektal`, `teentaal`, `jhampak`, `shashthi`, `rupakra`, `nabatal`, `ekadashi`, `nabapanchatal`, `khemta`, `deepchandi`, `dhamar`, `jhumra`, `teora`, `kawali`, `garba`. Anything else reads as `dadra` (the prototype also reads the last thirteen as `dadra`). Sections may have their own, in their headings (NOTATION.md → A taal per section); the prototype plays them in this one. |
| `tempo` | Matras per minute, 30–240. Sections may have their own, in their headings (NOTATION.md → Sections). |
| `saKey` | Semitones above C, 0–11. The app shows the CT-X3000 key too ("C · White 1", "C♯ · Black 1", …). |
| `saOct` | 3, 4 or 5 (Low, Middle, High); Sa = MIDI 12 × (saOct + 1) + saKey. |
| `startOn` | The taal beat (1-based) the first beat lands on. |
| `text` | The notation (NOTATION.md). |
| `updatedAt` | ms epoch; the newer copy wins when two places have the same song. |
| `tags` | Library tags, free text: trimmed, single-spaced, no commas, at most 40 characters each and 20 per song, no two the same apart from case. Absent when there are none. |
| `fav` | `true` for a favourite; absent otherwise. |
| `exercise` | `true` for one of your songs listed under Exercises (your own exercise: "List under" in Edit notation, "+ New exercise", or a copy of a built-in one); absent: under My songs. Never on a built-in exercise, which is `example` in the app and never stored. |
| `notes` | Notes about the song (its meaning, source, a teacher's comments): free text, at most 20 000 characters, shown above the sheet, printed and searched. Absent when empty. |
| `dismissed` | The checker's warnings dismissed on this song, as short fingerprints (base-36, NOTATION.md → Checker → Dismissing), the newest 200; absent when none. Never on a built-in exercise. |
| `sound` | The song's own harmonium, drone and rhythm (set in Edit notation → Sound of this song), with the same names and values as the device settings below. Absent while the song uses the usual sound. The app writes the whole set; reading checks each field and leaves out any it cannot read, so the device's setting shows through for that one. A `guide` written before 2026-10-13 is left out: the guide's level is a practice setting now. |

`normalize()` runs on every song read or imported and clamps every field, as the prototype's
does. `tags`, `fav`, `exercise`, `notes`, `dismissed` and `sound` are left out when unset, so a prototype song reads
exactly as before.

## Song files (export, backup, import)

```json
{ "format": "gaaner-sathi", "version": 1, "exported": "2026-10-09",
  "songs": [ { "title": "...", "taal": "...", "tempo": 100, "saKey": 0, "saOct": 4, "startOn": 1, "text": "...",
               "tags": ["..."], "fav": true, "exercise": true, "notes": "...", "sound": { } } ] }
```

- **Export this song** (the editor) writes one song; **Back up all my songs** (Music
  library) writes them all, built-in exercises excluded. `tags`, `fav`, `exercise`, `notes`,
  `dismissed` and `sound` appear only when set; an exercise exported, built-in or your own, carries
  `exercise`, so it imports as an exercise of your own. They are optional, so files stay version 1: the prototype and older readers
  skip them.
- **Import** (Music library) accepts that envelope, a bare array of songs, a single song object, or
  a plain `.txt`, which becomes one song titled from the file name. Limits: 2 MB per file,
  200 songs per import, 200 000 characters per song. Imports always get new ids, so they
  never overwrite; importing the same backup twice gives two copies.
- Files exported before the rename say `"format": "swaralipi-player"`. The importer never
  checks this field, so both import; keep it that way.
- Keep reading version 1 forever. Bump `version` only for breaking changes, with a migration.

## Settings

`gaanersathi.prefs.v1` in `localStorage`, per device. The first time, they start from the
prototype's (`swaralipi.prefs.v1`). Older keys are migrated on load: `extra` → `layers`, and
`dropGuide` → `guideLoop: 'first'`.

| Key | Values |
|---|---|
| `script` | `bn` or `lat` |
| `guide` | `full`, `soft` or `off` |
| `beat` | `tabla`, `dholak`, `kit`, `click` or `off` |
| `tablaVol` | 0–1 |
| `speed` | `half`, `normal` or `double` |
| `fills` | boolean |
| `layers` | `{ tabla: [...], dholak: [...], kit: [...] }` |
| `reeds` | 1, 2 or 3 |
| `droneType` | `tanpura` or `harmonium` |
| `droneVol` | 0–1 |
| `tanTune` | `P`, `M` or `N` |
| `countIn` | boolean |
| `guideLoop` | `all`, `first` or `alt` |
| `ramp`, `rampStep`, `rampMax` | The tempo trainer: on or off, the step and the top |
| `lastSong` | The song open last |
| `tab` | The view open last: `practice`, `songs` (the Music library), `edit`, `rewaz`, `voice` or `progress` |
| `soundOpen` | Whether the Practice settings, at the top of the Practice view, are unfolded; unset: folded |
| `songSoundOpen` | `true` while the song's sound in Edit notation is unfolded; absent: folded |
| `libSort` | How the Music library sorts: `practised`, `changed` or `title` |
| `libFold` | The Music library's sections folded away, `{ mine?: true, ex?: true }`; absent: both open. A search shows every section |
| `libOrder` | The Music library's sections in the order dragged, `["mine", "ex"]`; absent: the exercises first. The song pickers follow it |
| `pitchOctave` | `true` when pitch feedback counts the octave too |
| `pitchLag` | The delay from a beat to the voice, found last time, seconds (0–0.6) |
| `rewazOpen` | The ids of the rewaz routines unfolded on the Rewaz view; absent: all folded. (`rewazId`, the routine last chosen, is no longer read) |
| `theme` | `light` (Day) or `dark` (Night); absent: Auto, as the device says. Read by a line in the page's head before the app runs, so a reload never flashes the other colours |
| `editMode` | `text` when the editor shows free text; absent: beat boxes |
| `mySa` | Your Sa, `{ saKey, saOct }`: from the range finder's "Use as my Sa", or a Sa changed on an exercise. Exercises open in it and new songs start in it |
| `voiceRange` | The lowest and highest notes the range finder heard, `{ lo, hi }`, MIDI numbers with fractions |
| `holdNote`, `holdBest` | The hold trainer's note (cents from Sa: −500, −300, −100, 0, 200, 400, 500, 700, 900, 1100 or 1200) and the longest hold on each, `{ "700": 12.4 }` seconds |
| `showKeys` | `true` to show the keys to press on the Practice view |
| `midi` | A MIDI keyboard: `{ route: 'app' \| 'kb' \| 'both', sound: 'keep' \| 'organ' \| 'accordion', out?: id }`: where the guide plays, in what sound, on which keyboard |

**Each song's own sound.** The harmonium, drone and rhythm settings (`reeds`, `droneType`,
`droneVol`, `tanTune`, `beat`, `tablaVol`, `speed`, `fills`, `layers`) kept here are *your
usual sound*. Exercises use it, and so does every song without a `sound` of its own (new
songs, and songs from before this existed). They are set in Edit notation (Sound of this
song, or Your usual sound on an exercise). Changing one of them while one of your songs is
open saves the whole set with that song, and the usual sound is left alone; while an
exercise is open, it changes the usual sound. "Use my usual sound" removes a song's own. The
practice settings under the deck (`guide`, `countIn`, `guideLoop`, `ramp`, `rampStep`,
`rampMax`) are always the device's: the guide's level is how much help the singer wants that
day, not part of how a song is arranged (2026-10-13). A rewaz item's tempo and guide lie over
all of these while it plays.

## Storage

| Key | Holds |
|---|---|
| `gaanersathi.songs.v1` | This app's songs, `{ [id]: song }`; each save changes only its own song |
| `gaanersathi.hidden.v1` | Ids of prototype songs deleted in this app (hidden, not destroyed) |
| `gaanersathi.prefs.v1` | Settings (above) |
| `gaanersathi.log.v1` | The practice log, `[entry, …]`, oldest first; each entry is appended to what is stored, so another tab's entries survive |
| `gaanersathi.routines.v1` | Rewaz routines, `{ [id]: routine }`; each save changes only its own routine |
| `swaralipi.songs.v1`, `swaralipi.prefs.v1` | The prototype's songs and settings: read, never written |
| IndexedDB `gaanersathi` | Takes: store `takes` (their details, indexed by `song`) and store `audio` (`{ id, pcm }`, the samples), so listing never loads sound |

- Songs are saved on edit with a 900 ms pause, flushed when the page is hidden or another song
  opens. Changes saved in another tab are taken in as they happen; a song open and untouched
  here reloads when another tab changes it.
- The song list is the prototype's songs with this app's on top (the newer `updatedAt`
  wins), less the hidden ones.
- *Why the prototype's keys are only read:* the prototype loads its song list once and writes
  the whole list back on every save, so a prototype tab left open would undo the app's
  changes if they shared a key. Copying its songs once would miss songs saved there later;
  changing the prototype would change the reference. So neither page can overwrite the
  other's work, and nothing in the prototype's storage changes.
- *Why localStorage for songs:* songs are small text, and the prototype already used it.
  Takes are the exception: sound is large, so they went to IndexedDB (2026-10-11), the app's
  only use of it.
- A full browser refuses writes; the status line says so ("Not saved: song storage is
  full…"). IndexedDB can be evicted under storage pressure; Download is the safe copy of a
  take. In a private window, or with site data off, recording is refused with a message.
- Rinat's songs in the claude.ai version of the prototype come across with "Back up all my
  songs" there, then Import here (`reference/README.md`).

## Practice log

One entry each time a song or exercise has been practised for at least 10 seconds after the
count-in (a quick listen is not logged). Written when playing stops: Stop, the end of the
song, another song opened, the notation edited, or the page closed. Playing a take back is
not logged.

```json
{ "at": 1791655308398, "secs": 312, "song": "song-mv2pb608-a4kmn", "title": "Purano sei diner kotha",
  "from": 0, "to": 3, "loop": true, "rounds": 4, "tempo": 100, "top": 116,
  "score": 82, "lines": [[0, 88], [1, 76]], "routine": "Daily rewaz" }
```

| Field | Meaning |
|---|---|
| `at` | When the first beat sounded, ms epoch |
| `secs` | Seconds practised, from the first beat to the stop, without any pause (2026-10-12) |
| `song`, `title` | The song or exercise id, and its title at the time (songs get renamed or deleted) |
| `from`, `to`, `loop` | Lines practised (0-based, inclusive; without a loop, `to` is the last line reached) |
| `rounds` | Rounds begun; 1 without a loop |
| `tempo`, `top` | Tempo at the start, and the highest reached (the tempo trainer) |
| `score`, `lines` | Pitch score 0–100 for the session and per line, when pitch feedback was on (optional) |
| `routine` | The rewaz routine it was part of (optional) |

Entries are checked when read (damaged ones skipped, numbers clamped). About 150 bytes each,
so years fit. Progress downloads the log as
`{ "format": "gaaner-sathi-log", "version": 1, "exported": "YYYY-MM-DD", "entries": [...] }`.

## Rewaz routines

```json
{ "routine-mv2pq1x0-k3a9c": { "name": "Morning", "updatedAt": 1791655308398, "items": [
  { "song": "ex-long-notes", "rounds": 1 },
  { "song": "song-mv2pb608-a4kmn", "from": 0, "to": 1, "rounds": 4, "tempo": 80, "guide": "alt" } ] } }
```

| Item field | Meaning |
|---|---|
| `song` | A song or exercise id. A song deleted later is skipped when the routine runs |
| `from`, `to` | Lines to practise, 0-based and inclusive; absent: the whole song |
| `rounds` | Times through, 1–20 |
| `tempo` | Matras per minute, 30–240; absent: the song's own. It never changes the song |
| `guide` | `all` (every round), `first` (first round only), `alt` (every other round: call and response) or `off`; absent: as the Practice settings say |

A routine has at most 40 items. Until one is saved, a starter "Daily warm-up" (exercises 1, 2,
3 and 12) is on offer; it stays on offer like the exercises, and changing it saves it as the
user's own (id `routine-starter`). Routines are checked when read, like songs. A routine runs
hands-free: a 4 s pause shows what is next, and any play, stop or song change by the user
ends it.

## Takes

A recording of the singer during one play, while "Record me" is on (ENGINE.md → Takes). Kept
in IndexedDB, never in song files; Download writes one as a mono 16-bit WAV file.

```json
{ "id": "take-mv33v2f4-56twq", "song": "song-…", "title": "…", "at": 1791679736267, "secs": 12.9,
  "rate": 24000, "from": 0, "to": 2, "loop": false, "rounds": 1, "tempo": 110, "countIn": true,
  "ramp": false, "rampStep": 4, "rampMax": 160, "lag": 0.18, "sig": "1x3k9q:5c" }
```

| Field | Meaning |
|---|---|
| `at`, `secs`, `rate` | When its first beat sounded; its length; its sample rate (half the device's) |
| `from`, `to`, `loop`, `rounds` | Lines played, whether they looped, rounds begun |
| `tempo`, `flat` | The song's tempo then; a rewaz item's tempo, which every beat took, if one played |
| `countIn`, `ramp`, `rampStep`, `rampMax` | The count-in and tempo trainer as they were, so playback is the same run |
| `lag` | Seconds from a beat to the voice reaching the app; playback skips that much of the take |
| `sig` | A fingerprint of the notation then, to say when it has changed since |

The samples are 16-bit, at `rate`, starting at the run's first scheduled beat (count-in
included). Takes are checked when read; damaged ones are skipped. Takes shorter than 3 s are
not kept.

## Built-in exercises

`reference/exercises.json`: 12 original exercises on standard alankar patterns, generated and
validated by `reference/tests/exercises.gen.js` (edit the generator, not the JSON), plus a
13th, the Sa Re Ga typing example, in the app only. They are read-only: a change made to one
lasts until another song opens; copy one to keep changes.

| # | Exercise | Taal |
|---|---|---|
| 1 | Long notes | Dadra |
| 2 | Aroha-avaroha | Keherwa |
| 3 | Three-note groups | Dadra |
| 4 | Four-note groups | Keherwa |
| 5 | Skip a note | Keherwa |
| 6 | Single, double and quadruple speed | Keherwa |
| 7 | Leaps from Sa | Keherwa |
| 8 | Lower to upper octave | Keherwa |
| 9 | Alankar | Rupak |
| 10 | Bhairav thaat (komal ঋ and ধ) | Keherwa |
| 11 | Kalyan thaat (tivra মা) | Keherwa |
| 12 | Akar on one "আ" | Dadra |

Each has a Bengali practice tip as its first heading and sargam syllables as lyrics. The
checker must report nothing on any of them. They open in your Sa (`mySa`) when one is set.
