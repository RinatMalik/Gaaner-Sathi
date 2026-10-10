# Gaaner Sathi (গানের সাথী) — CONTEXT

> The single shared brain for this project. Everything Claude, Codex, any LLM and 
> the user need to stay in sync lives here: product direction, working rules, live
> state, decisions, and the work log.
>
> **Last updated:** 2026-10-10 by Claude (Opus 5.5)

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

- **Current milestone:** Phase 0, port (Roadmap at a glance below).
- **Current task:** PH0-04 in Review. The new app's screen is built, published at
  `/Gaaner-Sathi/new/` beside the prototype, and waiting for Rinat's verdict on its one
  layout change: the Sound settings fold away (Open question 5).
- **Next single action:** Rinat tries https://rinatmalik.github.io/Gaaner-Sathi/new/ on
  a phone and a laptop and says whether to keep the folding Sound settings or show them
  all the time as the prototype does. Then PH0-05: the new app takes over the main
  address and the prototype leaves the site.
- **Last known-good commit:** `218467a` (CI run `38037906311`: core, reference and
  deploy jobs green); this session's commits are recorded in the newest Work log entry.
- **How to run it now:** the new app at https://rinatmalik.github.io/Gaaner-Sathi/new/,
  the prototype at https://rinatmalik.github.io/Gaaner-Sathi/. Locally: `npm install`,
  then `npm run dev` (the app at `/`, the audio check at `/dev/render.html`) and
  `npm test` (see Conventions → Stack).
- **Blockers:** none; Open question 5 waits on Rinat.
- **Uncommitted work:** none.

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
exists (`reference/gaaner-sathi.html`). The job: port it into a clean, light web app
that works offline and installs on a phone, publish it, then add live pitch feedback
from the microphone and a daily rewaz routine with a practice log. **Basic features,
usable straightaway with no tutorial or learning curve; it must not grow into a
massive thing** (Rinat, 2026-10-10). North-star flow: open the app (it opens on an
exercise, ready to play) → press play and sing → pick or type in your own song → loop
the hard lines.

*Target user:* Rinat, and singers like Rinat: read swaralipi and sing Bengali songs,
not technical, practise on a phone or a laptop, often with hands busy. Would they find
it obvious with no manual?

*Non-goals (for now):* features beyond the prototype's and the Phase 2 list; accounts
and sync; a server of our own; app-store apps; recorded samples and ornaments (parked
in `docs/ROADMAP.md`, each only with Rinat's go-ahead); a UI framework or other runtime
dependencies; sampling the Casio's built-in voices (never).

*Roadmap at a glance* (full detail and done criteria: `docs/ROADMAP.md`):

| Phase | What | Done when |
|---|---|---|
| **0 ◀ now** | Port: TypeScript core with the reference suites (done); audio engine and interface to parity (same capabilities, simpler presentation, nothing dropped) | every reference test passes against the new core; the exercises check clean; every `docs/PARITY.md` item works; a deploy from `main` is live on GitHub Pages |
| 1 | Publish: offline and installable, songs saved in the browser, import/export, opens on an exercise, privacy note, each song remembering its own sound settings | a public URL; Lighthouse PWA and accessibility pass; works offline; Rinat has practised a full song on phone and laptop |
| 2 | In order: pitch feedback from the microphone (live sharp/flat, a score per line); a daily rewaz routine with a practice log | per item, see ROADMAP |
| Parked | Recorded instruments, ornaments, error reporting, accounts, native apps, smaller extras | only if Rinat asks |

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
- [ ] Works offline, in both themes, at 360 px wide with no sideways scrolling (once
      the app exists).
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
  `view.ts` pure HTML builders, `store.ts` storage, `app.ts` the wiring, `styles.css`),
  `tests/ported/` (the reference suites one-for-one), `tests/differential/` (port
  versus the prototype's own code, including a recording stand-in for Web Audio and fake
  page elements for its rendering), `tests/unit/`, `dev/` (dev-only check pages).
  - **One click away:** the live app, https://rinatmalik.github.io/Gaaner-Sathi/new/,
    rebuilt from `main` on every push (so never stale).
  - `npm install` once; `npm test` runs every Vitest suite (153 tests, about 8 s).
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
    runs after both pass: the prototype at the site's root and the new app at `/new/`,
    until the new app takes over the root (PH0-05).
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
    under the long scratch path.
  - `gh` is installed but not logged in; pushes go through Git Credential Manager.
  - When the browser pane is hidden, its page has a 0 × 0 viewport and draws no frames,
    so layout and highlight checks fail there. Instead, Claude drives a headless Edge
    through the DevTools protocol: a short Node script using Node 24's built-in
    WebSocket, Edge started with `--headless=new --mute-audio`, a throwaway
    `--user-data-dir` under the scratch folder's short path. On Windows,
    `msedge.exe --version` opens the browser rather than printing a version. Edge
    opens an `edge://downloads-hub` page after a download, so skip `edge:` targets.
  - Shell heredocs here can turn `\\` into `\`, so a `\n` meant for page code becomes
    a real newline. Write test scripts with the Write tool instead.
- Keep CLAUDE.md and AGENTS.md aligned so the shared-branch rules survive future
  sessions.

## Reference docs (read on demand)

*This file is the hot path — read every prompt, kept lean. Heavier, stable
reference lives in sibling docs; open one only when the task touches it.*

- **`SECURITY.md`** — secret handling, fail-closed defaults, spend caps, leak response;
  this project's privacy and licence rules.
- **`docs/ROADMAP.md`** — Phases 0 and 1 with done criteria; the parked ideas, with
  the kickoff's notes on each.
- **`docs/PARITY.md`** — the Phase 0 side-by-side checklist: every prototype feature.
- **`docs/NOTATION.md`** — notation spec: beats, notes, octaves, edit operations, checker.
- **`docs/ENGINE.md`** — audio and timing engine: scheduler, taals, rhythm, harmonium,
  tanpura, and how to verify sound without ears.
- **`docs/DATA.md`** — song model, file format, settings, storage.
- **`docs/adr/`** — architecture decision records (ADR-001: stack, revised 2026-10-10;
  ADR-002: storage, and how the prototype's saved songs are read).
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
| PH0-04 | Claude | Review | `src/app/`, `index.html`, `vite.config.ts`, `tests/` | 69 of 71 `docs/PARITY.md` items Done and 2 Ported (Bluetooth latency, wake lock: need a phone); rendering identical to the prototype's in differential tests; every view checked at 360 px in both themes in headless Edge (Work log 2026-10-10 12:00) | The prototype's screen, plus foldable Sound settings: waiting for Rinat's verdict (Open question 5) |
| PH0-05 | Claude | In progress | CI deploy job | A live URL deployed from `main` that opens on a phone | The prototype is live at the root since 2026-10-10 (CI run `38037906311`), the new app at `/new/` since this session; next, the new app takes over the root after Open question 5 |

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

## Open questions

*Product or technical decisions that need the user eventually, but do not block
current work (unless marked). Defaults apply until answered.*

1. **Lower octave when the editor writes notation:** `.` before the note (current) or
   হসন্ত after it? Default: keep reading both, write `.`.
2. **Conjuncts from phonetic keyboards** such as Avro: is `ম্প` lower Ma + Pa (current)
   or plain Ma + Pa? Default: unchanged until decided.
3. **Permanent web address.** GitHub Pages is decided for now
   (`rinatmalik.github.io/Gaaner-Sathi`). Later: point a subdomain such as
   `gaanersathi.rinatmalik.com` (one DNS record at Hostinger) or a dedicated domain at
   it. Settle it before Phase 1 ends: saved songs belong to the web address, so moving
   later means everyone exports and re-imports.
4. **Free, paid or donations?** Only matters if the app ever goes to app stores
   (parked). No licence for now.
5. **Sound settings: fold away, or always shown?** (Rinat, after trying
   https://rinatmalik.github.io/Gaaner-Sathi/new/ on a phone and a laptop.) Default until
   answered: they fold away, folded at first on phones and open on laptops. Blocks
   PH0-05, because the new app should take over the main address with the layout Rinat
   chose.

## Work log

*Copy the template for every meaningful work session; newest at the top. Test
statements must name the exact command, result, and environment — "tests pass"
is not sufficient. When this grows long, keep only the last few entries here and
move older ones into a `HISTORY.md` you create then, so this file stays lean.*


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

### 2026-10-10 01:05 BST — Claude (Opus 5.5) — roadmap and hosting decisions

- **Goal:** record Rinat's answers (GitHub Pages, keep every feature) and bring pitch
  feedback and the rewaz routine back into the plan; answer whether the Bengali folder
  name causes problems and why the TypeScript port was needed.
- **Inspected:** this session's tool runs for any path trouble (none: git, Node 24, npm,
  TypeScript 7, Vite, Vitest, Git Bash, PowerShell and CI all worked with the Bengali
  path); a web search on Android builds and non-ASCII paths (community reports of the
  Android Gradle plugin's "Your project path contains non-ASCII characters" error,
  still seen with plugin 8.2.2, and the `android.overridePathCheck=true` override).
- **Changed:** `docs/ROADMAP.md` (Phase 2 restored: 1. pitch feedback, 2. daily rewaz
  routine and practice log, with the kickoff's design notes and done criteria; recorded
  takes marked optional; Phase 0 deploy on GitHub Pages; ASCII-path note for a future
  Android build); this file (direction, roadmap summary, microphone privacy invariant,
  decisions, open questions 3, 5, 6, PH0-05, path gotcha, current state);
  `SECURITY.md` (microphone line).
- **Tests / verification:** documentation only; no code changed, so no test run.
- **Decisions made:** see Decisions log (the last three 2026-10-10 rows).
- **Risks or disagreements:** Rinat questioned the TypeScript port; Claude recommends
  continuing it and holds PH0-03 until Rinat answers (Open question 5), to avoid
  rework.
- **Next handoff:** Open questions 5 and 6, then PH0-03.

### 2026-10-10 00:40 BST — Claude (Opus 5.5) — PH0-02 (and Rinat's setup answers)

- **Goal:** apply Rinat's answers (decisions, a clean folder, a lighter plan); port the
  pure core to TypeScript with the reference suites carried over one-for-one.
- **Inspected:** the Node upgrade (node 24.20.0; npm still 9.8.1, from an old global
  copy in `%APPDATA%\npm`, because the upgrade left Program Files' npm at 9.8.0); every
  invisible or look-alike character in the prototype's parser and tests, by code point
  (only the ZWNJ/ZWJ/BOM set and one ZWNJ in a parser test case).
- **Changed:**
  - `4d21c9c`: removed `bootstrap.bat`, `CHANGELOG.md`, `LICENSE`, `.env.example`, the
    empty `.agents/`, `reference/tests/README.md` (folded into `reference/README.md`) and
    unused config sections; ADR-001 revised (no React, Playwright or IndexedDB); roadmap
    trimmed to port and publish, the rest parked; this file, CLAUDE.md, AGENTS.md and
    SECURITY.md updated for the answers.
  - `00e5768`, `7e7de7a`: `package.json` (typescript 7.0.2, vite 8.3.4, vitest 5.0.3,
    exact; no runtime dependencies), `tsconfig.json`, `tsconfig.core.json` (no DOM
    library for `src/core`, `src/audio/dsp`), `vitest.config.ts`; `src/core/notation`
    (parse, edit, check), `src/core/taal` (taals, rhythm), `src/core/exercises` (specs
    generated byte-for-byte from the reference generator by a one-off script, the
    generator, the 13-item list), `src/core/song` (model, file),
    `src/audio/dsp/ksPluck.ts`. One deliberate change from the prototype: a taal name
    inherited from Object (`constructor`, `toString`…) or a non-string now normalises
    to Dadra; the prototype accepted it and then crashed on play. `00e5768` also adds
    `reference/tests/package.json` (CommonJS) and ignores `.vitest/`.
  - `8b5b933`: `tests/differential` (port versus the prototype's code, cut out of the
    HTML) and a CI core job.
  - This entry's commit: `docs/NOTATION.md` (BOM line), `docs/PARITY.md` (22 rows →
    Core), this file.
- **Tests / verification** (Git Bash, Node v24.20.0, npm 9.8.1, Windows 10):
  - `npm run typecheck` → exit 0. A probe file in `src/core` using `document`, `window`
    and `console` made `npx tsc -p tsconfig.core.json` fail (TS2584, TS2304; exit 1) and
    passed the full config; probe removed.
  - `npm test` → 11 files, 112 passed, 0 failed, 8.1 s: ported parser 31, checker 11,
    join-split 10, rhythm 12, tanpura 5 + 5 added, exercises 14 + 2 added;
    differential 13; unit 9. Each commit checked alone with the rest stashed:
    `00e5768` → typecheck 0, 52 passed, reference suites green; `7e7de7a` → typecheck 0,
    99 passed.
  - Mutation check: dropping `~` from the holds failed all 4 notation differential
    tests (the ported reference suites alone missed it); changing a tabla-fill
    velocity (0.3 → 0.31) and the string's DC blocker (0.995 → 0.9951) each failed one
    differential test. Files restored byte-identical (`cmp`).
  - Tanpura, 100 seeded plucks: worst pitch error 0.054 cents; −16.2 dB at 1.5 s
    (−18.6…−14.5) and −33.0 dB at 3.5 s (−37.2…−30.1) relative to the attack, matching
    ENGINE.md. A 504-beat song: 31 parse-and-check rounds in 38 ms (about 1.2 ms each).
  - `npm run test:reference` failed once after `"type": "module"` was added (`require
    is not defined in ES module scope`); after `reference/tests/package.json`: parser
    31/0, checker 11/0, join-split 10/0, rhythm 12/0, tanpura 5/0, exercises 12 valid.
  - `git push origin main` → `4da4f8d..8b5b933`. CI run `38005291130`: Core job (npm ci,
    typecheck, npm test) success; reference job success. This also proves the npm 9
    lockfile installs on Linux.
- **Decisions made:** see Decisions log (2026-10-10 rows).
- **Risks or disagreements:** the lighter stack and trimmed roadmap are Claude's
  proposals on Rinat's direction; Rinat may veto. The prototype treats a BOM inside a
  line as a space (JavaScript counts U+FEFF as whitespace), not as "ignored" as
  NOTATION.md said; kept for parity, doc corrected. No screen exists yet, so nothing is
  "done" in the app sense.
- **Next handoff:** PH0-03, the audio engine. Rinat's answers to Open questions 3
  (hosting) and 5 (features to drop) are needed before the deploy and the interface.

### 2026-10-09 23:45 BST — Claude (Opus 5.5) — PH0-01

- **Goal:** take over from the handover pack: read it, set up the repo on `main`, merge
  everything into the co-working framework, delete `handover/`, report conflicts.
- **Inspected:** `handover/KICKOFF.md`, `README.md`, `docs/NOTATION.md`, `ENGINE.md`,
  `DATA.md`; all of `reference/gaaner-sathi.html` (2,324 lines); `reference/tests/*`;
  the framework files; the GitHub repo (one commit `4dfc1e2`: GPL-3.0 `LICENSE`, a
  two-line `README.md`); the local toolchain (Node 20.5.1, npm 9.8.1, git 2.53).
- **Changed:** `git init -b main` on top of `origin/main`; commit `e0ea8d8` keeps the
  framework and handover as received. Then: specs moved to `docs/`, prototype and
  suites to `reference/` (`git mv`; `run-all.sh` marked executable); kickoff merged
  into this file, `docs/ROADMAP.md` (phases, done criteria, Phase 2 specs) and
  `docs/PARITY.md` (60-odd features traced through the prototype's code); new
  `docs/adr/ADR-001-stack.md`, `reference/README.md`, `CHANGELOG.md`, public
  `README.md`, `.github/workflows/ci.yml`; `CLAUDE.md`, `AGENTS.md`, `SECURITY.md`
  filled in; `.gitignore` trimmed to this stack; `.env.example` emptied (no keys);
  `handover/` removed.
- **Tests / verification:** `bash reference/tests/run-all.sh` (Git Bash, Node v20.5.1,
  Windows 10), run in `handover/reference/tests` before any change and again from
  `reference/tests` after the move, both times: parser 31 passed 0 failed, checker
  11/0, join-split 10/0, rhythm 12/0, tanpura 5/0, exercises 12 valid 0 failed,
  exit 0. Checked with node: `reference/exercises.json` equals the generator's
  output and the first 12 exercises embedded in the HTML (the 13th, the Sa Re Ga
  typing example, exists only in the HTML). `git diff -M --summary e0ea8d8 c684d36`:
  every moved spec, prototype and suite file is a 100% rename (unchanged).
  `git push origin main` → `4dfc1e2..c0b057c`. GitHub Actions run `38001060696`
  (`.github/workflows/ci.yml`, ubuntu-latest, Node 24) on `c0b057c`: completed,
  success, every step including `bash reference/tests/run-all.sh`.
- **Decisions made:** see Decisions log (2026-10-09 rows).
- **Risks or disagreements:** conflicts between the kickoff and the framework are
  listed in Open questions 5 and 8–12. The machine's Node 20.5.1 blocks the planned
  toolchain.
- **Next handoff:** PH0-02, the core port, once Node 24 is available (Open question 8).
