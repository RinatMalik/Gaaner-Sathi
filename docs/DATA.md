# Data model, files and storage (as implemented in the prototype)

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
  "updatedAt": 1791544356355
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

The prototype runs every song through `normalize()` when it loads, which clamps all fields. Keep that tolerance for imported files.

## File format (export, backup and import)

```json
{ "format": "gaaner-sathi", "version": 1, "exported": "2026-10-09",
  "songs": [ { "title": "...", "taal": "...", "tempo": 100, "saKey": 0, "saOct": 4, "startOn": 1, "text": "..." } ] }
```

- **Export this song** writes one song in that envelope; **Back up all my songs** writes them all (examples excluded).
- **Import** accepts that envelope, a bare array of songs, a single song object, or a plain `.txt`, which becomes one song titled from the file name. Limits are 2 MB per file, 200 songs per import and 200 000 characters per song. Imports always get new ids, so they never overwrite.
- Files exported before the rename say `"format": "swaralipi-player"`. The importer never checks this field, so both import; keep it that way.
- Keep reading version 1 forever. Bump `version` only for breaking changes and write a migration.

## Settings (per device, not per song)

`swaralipi.prefs.v1` in localStorage:

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
| `tab` | `practice` or `edit` |

Older keys are migrated on load: `extra` → `layers`, and `dropGuide` → `guideLoop: 'first'`.
Roadmap item "per-song sound settings" moves the rhythm, speed, layers, reeds and drone settings onto the song, with these device settings as the fallback.

## Storage in the prototype, and what replaces it

- **On claude.ai (current):** the prototype is a published claude.ai artifact. Songs live in the artifact's own database: collection `songs`, one document per song, synced live through `window.claude.use('db')`. Downloads go through `window.claude.use('downloads')`. **None of this exists outside claude.ai.** Remove it in the port.
- **Opened as a plain file (fallback):** songs go to localStorage under `swaralipi.songs.v1`, as an object keyed by id. This is per browser, survives restarts, and is lost if site data is cleared.
- **Target for the web app:** local-first in `localStorage` (revised 2026-10-10, ADR-001; it was IndexedDB), saving each song on edit with a short debounce. Keep the same JSON shape so export and import stay trivial. IndexedDB only if large data such as recordings ever arrives; account sync is a parked idea (see the roadmap). Rinat's existing songs come across with "Back up all my songs" in the prototype, then Import in the new app.

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
