# ADR-002: Where the app keeps songs, and how it reads the prototype's

- **Status:** Accepted 2026-10-10
- **Decided by:** Claude, while porting the interface (PH0-04), to keep the "never lose
  a song" invariant. Rinat can veto it.
- **Revisit:** if the prototype is ever withdrawn from every place it is published on
  this site, or if songs move to IndexedDB or to accounts.

## Context

The prototype is live at `rinatmalik.github.io/Gaaner-Sathi/`, and the new app is
published beside it at `/Gaaner-Sathi/new/` until Rinat is happy with it. Both pages
share one origin, so both see the same `localStorage`. The prototype keeps its songs
under `swaralipi.songs.v1`, and its settings under `swaralipi.prefs.v1`.

The prototype loads its song list once, when the page opens. On every save it writes
the whole list back from memory. With both pages open, say a prototype tab left open
on a phone, any save in the prototype would undo what the new app had written to the
same key since. That could drop whole songs.

## Decision

- The new app **reads** the prototype's keys and **never writes** them. Its own changes
  go under its own keys, in the prototype's JSON shape:
  - `gaanersathi.songs.v1`: `{ [id]: song }`, written for each saved song by re-reading
    the stored object and changing only that song, so saves from another tab survive.
  - `gaanersathi.hidden.v1`: the ids of prototype songs deleted in the new app. They are
    hidden, not destroyed.
  - `gaanersathi.prefs.v1`: settings. The first time, they start from the prototype's
    settings, with its migrations.
- The song list is the prototype's songs, with this app's on top. Where both have a
  song, the newer `updatedAt` wins. Hidden ids are left out.
- The app listens for storage changes from other tabs and takes them in, as the
  claude.ai version's live sync did. A song open and untouched here reloads when
  another tab changes it.

## Alternatives considered

- **Share the prototype's key** (the simplest option, and the plan until now). Its
  saves would overwrite the new app's, as described above. Rejected.
- **Copy the prototype's songs once, then ignore its key.** Songs saved in the
  prototype afterwards, such as an import of the claude.ai backup, would never show up.
  Rejected.
- **Change the prototype to merge before writing.** That edits the reference, which is
  the behavioural contract and the copy Rinat is using. Rejected.

## Consequences

- Neither page can overwrite the other's work, and nothing in the prototype's storage
  changes. An edit made in the new app does not show in the prototype; the new app is
  where songs move to.
- Reading two keys costs one extra small read at start-up. After the new app replaces
  the prototype, the prototype's key stops changing and is still read, so old songs
  stay visible with nothing to migrate.
- Export, backup and import are unchanged: the file format is still version 1.
