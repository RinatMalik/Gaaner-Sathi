# Gaaner Sathi (গানের সাথী) — CONTEXT

> The single shared brain for this project. Everything Claude, Codex, any LLM and 
> the user need to stay in sync lives here: product direction, working rules, live
> state, decisions, and the work log.
>
> **Last updated:** 2026-10-11 (02:20 BST) by Claude (Opus 5.5)

## How to use this file

**Every agent, every prompt:**

1. **Start by reading this file** — at minimum: Product direction, Universal
   working defaults, Invariants, Active work, and the newest Work log entries —
   before touching code or docs.
2. **End each response by writing to this file** — update your Active work row, 
   append a Work log entry (use the template at the bottom — exact commands and 
   results, not "tests pass"), and record any new user decisions in the Decisions log.
   *This project:* skip the Work log entry (and the commit) when a prompt changes no
   code or project structure; new user decisions are still recorded.
3. **End by committing your own work** (if the project uses version control — it
   should). Commit every code-changing session, and always before handing over to
   another model — but don't fabricate empty or noisy commits on analysis-only
   prompts. Stage only the files you changed (never `git add -A` while another
   agent has work in flight). Prefer green commits; if a session ends mid-work,
   commit with a `wip:` prefix and say what is unfinished here.
   *This project:* then push `main` to `origin` (see Collaboration protocol).

CLAUDE.md and AGENTS.md are thin pointers to this file. When anything there
conflicts with this file, **this file wins** — except a later explicit user
decision, which always wins (see Source-of-truth order).

## Current state

- **Current milestone:** Phase 1, features and functionality (Roadmap at a glance
  below). Phase 0 (the port) closed on 2026-10-10.
- **Current task:** Phase 1's features are built and live, in Review: PH1-01 song library,
  PH1-02 pitch feedback, PH1-03 rewaz and practice log, PH1-04 each song's own sound,
  PH1-05 more taals, and PH1-06, Rinat's ten picks of 2026-10-11 (beat boxes, the Voice
  tab, takes, MIDI keyboards, sections with their own tempo, notes, print, day and night).
- **Next single action:** Rinat tries the ten picks on real songs (above all: writes a song
  in the beat boxes, connects the CT-X3000, records a take and plays it back, finds a Sa),
  then says what to change; after that, the design phase (Phase 2).
- **Last known-good commit:** `4799fa6` (CI run `38100429528`: core, reference and deploy
  jobs green; checked live); this session's commits are in the newest Work log entry.
- **How to run it now:** https://rinatmalik.github.io/Gaaner-Sathi/ (`/new/` forwards
  there). Locally: `npm install`, then `npm run dev` (the app at `/`, the audio check at
  `/dev/render.html`) and `npm test` (see Conventions → Stack).
- **Blockers:** none.
- **Uncommitted work:** two blank lines Rinat added at the end of `docs/ROADMAP.md` (what
  is left of a draft prompt). Not Claude's: left untouched and uncommitted.

## Product direction — what this is meant to be now

Gaaner Sathi (গানের সাথী, "singing companion") is a **very light, user-friendly web
app** for singers who learn Bengali songs from swaralipi (akarmatrik notation). You
type a song's notation once; it plays the melody on harmonium as a pitch guide, with
tabla, dholak or drums and a tanpura or harmonium drone, all on one clock so the
rhythm can never drift from the melody, and it highlights the beat you are on with the
lyric underneath. It exists because Rinat practises from handwritten swaralipi
diaries: playing them on a Casio CT-X3000 (harmonium tone, rhythm running) meant
watching which keys to press instead of singing. The actual melody notes, rather than
a full backing track, tell the voice what to match. A working single-file prototype
(`reference/gaaner-sathi.html`) has been ported into a clean, light web app (Phase 0,
done 2026-10-10). **The order now (Rinat, 2026-10-10): features and functionality
first, built in the web app; then one intuitive design across all of them, in the web
app; then a fresh native mobile app (not a web page in a wrapper).** Until then the web
screen stays tidy and responsive, but its look and phone polish are not a focus. The
features: a song library for many songs, live pitch feedback from the microphone, a
daily rewaz routine with a practice log, each song's own sound, sixteen taals (Tagore's
own among them), and Rinat's ten picks from the feature ideas in `docs/ROADMAP.md` (beat
boxes for writing notation, a Voice tab with a range finder and a hold-a-note trainer,
takes, MIDI keyboards, sections with their own tempo, notes per song, printing, day and
night colours). **Usable straightaway, with no tutorial or learning curve**
(Rinat, 2026-10-10): features come in only when Rinat asks for them, and none may make
the basics harder to find. North-star flow: open the app (it opens on an exercise,
ready to play) → press play and sing → pick or type in your own song → loop the hard
lines.

*Target user:* Rinat, and singers like Rinat: read swaralipi and sing Bengali songs,
not technical, practise on a phone or a laptop, often with hands busy. Would they find
it obvious with no manual?

*Non-goals (for now):* features Rinat has not asked for; accounts and sync; a server
of our own; an offline, installable web app (the native app covers it); recorded
samples and ornaments (parked in `docs/ROADMAP.md`, each only with Rinat's go-ahead); a
UI framework or other runtime dependencies in the web app; sampling the Casio's
built-in voices (never).

*Roadmap at a glance* (full detail and done criteria: `docs/ROADMAP.md`):

| Phase | What | Done when |
|---|---|---|
| 0 | Port: TypeScript core, audio engine and interface to parity with the prototype; deployed from `main` (done 2026-10-10) | done |
| **1 ◀ now** | Features and functionality, in the web app: song library; pitch feedback from the microphone; rewaz routine and practice log; each song's own sound; Tagore's taals and four more; Rinat's ten picks (2026-10-11) | Rinat has used every feature on real songs and is happy |
| 2 | Design: one intuitive design across every feature, in the web app | Rinat signs off the design |
| 3 | Native mobile app: a fresh build, Android first | the app on Rinat's phone does everything the web app does |
| Parked | Offline web app, permanent web address, recorded instruments, ornaments, error reporting, accounts | only if Rinat asks |

## Universal working defaults

*These apply to every project unless a recorded decision below overrides them.*

- **Frictionless first.** UIs are intuitive and require the minimum clicks,
  aimed at non-technical users — zero-setup: no terminal, config files, or
  manual dependency setup for normal use. If a flow needs a manual, the flow is
  wrong.
- **Solo/inline by default.** Claude + Codex working through this file *is* the
  multi-perspective setup. Do **not** spawn programmatic multi-agent fan-outs or
  subagent swarms unless the user explicitly asks for a one-off, bounded audit —
  and if asked, say so first with a rough cost estimate. (The subscription is
  capped; a swarm's output still needs one careful verification pass afterwards,
  so it tends to cost twice.)
- **Priorities, in order: correctness & quality > avoiding rework > token efficiency > delivery speed.**
- **Verify in the real app before claiming "done."** Passing unit tests is
  necessary, not sufficient. Exercise the actual behaviour, and state the exact
  commands you ran and their results. "Tests pass" without the command and its
  result is not evidence.
- **Evidence over assertion — never fabricate.** Don't claim something works, or
  that a file / API / config key / library exists, without checking first (read
  or grep — don't guess from memory). Never invent paths, flags, or function
  names. If you are unsure, say so in the Work log "Risks" field rather than
  paper over it. Inventing "it works" is the failure mode that costs the most trust.
- **Keep the app one click away.** As soon as there is something to run, there
  must be a minimum-effort way to launch or view the current build, sitting at
  the repo root and noted in Conventions → Stack. The *form follows the stack* —
  don't force a `.bat` where a file or URL is simpler:
  - **Browser / static** — the `.html` you open directly, or a `run-dev` script
    that starts the dev server and opens the browser URL.
  - **Desktop app** — a **dev launcher** (e.g. `run-dev.bat`, live-reload for
    iterating against the real backend) plus an **app launcher** (e.g.
    `⟨AppName⟩.bat`) that starts the built app.
  - **Mobile / other** — the emulator or `run` command, documented when it can't
    be a double-click.

  Whatever the form: it's added the moment there's something to run, and if it
  builds first it must **rebuild when sources have changed** (or refuse to run a
  stale build) — a launcher that silently serves an old binary or bundle after
  edits wastes test cycles and hides real changes.

### Product & UX defaults

- **Design for a non-technical user** unless explicitly stated otherwise.
- **The primary task is immediately obvious** and takes the fewest sensible
  screens, decisions, and clicks.
- Use **strong defaults and auto-detection** instead of asking the user to
  configure what the app can determine itself.
- **Never silently lose the user's input or state** — recoverable errors and
  back navigation preserve work.
- **Destructive actions are reversible** where possible; otherwise require a
  clear confirmation.
- Errors say **what happened, what's still safe, and the exact next step** to recover.
- **Local-first and offline-capable where practical.** Don't add accounts, cloud
  services, telemetry, or ongoing costs without a material benefit.

### Engineering defaults

- **Fix the root cause**, not the symptom; label any temporary workaround as such.
- **Prefer the simplest maintainable implementation**; avoid speculative abstractions.
- **Stay in the requested scope** — no unrequested features, dependencies, or broad refactors.
- **Reproduce a bug before fixing it**, and add regression coverage where practical.
- **Decide low-risk things yourself.** Ask the user only on consequential,
  expensive, irreversible, or genuinely ambiguous choices.
- With tools available, **do the work** rather than instructing the user to.

### Working with Rinat (this project)

- **Keep it light.** No feature, screen, setting or dependency without a clear need;
  prefer good defaults and tucking options away over adding new ones.
- **Build proactively.** For substantial work, go ahead and build: Rinat does not want
  plans to approve first, and likes seeing finished, working steps. Stop and ask only
  for: anything irreversible; anything that costs money or creates accounts (domains,
  hosting, app stores, paid APIs, sample libraries); the questions in Open questions;
  Bengali wording you are not sure of.
- **Low-maintenance, set-and-forget choices:** static hosting, no server, automatic
  deploys from `main`, few dependencies.
- **Nobody on the build side can hear the app.** Verify every audio change by
  measurement: offline renders for loudness, autocorrelation for tuning, decay curves,
  timing logic as pure tests. Then ask Rinat for specific listening feedback ("is the
  tanpura too buzzy or too plucked?").
- **At each milestone,** tell Rinat in the reply what changed, what you tested and
  what to try, with a link that opens on a phone.
- **Record decisions:** a row in the Decisions log for each; a short ADR in
  `docs/adr/` as well when there is a real architectural trade-off.

## Definition of done

*What every Active-work item's "Acceptance evidence" must satisfy before its
status becomes Done.*

- [ ] Behaviour exercised in the **real app / runtime**, not just unit tests. (Sound
      is "exercised" by measurement in an offline render; see Working with Rinat.)
- [ ] The exact command(s) run **and their results** are recorded in the Work log.
- [ ] Core tests are green, and new behaviour comes with new tests.
- [ ] The built-in exercise library still checks clean.
- [ ] Audio changes come with a measurement.
- [ ] Works in both themes and stays responsive: no sideways scrolling at 360 px wide.
      (Phone polish waits for the native app and offline is parked: Rinat, 2026-10-10.)
- [ ] The stated **Invariants** still hold (none weakened without a recorded decision).
- [ ] Your own changes are **committed** (green, or `wip:` with what's unfinished noted)
      and pushed to `main`.
- [ ] At a milestone, the reply tells Rinat what changed and what to try.
- [ ] Anything left undone or uncertain is written in the Work log "Risks / Next".

## Source-of-truth order

When documents disagree, use this precedence:

1. The latest explicit user decision.
2. Current code plus freshly verified behaviour / tests.
3. Later commit messages that record real decisions and verification.
4. The latest approved specification.
5. Older specifications (historical rationale only).
6. Implementation plans and checklists (task recipes only — never infer status
   from a checkbox).

*This project:* until Phase 0 reaches parity, the prototype
(`reference/gaaner-sathi.html`) and its suites (`reference/tests/`) are the behavioural
contract for the port (level 2); `docs/NOTATION.md`, `ENGINE.md` and `DATA.md` describe
them (level 4); `docs/PARITY.md` is a checklist (level 6).

## Invariants — never weaken without a recorded decision

*To change one: record a user decision in the Decisions log first, then implement.*

- **Usable straightaway.** Opens ready to play (on an exercise the first time); the
  essentials are visible and everything else is one tap away; no tutorial needed.
- **Light.** No runtime dependencies and no new tooling without an ADR; the app is
  static files.
- **Local-first privacy.** No account needed. Nothing leaves the device unless the user
  chooses to export. Microphone audio is processed on the device and never uploaded. No
  telemetry.
- **Never lose a song.** Saves are debounced but flushed when the page is hidden or
  another song opens; imports always get new ids and never overwrite; deleting needs a
  confirmation; built-in exercises are read-only (copy one to edit it). The app reads
  the prototype's saved songs and never writes them; its own saves change only the song
  saved, so another tab's saves survive (ADR-002).
- **Files stay readable.** Keep reading `version: 1` files forever, including old
  `"format": "swaralipi-player"` ones (the importer never checks `format`). Bump
  `version` only for breaking changes, with a migration. Imports are normalised (every
  field clamped) and accept the envelope, a bare array, a single song or a plain `.txt`
  (2 MB per file, 200 songs per import, 200 000 characters per song).
- **One clock.** Melody, rhythm and highlight are scheduled from the same
  `AudioContext` times, so they cannot drift apart.
- **Pure core.** `notation`, `taal`, `exercises` and the song model have no DOM
  dependency and run in Node, the browser and a Worker.
- **Clean exercises.** Every built-in exercise parses with no errors or warnings, and
  the checker reports nothing on it.
- **Performance.** No audio glitches on a mid-range Android phone. The parser and
  checker run on every keystroke and stay fast on 500-beat songs.
- **Accessibility.** Fully usable by keyboard, visible focus, `prefers-reduced-motion`
  respected, sufficient contrast in both themes, labelled controls, usable at 360 px.
- **Identity.** A rosewood harmonium deck with a brass play button; the song on a
  ruled diary sheet with a red margin line, notes in ink and lyrics in red ink; Tiro
  Bangla for notes and display, Hind Siliguri for the interface; light and dark themes.
- **Licences.** No licence chosen yet (all rights reserved). Dependencies and assets
  use permissive licences (MIT, BSD, Apache-2.0, ISC, CC0, CC-BY), so any licence can be
  chosen later; never sample the Casio CT-X3000's built-in voices.

## Secrets & sensitive data

- **No secret in code, config, or the working tree.** Keys live in `.env`
  (git-ignored) or the OS credential store — never hard-coded, never committed.
  Paste real values into `.env`; only the empty `.env.example` is tracked.
- **Don't surface raw secrets.** Wire them in at runtime; never paste real key
  values into this file, prompts, or the Work log.
- **Sensitive / regulated data stays on the machine.** Prefer local inference for
  it; never send it to a cloud model or third-party API.
- *This project* uses no keys at all, so it has no `.env.example`; songs are private
  user content (see `SECURITY.md` → This project).
- Fuller model (fail-closed, spend caps, leak response) → `SECURITY.md`.

## Conventions

- **Copy:** UK English, sentence case ("practise" the verb, "practice" the noun,
  "colour", "analyse"). Bengali must be correct; ask Rinat when unsure. The name is
  always **Gaaner Sathi** in Latin letters, with **গানের সাথী** alongside in the app,
  so people find it whichever script they search in.
- **Theme:** theme-aware tokens; never hardcode light/dark colours (no raw
  rgba white/black for borders or fills). Accent: brass `#c4952b` (light) / `#d3a843`
  (dark) on rosewood `#3e1f15`; the prototype's `:root` holds the full token set for
  both themes.
- **Commits:** small — one behavioural idea plus its tests per commit. Prefixes:
  `feat:` `fix:` `test:` `docs:` `refactor:` `ci:` `chore:` `wip:`.
- **Stack / commands:** ADR-001 (revised 2026-10-10): TypeScript (strict), Vite,
  Vitest, no UI framework, no runtime dependencies, Node 24 LTS. Layout: `index.html`
  (the page), `src/core/` (pure: notation, taal, exercises, song), `src/audio/` (engine,
  instruments, transport; `src/audio/dsp/` is pure DSP), `src/app/` (the screen:
  `view.ts` pure HTML builders, `store.ts` storage, `app.ts` the wiring, `styles.css`;
  since Phase 1 also `songs.ts`, `pitch.ts`, `rewaz.ts`, `progress.ts`, `boxes.ts`,
  `voice.ts`, `takes.ts`, `keyboard.ts`, `print.ts`), `src/core/pitch/` and
  `src/core/practice/` (pure: scoring, the log, routines, the voice sums, takes),
  `src/core/notation/sections.ts` and `boxes.ts` (pure), `src/audio/mic.ts`,
  `recorder.ts`, `midi.ts`,
  `tests/ported/` (the reference suites one-for-one), `tests/differential/` (port
  versus the prototype's own code, including a recording stand-in for Web Audio and fake
  page elements for its rendering), `tests/unit/`, `dev/` (dev-only check pages).
  - **One click away:** the live app, https://rinatmalik.github.io/Gaaner-Sathi/,
    rebuilt from `main` on every push (so never stale).
  - `npm install` once; `npm test` runs every Vitest suite (285 tests, about 10 s).
  - `npm run dev`: the Vite dev server, the app at `/`; `/dev/render.html` renders
    sessions through the prototype's engine and the port's and compares them (the
    audio check). Claude starts it with the browser pane's `preview_start` ("dev" in
    `.claude/launch.json`).
  - `npm run build`: the published files in `dist/` (relative paths, so they work in
    any folder of the site).
  - `npm run typecheck`: the whole project, then `src/core` and `src/audio/dsp`
    with no DOM library (a DOM call there fails).
  - `npm run test:reference` (or `bash reference/tests/run-all.sh`): the prototype's own
    suites. Green means parser 31, checker 11, join-split 10, rhythm 12, tanpura 5
    passed and 12 exercises valid.
  - Prototype: open `reference/gaaner-sathi.html` in a browser.
  - CI: `.github/workflows/ci.yml` on every push to `main`: a core job (`npm ci`,
    type-check, tests, build), a reference job, and a deploy job to GitHub Pages that
    runs after both pass: the built app at the site's root, and a page at `/new/` that
    forwards there. The prototype is no longer published.
- **Environment gotchas:**
  - Windows: system git has `core.autocrlf=true` and `.gitattributes` normalises to LF
    in the repo, so "LF will be replaced by CRLF" warnings are expected noise; `.sh`
    files stay LF. OneDrive sync is paused while working on projects (ignore it).
  - The repo path contains spaces and Bengali characters, and stays that way (Rinat's
    preference). Every tool used so far works with it: git, Node 24, npm, TypeScript 7,
    Vite, Vitest, Git Bash, PowerShell, CI. Quote the path; percent-encode it in
    `file://` URLs; Claude Code's memory folder name shows the Bengali as dashes
    (harmless). Known exception, for the parked Android app: the Android Gradle plugin
    refuses non-ASCII project paths on Windows, so build that from an ASCII-only copy.
  - Node is 24.20.0. npm is 9.8.1: an old global copy in `%APPDATA%\npm` shadows Node
    24's own npm, which the upgrade did not install. It works; to update it:
    `npm install -g npm@latest`.
  - `run-all.sh` writes `reference/tests/.extracted/` (git-ignored). The repo root is an
    ES module package; `reference/tests/package.json` keeps the prototype's suites
    CommonJS. Vitest's JSON reporter writes `.vitest/` (git-ignored).
  - Node 24 runs `node -e` code through its TypeScript stripper, which can trip on
    regex escapes: put one-off scripts in a file instead.
  - Don't use `git stash -u` to test a commit alone: here it could not remove untracked
    folders (permission denied, probably a handle held by the app's file preview) and
    left a duplicate stash. Instead: `git worktree add --detach <scratch>/wt <commit>`,
    `npm ci` and test there, then `git worktree remove`. Delete a leftover folder with
    the `\\?\` long-path prefix, because `node_modules` paths pass 260 characters
    under the long scratch path. A checkout here gives text files CRLF endings (with
    `* text=auto` they follow `core.eol`, so `core.autocrlf=false` alone does not help);
    the comparison tests cope since `e1eb3e5`. To get a file as CI has it, delete it and
    run `git -c core.autocrlf=false -c core.eol=lf checkout -- <file>`. When checking a
    test run, read Vitest's "Test Files" line: a file that fails to load does not count as
    a failed test, and a pipe through `tail` hides the exit code.
  - `gh` is installed but not logged in; pushes go through Git Credential Manager.
  - When the browser pane is hidden, its page has a 0 × 0 viewport and draws no frames,
    so layout and highlight checks fail there. Instead, Claude drives a headless Edge
    through the DevTools protocol: a short Node script using Node 24's built-in
    WebSocket, Edge started with `--headless=new --mute-audio`, a throwaway
    `--user-data-dir` under the scratch folder's short path. On Windows,
    `msedge.exe --version` opens the browser rather than printing a version. Edge
    opens an `edge://downloads-hub` page after a download, so skip `edge:` targets.
  - Shell heredocs here can turn `\\` into `\`, so a `\n` meant for page code becomes
    a real newline. Write test scripts with the Write tool instead. Long one-off edit
    scripts in a heredoc can also fail to parse; write them to a file too. In a bash
    double-quoted `node -e "…"`, backticks run as commands (one ran a markdown file and
    left two empty files); never put backticks there.
  - Headless Edge's `--user-data-dir` must be a short path (`%TEMP%\gsp\…`): under the
    session's scratch folder the profile's IndexedDB files pass 260 characters and every
    `indexedDB.open` fails with "Internal error opening backing store".
  - To test MIDI without a keyboard: `Page.addScriptToEvaluateOnNewDocument` with a stand-in
    `navigator.requestMIDIAccess` whose output records `send(data, at)` and whose input can
    "press" keys (`onmidimessage`).
  - Shell heredocs also turn a `\\u0000` meant for page code into a real NUL character:
    write such edit scripts with the Write tool, and scan for control characters after.
  - To test pitch feedback without a singer: start headless Edge with
    `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream
    --use-file-for-fake-audio-capture=<file.wav>%noloop` (a 16-bit mono WAV, short path);
    the file starts when the page opens the microphone. Synthesise the WAV from the
    notation (a one-off Vitest file can import the parser and write it).
- Keep CLAUDE.md and AGENTS.md aligned so the shared-branch rules survive future
  sessions.

## Reference docs (read on demand)

*This file is the hot path — read every prompt, kept lean. Heavier, stable
reference lives in sibling docs; open one only when the task touches it.*

- **`SECURITY.md`** — secret handling, fail-closed defaults, spend caps, leak response;
  this project's privacy and licence rules.
- **`docs/ROADMAP.md`** — Phases 0–3 with done criteria, the feature ideas for Rinat
  to pick from, and the parked ideas with the kickoff's notes on each.
- **`docs/PARITY.md`** — the Phase 0 side-by-side checklist: every prototype feature.
- **`docs/NOTATION.md`** — notation spec: beats, notes, octaves, edit operations, checker.
- **`docs/ENGINE.md`** — audio and timing engine: scheduler, taals, rhythm, harmonium,
  tanpura, and how to verify sound without ears.
- **`docs/DATA.md`** — song model, file format, settings, storage.
- **`docs/HISTORY.md`** — older Work log entries, moved out of this file to keep it lean.
- **`docs/adr/`** — architecture decision records (ADR-001: stack, revised 2026-10-10;
  ADR-002: storage, and how the prototype's saved songs are read; ADR-003: how pitch
  feedback listens, times and scores).
- **`reference/`** — the prototype, its 12 exercises and its test suites
  (`reference/README.md`).

## Collaboration protocol

- **Sequential by default.** One agent works the tree at a time (you, turning to
  Claude or Codex in turn). Two agents do not edit the same working tree at once.
- **Orient before editing.** Run `git status --short`, read the Current state
  block and the latest Work log entry, and note any pre-existing uncommitted
  changes before you touch anything.
- **Commit before handover.** The implementing agent commits its own code before
  another model picks the work up, so the next one starts from a clean tree.
- **Reviewers review the committed diff** — and must not silently turn a review
  into a large rewrite; propose changes, then make them with the owner's assent.
- Never commit another agent's uncommitted work; never discard, revert,
  normalise, or overwrite changes whose origin is unclear.
- **Parallel work is opt-in** — only when you explicitly enable it and assign
  separate paths or branches. Then claim a path in Active work before editing it.
- Don't claim another agent reviewed something until it leaves an attributed
  entry here.
- *This project (Rinat, 2026-10-09):* **one branch, one agent at a time.** All work is
  committed to `main` and pushed to `origin`
  (`https://github.com/RinatMalik/Gaaner-Sathi`); no other branches. Only one LLM
  ever works on the project at once, so parallel work stays off.

## Active work

*The current slice(s) of work and who owns them. Allowed statuses: Proposed, In
progress, Blocked, Review, Done, Superseded.*

| ID | Owner | Status | Scope / paths | Acceptance evidence | Notes |
|---|---|---|---|---|---|
| PH0-01 | Claude | Done | framework docs, `docs/`, `reference/`, CI; remove `handover/` | Handover merged and removed; reference suites green locally and in CI run `38001060696`; pushed (`c0b057c`) | Framework and repo setup |
| PH0-02 | Claude | Done | `src/core/`, `src/audio/dsp/`, `tests/`, `package.json`, configs, CI | 69 reference tests and 12 exercises ported one-for-one and green; differential tests against the prototype green and shown to catch injected bugs; `src/core` type-checks with no DOM library; CI run `38005291130` green (`8b5b933`) | Core port |
| PH0-03 | Claude | Done | `src/audio/`, `tests/differential/`, `dev/` | Identical recorded Web Audio calls to the prototype for 16 sessions, every lane, closing strokes and live controls (17 tests, 5 injected bugs caught); Chromium offline renders match the prototype within its own run-to-run variation; commits `ded3ee4`, `218467a` | Audio engine and transport |
| PH0-04 | Claude | Done | `src/app/`, `index.html`, `vite.config.ts`, `tests/` | 69 of 71 `docs/PARITY.md` items Done and 2 Ported (Bluetooth latency, wake lock: need a phone); rendering identical to the prototype's in differential tests; every view checked at 360 px in both themes in headless Edge (Work log 2026-10-10 12:00); Rinat tried it on a phone and a laptop and kept the folding Sound settings | The prototype's screen, plus foldable Sound settings |
| PH0-05 | Claude | Done | CI deploy job | CI run `38073368085` (`ee7bf13`) green; the live root serves the new app and `/new/` forwards to it; in headless Edge the live page loads exercise 3, plays with the highlight moving, no console errors (Work log 2026-10-10 20:00) | The new app at the site's root |
| PH1-01 | Claude | Review | `src/core/song/`, `src/core/practice/log.ts`, `src/app/songs.ts`, `index.html`, `tests/` | 15 + 9 unit tests; headless Edge on the built site: import with tags, search (Bengali across beats, Latin, taal, tags), filters, stars surviving a reload, open, log after 12 s and not after 3 s, tags edited, title sort remembered, backup carrying tags and stars, 360 px both themes (Work log 2026-10-10 20:00) | Song library and the practice log; waiting for Rinat's use |
| PH1-02 | Claude | Review | `src/audio/dsp/`, `src/audio/mic.ts`, `src/core/pitch/`, `src/app/pitch.ts`, `tests/` | Detector within 0.03 / 1.3 cents (pure / sung-like tones, C2–C6); end-to-end in Node and in headless Edge with a WAV as the microphone: in tune 100, 35 cents flat 50, delay found within the first line (Work log 2026-10-10 20:00); ADR-003 | Pitch feedback; waiting for Rinat to sing with it |
| PH1-03 | Claude | Review | `src/core/practice/routine.ts`, `src/app/rewaz.ts`, `src/app/progress.ts`, `src/audio/transport.ts`, `tests/` | 12 unit tests; headless Edge: a 2-item routine ran hands-free to "Rewaz done" (rounds, the pause, "your turn" rounds), logged with its name and tempo; Skip, Stop; Progress and its download; 360 px both themes (Work log 2026-10-10 20:00) | Rewaz routines and Progress; waiting for Rinat's use |
| PH1-04 | Claude | Review | `src/core/song/`, `src/audio/sound.ts`, `src/app/`, `index.html`, `tests/` | 8 unit tests; headless Edge on the built site: a song keeps its whole Melody and Rhythm set from its first change while the usual sound stays as it was, through switching songs, a reload, a change while playing, a copy, export and import; "Use my usual sound"; a rewaz plays each item with its own; 360 px both themes (Work log 2026-10-11 00:40) | Each song remembers its own sound; waiting for Rinat's use |
| PH1-05 | Claude | Review | `src/core/taal/`, `src/audio/instruments/percussion.ts`, `src/app/view.ts`, `tests/`, `dev/` | 10 unit tests; the prototype's six still compared exactly; offline renders: levels like the prototype's, silence exactly on the rests; headless Edge: picker, strip, marks, start beats, checker and playing for all ten (Work log 2026-10-11 00:40) | Tagore's six taals, and Khemta, Deepchandi, Dhamar, Jhumra; waiting for Rinat's ears |
| PH1-06 | Claude | Review | `index.html`, `src/`, `tests/`, `docs/` | 59 new unit tests (285 in all); headless Edge on the dev server, a scenario each with real key and mouse events: theme and notes (20 checks), sections and tempos (15), print with a PDF made (7), beat boxes (29), Voice with WAVs as the microphone (range 16, hold 10), takes with a WAV microphone (21), MIDI with a stand-in keyboard (20); 360 px both themes; live site checked (Work log 2026-10-11 02:20) | Rinat's ten picks (chat 2026-10-11): day and night, notes per song, sections and their tempo, print or PDF, beat boxes, the Voice tab, takes, MIDI keyboards; waiting for Rinat's use (CT-X3000 not tried) |

## Decisions log

*Append-only. Never rewrite history. Record the authority / evidence and the
consequence.*

| Date | Decision | Authority / evidence | Consequence |
|---|---|---|---|
| 2026-10-09 | Repo is `https://github.com/RinatMalik/Gaaner-Sathi`; all work on `main`, pushed to `origin`; no other branches; only one LLM works on the project at a time. | Rinat, chat 2026-10-09; confirmed 2026-10-10 | Supersedes the kickoff's "a preview deploy per branch": the deploy from `main` is the preview. Parallel-work provisions stay unused. |
| 2026-10-09 | Handover pack merged into the framework: kickoff → this file, `docs/ROADMAP.md`, `docs/PARITY.md`; specs → `docs/`; prototype and suites → `reference/`; `handover/` deleted. | Rinat, chat 2026-10-09 | The original pack stays in git history at `e0ea8d8`. This file is the hot path; `docs/` is cold. |
| 2026-10-09 | Stack and architecture baseline: TypeScript, React, Vite, Vitest, Playwright, Node 24 LTS; one package with a DOM-free core. | Kickoff §5 defaults; `docs/adr/ADR-001-stack.md` | Node 24 needed on every dev machine; core tests run in plain Node. |
| 2026-10-09 | Decision records: every decision gets a row here; one with a real architectural trade-off also gets a short ADR in `docs/adr/`, linked from its row. | Claude, reconciling kickoff §2 with this log; confirmed by Rinat 2026-10-10 | One index of decisions, with depth where it is needed. |
| 2026-10-09 | `CHANGELOG.md` holds the user-facing notes; the Work log stays agent-facing. | Kickoff §8 | Superseded 2026-10-10 (no changelog). |
| 2026-10-09 | Licence GPL-3.0. | Rinat, when creating the repo (initial commit `4dfc1e2`) | Superseded 2026-10-10 (no licence for now). |
| 2026-10-10 | No `CHANGELOG.md`: the Work log is the only log; milestone "what changed / what to try" notes go in the reply to Rinat. | Rinat, chat 2026-10-10 | `CHANGELOG.md` deleted. |
| 2026-10-10 | Skip the Work log entry and the commit when a prompt changes no code or project structure; new user decisions are still recorded. | Rinat, chat 2026-10-10 | Settles "write every prompt" versus "no noisy commits"; CLAUDE.md and AGENTS.md updated. |
| 2026-10-10 | Clean project folder: removed `bootstrap.bat`, `CHANGELOG.md`, `.env.example` (no keys used), the empty `.agents/`, `reference/tests/README.md` (folded into `reference/README.md`), unused `.editorconfig` and `.gitignore` sections. | Rinat, chat 2026-10-10 ("remove anything unnecessary or obsolete") | All recoverable from git history. |
| 2026-10-10 | No licence for now (all rights reserved); the GPL-3.0 `LICENSE` is deleted. Dependencies and assets must be permissively licensed, so any licence can be chosen later. | Rinat, chat 2026-10-10 ("delete the license if it's simpler"); Claude's recommendation | Public repo stays readable; reuse needs permission until a licence is chosen. |
| 2026-10-10 | OneDrive sync is paused while working on projects; ignore OneDrive concerns. | Rinat, chat 2026-10-10 | No OneDrive workarounds needed. |
| 2026-10-10 | Direction: a very light, user-friendly web app with basic features that a singer can use straightaway, with no tutorial or learning curve; it must not grow into a massive thing. | Rinat, chat 2026-10-10 | Product direction, invariants ("Usable straightaway", "Light") and roadmap updated. |
| 2026-10-10 | Lighter stack: TypeScript, Vite and Vitest only; no UI framework (a plain TypeScript interface ported from the prototype); `localStorage` instead of IndexedDB; no Playwright, i18n library or error-reporting service for now. | Claude, following Rinat's direction; ADR-001 revised. Rinat can veto | Zero runtime dependencies; replaces the React, Playwright and IndexedDB parts of the 2026-10-09 stack row. |
| 2026-10-10 | Roadmap trimmed: v1 is Phase 0 (port) and Phase 1 (publish); pitch feedback, recorded instruments, ornaments, riyaz routine and log, error reporting, accounts and native apps are parked ideas needing Rinat's go-ahead. | Claude, following Rinat's direction; `docs/ROADMAP.md`. Rinat can veto | Nothing lost: the kickoff's notes on parked ideas are kept. Partly superseded the same day (Phase 2 row below). |
| 2026-10-10 | Hosting: GitHub Pages, deployed from `main` by GitHub Actions (free, no new account), not a folder on rinatmalik.com. The permanent address (a subdomain of rinatmalik.com or a dedicated domain) is still open. | Rinat, chat 2026-10-10 | PH0-05 needs Pages switched on once and a deploy workflow. |
| 2026-10-10 | Keep every prototype feature; tuck the advanced ones away rather than drop any. | Rinat, chat 2026-10-10 | `docs/PARITY.md` stays complete. |
| 2026-10-10 | Planned, not parked: pitch feedback from the microphone, then a daily rewaz routine with a practice log (Phase 2, in that order). Each song remembering its own rhythm, speed and drone settings stays in Phase 1. Recorded instruments, ornaments, error reporting, accounts and native apps stay parked. | Rinat, chat 2026-10-10 | `docs/ROADMAP.md` Phase 2 restored with the kickoff's design notes; the microphone privacy invariant is back. |
| 2026-10-10 | Continue the TypeScript port rather than grow the single HTML file. | Rinat, chat 2026-10-10 ("yes") | PH0-03 and PH0-04 go ahead. |
| 2026-10-10 | Publish the prototype on GitHub Pages now, as an interim, until the new app has a screen. | Rinat, chat 2026-10-10 ("yes") | A CI deploy job publishes `reference/gaaner-sathi.html` as the site after the tests pass; it needs Pages switched on once. |
| 2026-10-10 | Sound is verified by comparing the port with the prototype call for call (recorded Web Audio, in CI), plus an offline-render check page in the browser. | Claude, settling ADR-001's "decided in the audio-engine step" | No Node Web Audio library or browser automation added. |
| 2026-10-10 | The new app keeps the prototype's screen with one layout change, for Rinat to keep or undo: the Sound settings (Melody, Rhythm, Practice) fold away behind a bar that says what is on. They start folded on narrow screens and open on wide ones, then stay as the user leaves them. | Claude's proposal. Rinat (chat 2026-10-10) is unsure that an extra step is simpler: "only do the UI change that you want and let me decide after looking at it". Measured at 360 × 780: the prototype's settings fill 602 px before the song (sheet at 1,675 px); folded, the sheet starts at 1,131 px | Open question 5. Undoing it means removing the bar: the `.sound` wrapper in `index.html`, its CSS block and two functions in `app.ts`. |
| 2026-10-10 | The new app is published at `/Gaaner-Sathi/new/` beside the prototype until Rinat has looked at it; then it takes over the main address. | Claude, so Rinat can try it on a phone before deciding (Rinat asked to look first) | The deploy job builds the app and copies it to `_site/new/`. |
| 2026-10-10 | The app reads the prototype's saved songs and settings but never writes them; its changes go under its own keys (`gaanersathi.*`), and each save changes only the song saved. | Claude, for "never lose a song": a prototype tab left open rewrites its whole song list from memory on every save. `docs/adr/ADR-002-storage.md` | Neither page can overwrite the other's work; the prototype's storage is never changed. Edits made in the new app do not show in the prototype. |
| 2026-10-10 | Interface text stays where the prototype had it (the page markup and the render functions), not in one strings module. | Claude, settling ADR-001's plan: a strings module only pays off for a Bengali interface, which is a parked idea | The port can be compared with the prototype line by line. |
| 2026-10-10 | Keep the folding Sound settings (Open question 5 answered). | Rinat, chat 2026-10-10 ("that's fine I accept it") | PH0-04 done; the new app takes over the main address. |
| 2026-10-10 | The new app replaces the prototype at https://rinatmalik.github.io/Gaaner-Sathi/; `/new/` forwards there. The prototype is no longer published but stays in `reference/`, because the differential tests use its code as their oracle (the roadmap had said to remove `reference/` after Phase 0). | Claude, following Rinat's acceptance | Songs saved in the prototype at that address still show in the app (same origin, ADR-002). |
| 2026-10-10 | Order of work: features and functionality first, built in the web app; then one intuitive design across all of them, in the web app; then a fresh native mobile app (an APK, not a web page in a wrapper). The web screen stays responsive, but phone polish and looks are not a focus until then. | Rinat, chat 2026-10-10 | Roadmap reordered: Phase 1 features, Phase 2 design, Phase 3 native app. The offline, installable web app (old Phase 1) is parked. The Definition of done's 360 px check becomes "responsive: no sideways scrolling". Native apps leave the non-goals. |
| 2026-10-10 | Phase 1 features, in this order of building: a song library to manage many songs (new), pitch feedback from the microphone, a rewaz routine with a practice log. Claude lists further feature ideas for Rinat to pick from (`docs/ROADMAP.md` → Feature ideas). Features come in only when Rinat asks for them; usable straightaway stays an invariant. | Rinat, chat 2026-10-10 ("add those, and let me know what else can be added") | PH1-01 to PH1-03. "Each song remembers its own sound" follows them. |
| 2026-10-10 | Library: tags (free text) and a favourite star on each song, as optional fields in storage and song files, so files stay version 1 and prototype songs read exactly as before. The Songs view holds search, sort, filters, new song, import and backup. | Claude, building PH1-01 | Import and "Back up all my songs" moved from the editor's toolbar to the Songs view. |
| 2026-10-10 | Practice log: every play of 10 s or more (after the count-in) is logged on the device when it stops, under `gaanersathi.log.v1`, appended so another tab's entries survive. | Claude, building PH1-01 and PH1-03 | "Recently practised", Progress, scores and routines all read it. A quick listen is not practice. |
| 2026-10-10 | Pitch feedback as in ADR-003: hand-written McLeod detector on the page, an AudioWorklet that only collects samples, the guide's AudioContext as the one clock; the delay found from the singing instead of a click calibration (works with headphones); scores on pitch only, any octave by default; "every other round" guide rounds are for listening, so not scored. | Claude, building PH1-02; `docs/adr/ADR-003-pitch-feedback.md` | The roadmap's click calibration and timing score are dropped for now; timing needs the true round-trip delay. |
| 2026-10-10 | Rewaz: items have their own lines, rounds, tempo and guide, which never change the song or the device settings; the transport can stop a loop after N rounds; a 4 s pause shows what is next; any user play, stop or song change ends the routine; a starter "Daily warm-up" stays on offer like the exercises. | Claude, building PH1-03 | The other Sound settings (rhythm, drone, tempo trainer) apply to routines as set. |
| 2026-10-10 | Five views under the deck (Songs, Practice, Edit notation, Rewaz, Progress) as tabs, with the deck and Sound bar shown for all. | Claude, following Rinat's "features first, design later" | The navigation is for the Phase 2 design to settle. |
| 2026-10-11 | Each song remembers its own sound: the Melody and Rhythm settings are saved with one of the user's songs on the first change made while it is open, as a whole set, so it sounds the same whatever changes later. Exercises, new songs and songs not yet changed use "your usual sound" (the device's settings), which a change made on an exercise sets; "Use my usual sound" removes a song's own; the Practice settings stay the device's. Stored and exported as an optional `sound` field (still version 1). | Rinat, chat 2026-10-10 ("please do these 2 tasks only"); the behaviour is Claude's choice | Songs from before sound as they did until changed. To change the usual sound, change it on an exercise (the note in the Sound settings says so). |
| 2026-10-11 | Beat boxes are the editor's default (Free text one tap away, remembered): a box per beat grouped by the taal's vibhags, words under each beat, headings as rows with a tempo field. The text stays the only record. New lines are as long as the line above (whole cycles, one at first); typed or pasted beats write over the boxes after them, then fill the line, then make new lines; `sa re ga`, রে and নি are mended into notes; bars follow the song's style. | Rinat, chat 2026-10-11 ("a more structured way where there will be sectioned boxes representing each beat … like 2FA boxes"); the details are Claude's reading of it, for Rinat to correct | NOTATION.md → Beat boxes. Headings, lyrics and comments keep working as before. |
| 2026-10-11 | A section's tempo is written in its heading (`tempo 110`, `লয় ১১০`, `♩=110`); sections without one play at the song's tempo (no carrying on to the next section); the deck shows and changes the tempo of the section playing, writing it back into the heading. | Claude, building Rinat's pick "a tempo per section" | Songs without section tempos play as before; the text stays readable by the prototype. |
| 2026-10-11 | "Your Sa": the range finder's suggestion (Use as my Sa), or a Sa changed on an exercise, is kept on the device; exercises open in it (they were all C4) and new songs start in it. A song's own Sa is unchanged unless "Use for this song". | Claude, building Rinat's pick "a range finder" | DATA.md → Settings `mySa`. |
| 2026-10-11 | Takes: captured on the guide's clock, halved to 24 kHz 16-bit, kept in IndexedDB (the app's first use of it), played back against the guide with the run's settings; not in song files; Download as WAV. | Claude; ADR-004 | DATA.md → Takes. |
| 2026-10-11 | MIDI through Web MIDI for any keyboard, not only the Casio: step typing in the editor, the guide on the keyboard (its own sound by default, or General MIDI reed organ or accordion), and a drawn keyboard showing the keys to press. | Rinat asked that it be brand-agnostic and light (chat 2026-10-11); Claude, ADR-005 | Not tried on the CT-X3000 yet; Safari and iPhones have no Web MIDI. |
| 2026-10-11 | A Voice tab after Rewaz; day and night as Auto, Day, Night in the header; printing through the browser's own print dialog (its Save as PDF), with a print-only sheet. | Claude, building Rinat's picks (Rinat may move the Voice tab later) | No library for PDFs. |
| 2026-10-11 | Ten more taals. Tagore's six have only talis, no khali, with the thekas gitabitan.net gives: Subinay Roy's on tabla, and mridanga thekas (Kangalicharan Sen's, Subinay Roy's) where no tabla one exists. Khemta is the 12-matra form, Dhamar is divided as in Rabindrasangeet (3\|2\|2\|3\|4, khali on 4 and 8), Deepchandi and Jhumra are the standard ones. A rest in a theka plays nothing. The app keeps these taal ids; the prototype reads them as Dadra. | Rinat, chat 2026-10-10; Claude's research (sources in `docs/ENGINE.md` → Taals) | Open question 5. Their dholak and drum patterns are Claude's, for Rinat to judge by ear. |

## Open questions

*Product or technical decisions that need the user eventually, but do not block
current work (unless marked). Defaults apply until answered.*

1. **Lower octave when the editor writes notation:** `.` before the note (current) or
   হসন্ত after it? Default: keep reading both, write `.`.
2. **Conjuncts from phonetic keyboards** such as Avro: is `ম্প` lower Ma + Pa (current)
   or plain Ma + Pa? Default: unchanged until decided.
3. **Permanent web address** (of the app, not of each song). GitHub Pages is decided for
   now (`rinatmalik.github.io/Gaaner-Sathi`). Later: point a subdomain such as
   `gaanersathi.rinatmalik.com` (one DNS record at Hostinger) or a dedicated domain at
   it. Browsers keep a site's saved data (songs, settings, log, takes) under its address,
   separately for each user and device, so moving later means every user backing up at
   the old address and importing at the new one. Less pressing since 2026-10-10: the
   native app is the product. Settle it before anyone besides Rinat relies on the web app
   (Rinat asked what it meant, 2026-10-11; explained in the reply).
4. **Free, paid or donations?** Matters once the native app heads for an app store
   (Phase 3). No licence for now.
5. **Two taal forms.** Khemta is the 12-matra form of the Bengali tabla books, not
   Tagore's 6-matra Kashmiri Khemta (Dhig – Na · Dha Ti Na). Dhamar is divided as in
   Rabindrasangeet (3+2+2+3+4, khali on 4 and 8), not the classical 5+2+3+4 (the
   checker accepts bars written either way). Default: as built.

## Work log

*Copy the template for every meaningful work session; newest at the top. Test
statements must name the exact command, result, and environment — "tests pass"
is not sufficient. When this grows long, keep only the last few entries here and
move older ones into a `HISTORY.md` you create then, so this file stays lean.*

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

Older entries: `docs/HISTORY.md`.
