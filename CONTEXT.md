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
- **Current task:** PH0-02, the TypeScript core port with the reference suites
  carried over one-for-one (Claude, in progress).
- **Next single action:** finish PH0-02; then PH0-03, the audio engine.
- **Last known-good commit:** `c0b057c` (reference suites green locally and in CI run
  `38001060696`).
- **How to run it now:** the prototype: open `reference/gaaner-sathi.html` in a
  browser. Its tests: `bash reference/tests/run-all.sh`. The new app has no screen yet.
- **Blockers:** none for the port. PH0-05 (a live deploy) waits on Open question 3.
- **Uncommitted work:** Claude's PH0-02, in progress.

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
that works offline and installs on a phone, then publish it. **Basic features, usable
straightaway with no tutorial or learning curve; it must not grow into a massive
thing** (Rinat, 2026-10-10). North-star flow: open the app (it opens on an exercise,
ready to play) → press play and sing → pick or type in your own song → loop the hard
lines.

*Target user:* Rinat, and singers like Rinat: read swaralipi and sing Bengali songs,
not technical, practise on a phone or a laptop, often with hands busy. Would they find
it obvious with no manual?

*Non-goals (for now):* anything beyond the prototype's features; accounts and sync; a
server of our own; app-store apps; pitch feedback, recorded samples, ornaments,
practice routines and logs (all parked in `docs/ROADMAP.md`, each only with Rinat's
go-ahead); a UI framework or other runtime dependencies; sampling the Casio's
built-in voices (never).

*Roadmap at a glance* (full detail and done criteria: `docs/ROADMAP.md`):

| Phase | What | Done when |
|---|---|---|
| **0 ◀ now** | Port: TypeScript core with the reference suites; audio engine and interface to parity (same capabilities, simpler presentation) | every reference test passes against the new core; the exercises check clean; every `docs/PARITY.md` item works; a deploy from `main` is live |
| 1 | Publish: offline and installable, songs saved in the browser, import/export, opens on an exercise, privacy note, per-song sound settings | a public URL; Lighthouse PWA and accessibility pass; works offline; Rinat has practised a full song on phone and laptop |
| Parked | Pitch feedback, recorded instruments, ornaments, riyaz routine and log, error reporting, accounts, native apps, smaller extras | only if Rinat asks |

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
  chooses to export. No telemetry.
- **Never lose a song.** Saves are debounced but flushed when the page is hidden or
  another song opens; imports always get new ids and never overwrite; deleting needs a
  confirmation; built-in exercises are read-only (copy one to edit it).
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
  Vitest, no UI framework, Node 24 LTS. Being scaffolded in PH0-02. Today:
  - Reference suites on the prototype: `bash reference/tests/run-all.sh` (Node 18+,
    nothing to install). Green means parser 31, checker 11, join-split 10, rhythm 12,
    tanpura 5 passed and 12 exercises valid.
  - Prototype: open `reference/gaaner-sathi.html` in a browser.
  - CI: `.github/workflows/ci.yml` runs on every push to `main`.
- **Environment gotchas:**
  - Windows: system git has `core.autocrlf=true` and `.gitattributes` normalises to LF
    in the repo, so "LF will be replaced by CRLF" warnings are expected noise; `.sh`
    files stay LF. OneDrive sync is paused while working on projects (ignore it).
  - The repo path contains spaces and Bengali characters: quote it, and suspect it
    if a tool fails oddly.
  - Node is 24.20.0. npm is 9.8.1: an old global copy in `%APPDATA%\npm` shadows Node
    24's own npm, which the upgrade did not install. It works; to update it:
    `npm install -g npm@latest`.
  - `run-all.sh` writes `reference/tests/.extracted/` (git-ignored).
  - `gh` is installed but not logged in; pushes go through Git Credential Manager.
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
- **`docs/adr/`** — architecture decision records (ADR-001: stack, revised 2026-10-10).
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
| PH0-02 | Claude | In progress | `src/core/`, `src/audio/dsp/`, `tests/`, `package.json`, configs, CI | All 69 reference tests and 12 exercises ported one-for-one and green; differential tests against the prototype; `src/core` type-checks with no DOM library; CI green | Core port |
| PH0-03 | — | Proposed | `src/audio/` | Offline-render measurements match ENGINE.md; timing as pure tests | Audio engine |
| PH0-04 | — | Proposed | `src/app/` | Every `docs/PARITY.md` item Done, checked in the browser at 360 px in both themes | Interface to parity, essentials up front |
| PH0-05 | — | Blocked | hosting, deploy workflow | A live URL deployed from `main` that opens on a phone | Waits on Open question 3 |

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
| 2026-10-10 | Roadmap trimmed: v1 is Phase 0 (port) and Phase 1 (publish); pitch feedback, recorded instruments, ornaments, riyaz routine and log, error reporting, accounts and native apps are parked ideas needing Rinat's go-ahead. | Claude, following Rinat's direction; `docs/ROADMAP.md`. Rinat can veto | Nothing lost: the kickoff's notes on parked ideas are kept. |

## Open questions

*Product or technical decisions that need the user eventually, but do not block
current work (unless marked). Defaults apply until answered.*

1. **Lower octave when the editor writes notation:** `.` before the note (current) or
   হসন্ত after it? Default: keep reading both, write `.`.
2. **Conjuncts from phonetic keyboards** such as Avro: is `ম্প` lower Ma + Pa (current)
   or plain Ma + Pa? Default: unchanged until decided.
3. **Hosting and web address** (blocks PH0-05). Rinat's first idea:
   `rinatmalik.com/gaanersathi` on Hostinger, with a worry about mixing it with the
   AI-strategist brand. Claude's recommendation: GitHub Pages now (free, deploys from
   `main` automatically, no new account, separate from rinatmalik.com); for a
   permanent address, point a subdomain such as `gaanersathi.rinatmalik.com` (one DNS
   record) or a dedicated domain at it, rather than a subfolder of the main site.
   Settle the permanent address before Phase 1: saved songs belong to the web address,
   so moving later means everyone exports and re-imports.
4. **Free, paid or donations?** Only matters if the app ever goes to app stores
   (parked). No licence for now.
5. **Prototype features to drop outright** rather than tuck away (for example the
   nine percussion layers, fills, the tempo trainer, call and response)? Default: keep
   them all, with only the essentials up front.

## Work log

*Copy the template for every meaningful work session; newest at the top. Test
statements must name the exact command, result, and environment — "tests pass"
is not sufficient. When this grows long, keep only the last few entries here and
move older ones into a `HISTORY.md` you create then, so this file stays lean.*


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
