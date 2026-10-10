# Data model, files and storage

As implemented in the prototype, plus what the web app has added since (marked *Added*).

## Song

```json
{
  "id": "song-mv0nc4fn-pdioa",
  "title": "Any text",
  "taal": "dadra | keherwa | rupak | jhaptal | ektal | teentaal",
  "tempo": 100,
  "saKey": 0,
  "saOct": 4,
  "startOn": 1,
  "text": "# স্থায়ী\nসা -া রা | গা -া মা\n> সা ০ রে | গা ০ মা\n",
  "updatedAt": 1791544356355,
  "tags": ["Rabindrasangeet", "Learning"],
  "fav": true
}
```

| Field | Meaning |
|---|---|
| `tempo` | Matras per minute, 30–240. |
| `saKey` | Semitones above C, 0–11. The UI shows the CT-X3000 key too ("C · White 1", "C♯ · Black 1", …). |
| `saOct` | 3, 4 or 5 (Low, Middle, High); Sa = MIDI 12 × (saOct + 1) + saKey. |
| `startOn` | Taal beat (1-based) the first beat lands on. |
| `text` | Notation, see NOTATION.md. |
| `updatedAt` | ms epoch, used to resolve edits arriving from another device. |
| `tags` | *Added 2026-10-10.* Library tags, free text: trimmed, single-spaced, no commas, at most 40 characters each and 20 per song, no two the same apart from case. Absent when there are none. |
| `fav` | *Added 2026-10-10.* `true` for a favourite; absent otherwise. |

The prototype runs every song through `normalize()` when it loads, which clamps all fields. Keep that tolerance for imported files. The app's `normalize()` also cleans `tags` and `fav`, and leaves them out when unset, so a prototype song reads exactly as before.

## File format (export, backup and import)

```json
{ "format": "gaaner-sathi", "version": 1, "exported": "2026-10-09",
  "songs": [ { "title": "...", "taal": "...", "tempo": 100, "saKey": 0, "saOct": 4, "startOn": 1, "text": "..." } ] }
```

- Each song may also carry `tags` and `fav` (*added 2026-10-10*, only when set). They are optional, so files stay version 1: the prototype and older readers skip them, and the app reads them back on import.
- **Export this song** writes one song in that envelope; **Back up all my songs** writes them all (examples excluded).
- **Import** accepts that envelope, a bare array of songs, a single song object, or a plain `.txt`, which becomes one song titled from the file name. Limits are 2 MB per file, 200 songs per import and 200 000 characters per song. Imports always get new ids, so they never overwrite.
- Files exported before the rename say `"format": "swaralipi-player"`. The importer never checks this field, so both import; keep it that way.
- Keep reading version 1 forever. Bump `version` only for breaking changes and write a migration.

## Settings (per device, not per song)

`swaralipi.prefs.v1` in localStorage (the web app keeps them under `gaanersathi.prefs.v1`; see Storage below):

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
| `ramp` | boolean |
| `rampStep` | number |
| `rampMax` | number |
| `lastSong` | song id |
| `tab` | `practice` or `edit`; *added:* `songs`, `rewaz`, `progress` |
| `libSort` | *Added.* How the Songs view sorts: `practised`, `changed` or `title` |
| `pitchOctave` | *Added.* `true` when pitch feedback should count the octave too; absent otherwise |
| `pitchLag` | *Added.* Pitch feedback: the delay from a beat to the voice found last time, seconds (0–0.6) |
| `rewazId` | *Added.* The rewaz routine last chosen |

Older keys are migrated on load: `extra` → `layers`, and `dropGuide` → `guideLoop: 'first'`.
Roadmap item "per-song sound settings" moves the rhythm, speed, layers, reeds and drone settings onto the song, with these device settings as the fallback.

## Storage in the prototype, and what replaces it

- **On claude.ai (current):** the prototype is a published claude.ai artifact. Songs live in the artifact's own database: collection `songs`, one document per song, synced live through `window.claude.use('db')`. Downloads go through `window.claude.use('downloads')`. **None of this exists outside claude.ai.** Remove it in the port.
- **Opened as a plain file (fallback):** songs go to localStorage under `swaralipi.songs.v1`, as an object keyed by id. This is per browser, survives restarts, and is lost if site data is cleared.
- **The web app (built 2026-10-10):** local-first in `localStorage` (ADR-001; it was IndexedDB), saving each song on edit with a 900 ms debounce, in the same JSON shape, so export and import stay trivial. It reads the prototype's keys and never writes them (ADR-002):

  | Key | Holds |
  |---|---|
  | `swaralipi.songs.v1`, `swaralipi.prefs.v1` | The prototype's songs and settings; read only |
  | `gaanersathi.songs.v1` | This app's songs, `{ [id]: song }`; each save changes only its own song |
  | `gaanersathi.hidden.v1` | Ids of prototype songs deleted in this app (hidden, not destroyed) |
  | `gaanersathi.prefs.v1` | Settings, starting from the prototype's the first time, plus `soundOpen` (whether the Sound settings are unfolded; unset until first folded or unfolded) and `libSort` |
  | `gaanersathi.log.v1` | The practice log (below): `[entry, …]`, oldest first; each entry is appended to what is stored, so another tab's entries survive |
  | `gaanersathi.routines.v1` | Rewaz routines (below): `{ [id]: routine }`; each save changes only its own routine |

  The song list is the prototype's songs with this app's on top (the newer `updatedAt` wins), less the hidden ones. Changes saved in another tab are taken in as they happen. IndexedDB only if large data such as recordings ever arrives; account sync is a parked idea (see the roadmap). Rinat's songs in the claude.ai version come across with "Back up all my songs" there, then Import in the app.

## Practice log (added 2026-10-10)

One entry each time a song or exercise has been practised for at least 10 seconds after the
count-in (a quick listen is not logged). Written when playing stops: Stop, the end of the
song, another song opened, the notation edited, or the page closed.

```json
{ "at": 1791655308398, "secs": 312, "song": "song-mv2pb608-a4kmn", "title": "Purano sei diner kotha",
  "from": 0, "to": 3, "loop": true, "rounds": 4, "tempo": 100, "top": 116,
  "score": 82, "lines": [[0, 88], [1, 76]], "routine": "Daily rewaz" }
```

| Field | Meaning |
|---|---|
| `at` | When the first beat sounded, ms epoch. |
| `secs` | Seconds practised, from the first beat to the stop. |
| `song`, `title` | The song or exercise id, and its title at the time (songs get renamed or deleted). |
| `from`, `to`, `loop` | Lines practised (0-based, inclusive; without a loop, `to` is the last line reached). |
| `rounds` | Rounds begun; 1 without a loop. |
| `tempo`, `top` | Tempo at the start, and the highest reached (the tempo trainer). |
| `score`, `lines` | Pitch score 0–100 for the session and per line, when pitch feedback was on (optional). |
| `routine` | The rewaz routine it was part of (optional). |

Entries are checked when read (damaged ones are skipped, numbers clamped). The log exports
as `{ "format": "gaaner-sathi-log", "version": 1, "exported": "YYYY-MM-DD", "entries": [...] }`.

## Rewaz routines (added 2026-10-10)

```json
{ "routine-mv2pq1x0-k3a9c": { "name": "Morning", "updatedAt": 1791655308398, "items": [
  { "song": "ex-long-notes", "rounds": 1 },
  { "song": "song-mv2pb608-a4kmn", "from": 0, "to": 1, "rounds": 4, "tempo": 80, "guide": "alt" } ] } }
```

| Item field | Meaning |
|---|---|
| `song` | A song or exercise id. A song deleted later is skipped when the routine runs. |
| `from`, `to` | Lines to practise, 0-based and inclusive; absent: the whole song. |
| `rounds` | Times through, 1–20. |
| `tempo` | Matras per minute, 30–240; absent: the song's own. It never changes the song. |
| `guide` | `all` (every round), `first` (first round only), `alt` (every other round: call and response) or `off`; absent: as the Sound settings say. |

A routine has at most 40 items. Until one is saved, a starter "Daily warm-up" (exercises 1, 2,
3 and 12) is on offer; it stays on offer like the exercises, and changing it saves it as the
user's own (id `routine-starter`). Routines are checked when read, like songs.

## Built-in exercises

`reference/exercises.json`: 12 original exercises built on standard alankar patterns, generated and validated by `reference/tests/exercises.gen.js`. Edit that generator rather than the JSON.

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

Each exercise has a Bengali practice tip as its first heading and sargam syllables as lyrics. The checker must report nothing on every exercise.
