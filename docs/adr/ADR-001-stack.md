# ADR-001: Stack and architecture baseline

- **Status:** Accepted 2026-10-09; revised 2026-10-10, before any app code existed,
  to make it lighter; two details settled later that day (marked *Settled*)
- **Decided by:** the handover kickoff's defaults, revised by Claude after Rinat asked
  for "a very light, user-friendly web app with basic features" that people can use
  straightaway. Rinat can veto any part.
- **Revisit:** with a new ADR, only for a concrete reason (a defect, a measured cost,
  a need these choices cannot meet)

## Context

The prototype is one self-contained HTML file: about 2,300 lines of plain JavaScript, a
test harness that cuts code out of the file by markers, and claude.ai-only storage. To
publish a web app that works offline, the code needs modules, types, tests and a build.

What shapes the choice:
- **Light** (Rinat, 2026-10-10): basic features, usable with no tutorial or learning
  curve, and it must not grow into a massive thing. Few moving parts to maintain.
- Static hosting, no server, no accounts.
- A pure core (notation, taal, exercises) that runs in Node, the browser and a Worker.
- Sound verified by measurement, because nobody on the build side can hear it.
- No audio glitches on a mid-range Android phone; the parser and checker run on every
  keystroke for a 500-beat song.
- Two coding agents (Claude and Codex) take turns, so mainstream tools help.

## Decision

- **TypeScript (strict), Vite and Vitest.** All three are build-time tools: users get a
  small set of static files and nothing else. TypeScript catches mistakes in the
  notation logic (the most intricate part) at no runtime cost. Vite gives a dev server
  with live reload and a minified build whose file names change with their content,
  which lets the offline cache update cleanly. Vitest runs the core tests in Node.
- **No UI framework.** The interface is plain TypeScript modules that draw the page,
  ported from the prototype's own render functions (about 800 lines). Zero runtime
  dependencies, the smallest and fastest app, and the least rework.
- **Runtime:** Node 24 LTS for development and CI (Vitest 5 needs ≥ 22.12, Vite 8
  needs ≥ 20.19).
- **Versions** at the time of writing (npm `latest`, 2026-10-09): `vite` 8.3.4,
  `vitest` 5.0.3, `typescript` 7.0.2. The committed lockfile pins exact versions.
- **One package:**
  - `src/core/`: pure, no DOM. `notation` (parser, edit operations, checker), `taal`
    (taals, rhythm tables, layers, fills), `exercises` (generator and specs), `song`
    (model, normalise, file format). Type-checked with a tsconfig that has no DOM
    library, so a DOM call there fails the build.
  - `src/audio/`: the lookahead scheduler on the `AudioContext` clock and the
    synthesised instruments, as in the prototype. Pure DSP (the tanpura string) is
    DOM-free and tested in Node.
  - `src/app/`: the interface. *Settled in the interface port:* the text stays where the
    prototype had it (the page markup in `index.html` and the render functions), so the
    port can be compared with the prototype line by line; gathering it into one strings
    module waits until a Bengali interface is actually planned (a parked idea). The
    original plan was: all user-facing text lives in one strings module, so a
    Bengali interface stays possible without a library.
- **Storage:** `localStorage`, as the prototype already does outside claude.ai. Songs
  are small text. IndexedDB only if large data (such as recordings) ever arrives. Which
  keys, and how the prototype's saved songs are read: ADR-002.
- **Offline and install:** a small hand-written service worker and a web manifest
  (Phase 1).
- **Sound checks:** timing logic as pure tests; instruments measured in offline
  renders (`OfflineAudioContext`) against the numbers in `docs/ENGINE.md`. *Settled in
  the audio-engine step:* Vitest compares the port's Web Audio calls with the
  prototype's, call for call, through a recording stand-in; the renders run in the
  browser on the dev server (`/dev/render.html`). No Node Web Audio library and no
  browser-automation framework.
- **Dependencies:** dev-only, as few as possible, with permissive licences (MIT, BSD,
  Apache-2.0, ISC) so the app's own licence can still be chosen freely.
- **Not now** (each needs a concrete reason and an ADR): React or another UI
  framework, Playwright, an IndexedDB or i18n library, an error-reporting service,
  ESLint or Prettier.

## Alternatives considered

- **React** (the kickoff's default). Good for large, state-heavy interfaces. Here it
  adds a runtime and a rewrite of every screen into components, with no gain a user
  would notice. Rejected for now.
- **Preact.** Much smaller than React, but the same rewrite. Rejected for now.
- **No build step** (plain JavaScript modules). The lightest tooling, but no types and
  no content-named build files for clean offline updates. Rejected.
- **Stay a single HTML file.** Proven, but every change risks the whole file, and the
  tests depend on text markers. Rejected.
- **Jest** instead of Vitest: needs its own TypeScript setup. **A monorepo**: more
  config; a DOM-free tsconfig protects the core just as well. Both rejected.

## Consequences

- Node 24 LTS on every development machine.
- Three development dependencies to start (`typescript`, `vite`, `vitest`) and no
  runtime dependencies.
- The interface port stays close to a translation of the prototype's render code, so
  behaviour carries over with little risk.
- If the interface ever grows a lot, a framework can come in behind a new ADR; the
  pure core would not change.
