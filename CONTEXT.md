# Gaaner Sathi (গানের সাথী) — CONTEXT

> The single shared brain for this project. Everything Claude, Codex, any LLM and 
> the user need to stay in sync lives here: product direction, working rules, live
> state, decisions, and the work log.
>
> **Last updated:** 2026-10-09 by Claude (Opus 5.5)

## How to use this file

**Every agent, every prompt:**

1. **Start by reading this file** — at minimum: Product direction, Universal
   working defaults, Invariants, Active work, and the newest Work log entries —
   before touching code or docs.
2. **End each response by writing to this file** — update your Active work row, 
   append a Work log entry (use the template at the bottom — exact commands and 
   results, not "tests pass"), and record any new user decisions in the Decisions log.
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

- **Current milestone:** Phase 0, foundation and port (Roadmap at a glance below).
- **Current task:** none in progress. PH0-01 (framework and repo setup) is done;
  PH0-02 (core port) waits on Node 24.
- **Next single action:** Rinat upgrades Node to 24 LTS on this machine (Open
  question 8); then Claude starts PH0-02, the TypeScript core port with the reference
  suites carried over one-for-one.
- **Last known-good commit:** `c0b057c` (reference suites green locally and in CI run
  `38001060696`).
- **How to run it now:** the prototype: open `reference/gaaner-sathi.html` in a
  browser. Its tests: `bash reference/tests/run-all.sh`. The new app does not exist yet.
- **Blockers:** Node 20.5.1 here is too old for the chosen toolchain (Vitest 5 needs
  ≥ 22.12, Vite 8 needs ≥ 20.19). Hosting for the Phase 0 deploy needs Rinat's choice.
- **Uncommitted work:** none.

## Product direction — what this is meant to be now

Gaaner Sathi (গানের সাথী, "singing companion") is a practice companion for singers who
learn Bengali songs from swaralipi (akarmatrik notation). You type a song's notation
once; it plays the melody on harmonium as a pitch guide, with tabla, dholak or drums
and a tanpura or harmonium drone, all on one clock so the rhythm can never drift from
the melody, and it highlights the beat you are on with the lyric underneath. It exists
because Rinat practises from handwritten swaralipi diaries: playing them on a Casio
CT-X3000 (harmonium tone, rhythm running) meant watching which keys to press instead
of singing. The actual melody notes, rather than a full backing track, tell the voice
what to match. A working single-file prototype exists (`reference/gaaner-sathi.html`).
The job now: a published web app (installable, works offline) at parity with the
prototype, then the practice features Rinat asked for, then iOS and Android apps — the
best practice companion for singers who learn from swaralipi. North-star flow: open
the app → pick a song (or type it in from the diary) → press play → sing with the
guide, the rhythm and the highlight, looping the hard lines.

*Target user:* Rinat, and singers like Rinat: read swaralipi and sing Bengali songs,
not technical, practise on a phone or a laptop, often with hands busy. Would they find
it obvious with no manual?

*Non-goals (for now):* new features before parity with the prototype; accounts and
sync (Phase 3, only if Rinat wants it); native apps (Phase 4); a server of our own
(v1 is static); recorded samples, ornaments and routines (Phase 2, in order); a
Bengali interface (later, but i18n-ready from day one); sampling the Casio's built-in
voices (never).

*Roadmap at a glance* (full detail and done criteria: `docs/ROADMAP.md`):

| Phase | What | Done when |
|---|---|---|
| **0 ◀ now** | Foundation and port: repo, CI, docs, ADR-001; TypeScript core with the reference suites; audio engine and UI to parity | every reference test passes against the new core; the exercises check clean; every `docs/PARITY.md` item works in the new app; a deploy is live |
| 1 | Publish the web app: PWA offline and installable, IndexedDB, import/export, first-run on an exercise, privacy note, error reporting with no song content, per-song sound settings | a public URL; Lighthouse PWA and accessibility pass; works offline; Rinat has practised a full song on phone and laptop |
| 2 | Practice features, in order: mic pitch feedback; recorded instruments; ornaments; riyaz routine and practice log | per item, see ROADMAP |
| 3 | Optional accounts and sync | only if Rinat wants it; ask first |
| 4 | Capacitor iOS and Android apps | ask before creating developer accounts |

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

- **Build proactively.** For substantial work, go ahead and build: Rinat does not want
  plans to approve first, and likes seeing finished, working steps. Stop and ask only
  for: anything irreversible; anything that costs money or creates accounts (domains,
  hosting, app stores, paid APIs, sample libraries); the decisions in Open questions
  marked **Ask Rinat**; Bengali wording you are not sure of.
- **Low-maintenance, set-and-forget choices:** static hosting, no server to run for v1,
  automatic deploys from `main`, few dependencies.
- **Nobody on the build side can hear the app.** Verify every audio change by
  measurement: offline renders in headless Chromium for loudness, autocorrelation for
  tuning, decay curves, timing logic as pure tests. Then ask Rinat for specific
  listening feedback ("is the tanpura too buzzy or too plucked?").
- **At each milestone,** tell Rinat what changed, what you tested and what to try,
  with a link that opens on a phone. The same note goes in `CHANGELOG.md`.
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
- [ ] Audio changes come with a measurement test.
- [ ] Works offline, in both themes, at 360 px wide with no sideways scrolling (once
      the app exists).
- [ ] The stated **Invariants** still hold (none weakened without a recorded decision).
- [ ] Your own changes are **committed** (green, or `wip:` with what's unfinished noted)
      and pushed to `main`.
- [ ] User-visible change: a short `CHANGELOG.md` entry with a "what to try" note.
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

- **Local-first privacy.** No account needed. Nothing leaves the device unless the user
  chooses to export (or, later, to sync). Microphone audio is processed on the device
  and never uploaded. No telemetry; error reports never contain song content.
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
- **Licences.** Every dependency and asset is compatible with the repo's GPL-3.0
  licence and tracked; never sample the Casio CT-X3000's built-in voices.

## Secrets & sensitive data

- **No secret in code, config, or the working tree.** Keys live in `.env`
  (git-ignored) or the OS credential store — never hard-coded, never committed.
  Paste real values into `.env`; only the empty `.env.example` is tracked.
- **Don't surface raw secrets.** Wire them in at runtime; never paste real key
  values into this file, prompts, or the Work log.
- **Sensitive / regulated data stays on the machine.** Prefer local inference for
  it; never send it to a cloud model or third-party API.
- *This project* uses no keys at all; songs, logs and recordings are private user
  content (see `SECURITY.md` → This project).
- Fuller model (fail-closed, spend caps, leak response) → `SECURITY.md`.

## Conventions

- **Copy:** UK English, sentence case ("practise" the verb, "practice" the noun,
  "colour", "analyse"). Bengali must be correct; ask Rinat when unsure. The name is
  always **Gaaner Sathi** in Latin letters, with **গানের সাথী** alongside in the app
  and the store listings, so people find it whichever script they search in.
- **Theme:** theme-aware tokens; never hardcode light/dark colours (no raw
  rgba white/black for borders or fills). Accent: brass `#c4952b` (light) / `#d3a843`
  (dark) on rosewood `#3e1f15`; the prototype's `:root` holds the full token set for
  both themes.
- **Commits:** small — one behavioural idea plus its tests per commit. Prefixes:
  `feat:` `fix:` `test:` `docs:` `refactor:` `ci:` `chore:` `wip:`.
- **Stack / commands:** ADR-001: TypeScript (strict), React, Vite, Vitest, Playwright,
  Node 24 LTS. Not scaffolded yet. Today:
  - Reference suites on the prototype: `bash reference/tests/run-all.sh` (Node 18+,
    nothing to install). Green means parser 31, checker 11, join-split 10, rhythm 12,
    tanpura 5 passed and 12 exercises valid.
  - Prototype: open `reference/gaaner-sathi.html` in a browser.
  - CI: `.github/workflows/ci.yml` runs the reference suites on Node 24 on every push
    to `main`.
- **Environment gotchas:**
  - The repo lives under OneDrive on Windows. System git has `core.autocrlf=true` and
    `.gitattributes` normalises to LF in the repo, so "LF will be replaced by CRLF"
    warnings are expected noise; `.sh` files stay LF. Once `node_modules` exists,
    OneDrive will try to sync it (see Open questions).
  - The repo path contains spaces and Bengali characters: quote it, and suspect it
    if a tool fails oddly.
  - Node here is 20.5.1 (end of life since April 2026): too old for Vite 8 and
    Vitest 5. Upgrade to Node 24 LTS.
  - `run-all.sh` writes `reference/tests/.extracted/` (git-ignored).
  - `gh` is installed but not logged in; pushes go through Git Credential Manager.
- Keep CLAUDE.md and AGENTS.md aligned so the shared-branch rules survive future
  sessions.

## Reference docs (read on demand)

*This file is the hot path — read every prompt, kept lean. Heavier, stable
reference lives in sibling docs; open one only when the task touches it.*

- **`SECURITY.md`** — secret handling, fail-closed defaults, spend caps, leak response;
  this project's privacy and licence rules.
- **`docs/ROADMAP.md`** — Phases 0–4 in full with done criteria, and the Phase 2
  feature specs (pitch feedback, samples, ornaments, riyaz).
- **`docs/PARITY.md`** — the Phase 0 side-by-side checklist: every prototype feature.
- **`docs/NOTATION.md`** — notation spec: beats, notes, octaves, edit operations, checker.
- **`docs/ENGINE.md`** — audio and timing engine: scheduler, taals, rhythm, harmonium,
  tanpura, and how to verify sound without ears.
- **`docs/DATA.md`** — song model, file format, settings, storage.
- **`docs/adr/`** — architecture decision records (ADR-001: stack).
- **`reference/`** — the prototype, its 12 exercises and its test suites
  (`reference/README.md`).
- **`CHANGELOG.md`** — user-facing: what changed and what to try.

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
| PH0-01 | Claude | Done | `CONTEXT.md`, `CLAUDE.md`, `AGENTS.md`, `SECURITY.md`, `README.md`, `CHANGELOG.md`, `docs/`, `reference/`, `.github/workflows/`, `.gitignore`, `.env.example`; remove `handover/` | Handover fully merged and `handover/` removed; reference suites green locally and in CI run `38001060696`; pushed to `main` (`c0b057c`) | Framework and repo setup |
| PH0-02 | Claude | Blocked | `src/core/`, `tests/`, `package.json`, configs | All 69 reference tests and 12 exercises ported one-for-one and green; differential tests against the prototype; core type-checks with no DOM library | Core port. Blocked on Node 24 |
| PH0-03 | — | Proposed | `src/audio/` | Offline-render measurements match ENGINE.md; timing tables as pure tests | Audio engine |
| PH0-04 | — | Proposed | `src/app/` | Every `docs/PARITY.md` item Done, checked in the browser at 360 px in both themes | UI to parity |
| PH0-05 | — | Blocked | hosting, deploy workflow | A live URL deployed from `main` that opens on a phone | Needs Rinat's hosting choice |

## Decisions log

*Append-only. Never rewrite history. Record the authority / evidence and the
consequence.*

| Date | Decision | Authority / evidence | Consequence |
|---|---|---|---|
| 2026-10-09 | Repo is `https://github.com/RinatMalik/Gaaner-Sathi`; all work on `main`, pushed to `origin`; no other branches; only one LLM works on the project at a time. | Rinat, chat 2026-10-09 | Supersedes the kickoff's "a preview deploy per branch": the deploy from `main` is the preview. Parallel-work provisions stay unused. |
| 2026-10-09 | Handover pack merged into the framework: kickoff → this file, `docs/ROADMAP.md`, `docs/PARITY.md`; specs → `docs/`; prototype and suites → `reference/`; `handover/` deleted. | Rinat, chat 2026-10-09 | The original pack stays in git history at `e0ea8d8`. This file is the hot path; `docs/` is cold. |
| 2026-10-09 | Stack and architecture baseline: TypeScript, React, Vite, Vitest, Playwright, Node 24 LTS; one package with a DOM-free core. | Kickoff §5 defaults; `docs/adr/ADR-001-stack.md` | Node 24 needed on every dev machine; core tests run in plain Node. |
| 2026-10-09 | Decision records: every decision gets a row here; one with a real architectural trade-off also gets a short ADR in `docs/adr/`, linked from its row. | Claude, reconciling kickoff §2 ("record each real decision as a short ADR") with this log. Provisional: see Open questions | One index of decisions, with depth where it is needed. |
| 2026-10-09 | `CHANGELOG.md` holds the user-facing "what changed / what to try" notes; the Work log stays agent-facing. | Kickoff §8 (definition of done). Provisional: see Open questions | Every user-visible change gets both. |
| 2026-10-09 | Licence GPL-3.0. | Rinat, when creating the repo (initial commit `4dfc1e2`) | Every dependency and asset must be GPL-3.0-compatible. |

## Open questions

*Product or technical decisions that need the user eventually, but do not block
current work (unless marked).*

**Ask Rinat** (from the kickoff; the default applies until answered):
1. **Lower octave when the editor writes notation:** `.` before the note (current) or
   হসন্ত after it? Default: keep reading both, write `.`.
2. **Conjuncts from phonetic keyboards** such as Avro: is `ম্প` lower Ma + Pa (current)
   or plain Ma + Pa? Default: unchanged until decided.
3. **Ornament conventions** from the diaries (photos), needed before roadmap item 2.3.
4. **Recording source and budget** for real instrument samples, needed before item 2.2.
5. **Domain:** ask before buying one. Hosting default per kickoff: Cloudflare Pages
   (or Netlify); either needs a new account, so ask. GitHub Pages deploys from `main`
   with no new account. Also offer: call the song library "খাতা" (khata, notebook),
   after the diaries.
6. **Accounts in v1?** Default: no; local-first with export.
7. **Free, paid or donations?** Only matters before the app stores. The repo is GPL-3.0,
   which allows charging but also lets anyone share the code and builds.

**Raised in setup (2026-10-09):**
8. **Node 24 LTS on this machine** (blocks PH0-02): e.g. `winget install OpenJS.NodeJS.LTS`.
   Alternative: Claude uses a temporary Node 24 in its scratch folder for its own
   builds, with Rinat's go-ahead.
9. **Hosting for the Phase 0 deploy** (blocks PH0-05): GitHub Pages (no new account)
   or Cloudflare Pages (new account)?
10. **OneDrive:** keep the repo under OneDrive (`node_modules`, roughly 200 MB of small
    files, will sync) or move it out, with GitHub as the backup?
11. **Framework wording:** "write to CONTEXT.md at the end of every prompt" (CLAUDE.md,
    AGENTS.md, this file) versus "don't fabricate empty or noisy commits on
    analysis-only prompts": should a question-only prompt skip the Work log entry, or
    log it and commit it as `docs:`?
12. **Confirm the provisional decisions** above (ADR plus log row; CHANGELOG plus Work
    log), and whether `bootstrap.bat` (the template's scaffolder, which excludes
    itself from copies) should stay in this repo.

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
