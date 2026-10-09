# ADR-001: Stack and architecture baseline

- **Status:** Accepted, 2026-10-09
- **Decided by:** the handover kickoff's defaults (§5, set with Rinat); recorded by Claude
- **Revisit:** with a new ADR, only for a concrete reason (a defect, a measured cost, a
  constraint these choices cannot meet)

## Context

The prototype is one self-contained HTML file: about 2,300 lines of plain JavaScript, a
test harness that cuts code out of the file by markers, and claude.ai-only storage. To
publish a maintainable web app that works offline, and later wrap it as iOS and Android
apps, the code needs modules, types, a test runner and a build.

What shapes the choice:
- Low maintenance, few dependencies, static hosting, no server for v1.
- A pure core (notation, taal, exercises) that runs in Node, the browser and a Worker.
- Sound verified by measurement, not by ear: offline renders in headless Chromium.
- No audio glitches on a mid-range Android phone; the parser and checker run on every
  keystroke for a 500-beat song.
- Two coding agents (Claude and Codex) take turns on the code, so mainstream,
  well-documented tools are worth a lot.

## Decision

- **Language:** TypeScript, strict mode.
- **UI:** React, with Vite as dev server and bundler.
- **Tests:** Vitest for unit and core tests (Node environment for the core);
  Playwright for end-to-end tests and offline audio renders in headless Chromium.
- **Runtime:** Node 24 LTS for development and CI. (Vitest 5 needs Node ≥ 22.12 and
  Vite 8 needs ≥ 20.19.)
- **Versions** at the time of writing (npm `latest`, checked 2026-10-09): `vite` 8.3.4,
  `vitest` 5.0.3, `react` 19.3.0, `typescript` 7.0.2. The committed lockfile pins
  exact versions.
- **One npm package**, no monorepo, with these boundaries:
  - `src/core/`: pure, no DOM. `notation` (parser, edit operations, checker), `taal`
    (taals, rhythm tables, layers, fills), `exercises` (the generator and its specs),
    `song` (model, normalise, file format). Enforced by type-checking `src/core` with
    a tsconfig that has no DOM library.
  - `src/audio/`: the engine, a lookahead scheduler on the `AudioContext` clock, plus
    the instruments behind one interface, so synthesised voices can later be swapped
    for samples. Pure DSP (such as the Karplus-Strong tanpura string) is DOM-free and
    tested in Node.
  - `src/storage/`: IndexedDB holding the same song JSON as the export format, saves
    debounced on edit, a migration layer. Library (`idb` or Dexie) chosen in Phase 1.
  - `src/app/`: the React UI. Every user-facing string goes through one translation
    function from day one (UK English first, a Bengali interface later).
- **Dependencies:** as few as possible; each must be compatible with the repo's
  GPL-3.0 licence. Lockfile committed.
- **Formatting and linting:** `tsc --strict` plus `.editorconfig` for now; no ESLint
  or Prettier until style drift between agents is a real problem (then a new ADR).
- **Not decided here:** PWA tooling and the IndexedDB library (Phase 1), hosting
  (pending Rinat; see `CONTEXT.md` → Open questions), Capacitor setup (Phase 4).

## Alternatives considered

- **Stay with plain JavaScript in one file.** No types or modules; every change risks
  the whole file, and the test harness depends on text markers. Rejected.
- **Preact instead of React.** Smaller runtime, but rendering is not the hot path (audio
  scheduling is), and React is what both agents and most documentation assume.
- **Svelte or Solid.** Good performance, smaller ecosystems, fewer worked examples for
  the agents to lean on. Not worth the switch.
- **Jest instead of Vitest.** Needs a separate TypeScript transform and duplicates
  Vite's config. Rejected.
- **A monorepo (packages/core + apps/web).** Clear boundaries, but more config to
  maintain. A DOM-free tsconfig gives the same guarantee for the core in one package.

## Consequences

- Node 24 LTS is needed on every development machine. (This machine has Node 20.5.1,
  which reached end of life in April 2026; it has to be upgraded before the new
  toolchain can run.)
- Core tests run in plain Node with no browser. Audio measurement tests need
  Playwright's Chromium, which downloads outside the repo.
- The reference suites in `reference/tests/` keep running on the prototype in CI, and
  the TypeScript port carries them over one-for-one, so the two can be compared.
