# ⟨PROJECT NAME⟩ — CONTEXT

> The single shared brain for this project. Everything Claude, Codex, any LLM and 
> the user need to stay in sync lives here: product direction, working rules, live
> state, decisions, and the work log.
>
> **Last updated:** ⟨YYYY-MM-DD⟩ by ⟨agent / user⟩

<!--
================================================================================
STARTING A NEW PROJECT FROM THIS TEMPLATE  — delete this whole block once done.
================================================================================

FAST PATH — from the template folder, run:
     bootstrap.bat "C:\path\to\NewProject"
   It creates the folder, copies every template file in, fills the project name
   and today's date, makes .env from .env.example (ready for your keys), verifies
   .env is git-ignored, runs git init + first commit, and lists any placeholders
   left to fill. Add --force to scaffold into an existing non-empty folder. Then
   do steps 3–5. Prefer this over the manual steps below.

MANUAL PATH:

1. Copy the template FILES into your new project folder:
     CONTEXT.md, CLAUDE.md, AGENTS.md, SECURITY.md,
     .gitignore, .gitattributes, .editorconfig, .env.example
   Copy files, NOT a .git folder. (The template folder is deliberately NOT a git
   repo — see "Why the template isn't its own repo" below.)

2. Start a fresh, independent git repo IN THE NEW FOLDER, and make your working
   .env from the example:
     copy .env.example .env
     git init
     git add .
     git commit -m "chore: scaffold project from template"
   Creating the files before `git init` is fine and normal — git just starts
   tracking whatever is already sitting there. `.env` stays untracked (ignored);
   only the empty `.env.example` is committed, so a pasted key can't leak.

3. Fill in this file. Replace every ⟨angle-bracket⟩ placeholder; delete the
   italic instruction notes as you go. Day-one priorities: Product direction,
   Invariants, Conventions → Stack/commands, accent colour, environment gotchas.

4. Fill in the two agent files (usually one line of project-specific notes each):
   CLAUDE.md → Claude-specific tools/harness notes; AGENTS.md → Codex notes.

5. Trim .gitignore to the stacks you actually use, then delete this block.

WHY THE TEMPLATE ISN'T ITS OWN GIT REPO:
A folder is "the same project" to git only if it shares a .git/ directory. Never
copy a .git folder between projects — that is the one thing that would make git
treat every new project as the same repo. .gitignore and .gitattributes are just
plain text config; copying them is safe and does nothing until you run
`git init`. Each project gets its own `git init` and its own independent history.

HOW THIS FILE IS USED AFTER SETUP:
CLAUDE.md and AGENTS.md are thin pointers to this file; this file carries the
real content, read at the start of every prompt and updated at the end. Keep the
section order — agents rely on it.
================================================================================
-->

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

CLAUDE.md and AGENTS.md are thin pointers to this file. When anything there
conflicts with this file, **this file wins** — except a later explicit user
decision, which always wins (see Source-of-truth order).

## Current state

*The fast-orient snapshot — the first thing to read and the first thing to
update. Keep every line current; one or two lines each. (bootstrap.bat fills the
project name and date for you.)*

- **Current milestone:** ⟨⟩
- **Current task:** ⟨what's actively being worked on right now⟩
- **Next single action:** ⟨the very next concrete step⟩
- **Last known-good commit:** ⟨hash — or "none yet"⟩
- **How to run it now:** ⟨launch command / file / URL — see "Keep the app one click away"⟩
- **Blockers:** ⟨none / describe⟩
- **Uncommitted work:** ⟨none / whose + what⟩

## Product direction — what this is meant to be now

⟨One paragraph: what the product is, who it is for, and the current north-star
flow. Rewrite this whenever the direction changes — it is the first thing every
agent reads.⟩

*Target user:* ⟨one line — the specific non-technical persona this is for. Every
UI call is disciplined against it: would *they* find this obvious?⟩

*Non-goals (for now):* ⟨list what you are deliberately NOT building yet, so no
one drifts into it⟩

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

## Definition of done

*What every Active-work item's "Acceptance evidence" must satisfy before its
status becomes Done.*

- [ ] Behaviour exercised in the **real app / runtime**, not just unit tests.
- [ ] The exact command(s) run **and their results** are recorded in the Work log.
- [ ] The stated **Invariants** still hold (none weakened without a recorded decision).
- [ ] Your own changes are **committed** (green, or `wip:` with what's unfinished noted).
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

## Invariants — never weaken without a recorded decision

*Project-specific guarantees the product must always keep. Add your own; delete
the examples. To change one: record a user decision in the Decisions log first,
then implement.*

- ⟨e.g. Nothing writes to the user's files without an explicit user action.⟩
- ⟨e.g. Destructive actions stage first and stay reversible until an explicit commit.⟩
- ⟨e.g. Every capability fails closed, never open.⟩

## Secrets & sensitive data

- **No secret in code, config, or the working tree.** Keys live in `.env`
  (git-ignored) or the OS credential store — never hard-coded, never committed.
  Paste real values into `.env`; only the empty `.env.example` is tracked.
- **Don't surface raw secrets.** Wire them in at runtime; never paste real key
  values into this file, prompts, or the Work log.
- **Sensitive / regulated data stays on the machine.** Prefer local inference for
  it; never send it to a cloud model or third-party API.
- Fuller model (fail-closed, spend caps, leak response) → `SECURITY.md`.

## Conventions

- **Copy:** UK English, sentence case (⟨e.g. "analyse", never "analyze"⟩).
- **Theme:** theme-aware tokens; never hardcode light/dark colours (no raw
  rgba white/black for borders or fills). ⟨accent: #______⟩
- **Commits:** small — one behavioural idea plus its tests per commit.
- **Stack / commands:** ⟨fill in per project — language, framework, state,
  storage, and the exact build / test / run commands⟩.
- **Environment gotchas:** ⟨e.g. repo lives under OneDrive on Windows — watch
  CRLF/LF noise; redirect build caches out of OneDrive⟩.
- Keep CLAUDE.md and AGENTS.md aligned so the shared-branch rules survive future
  sessions.

## Reference docs (read on demand)

*This file is the hot path — read every prompt, kept lean. Heavier, stable
reference lives in sibling docs; open one only when the task touches it.*

- **`SECURITY.md`** — secret handling, fail-closed defaults, spend caps, leak response.
- ⟨add project-specific reference docs here as they appear, e.g. `ARCHITECTURE.md`⟩

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

## Active work

*The current slice(s) of work and who owns them. Under parallel work (opt-in),
claim a path here before editing it. Allowed statuses: Proposed, In progress,
Blocked, Review, Done, Superseded.*

| ID | Owner | Status | Scope / paths | Acceptance evidence | Notes |
|---|---|---|---|---|---|
| ⟨ID-001⟩ | ⟨Claude / Codex / User⟩ | Proposed | ⟨files⟩ | ⟨how "done" is proven⟩ | ⟨⟩ |
## Decisions log

*Append-only. Never rewrite history. Record the authority / evidence and the
consequence.*

| Date | Decision | Authority / evidence | Consequence |
|---|---|---|---|
| ⟨YYYY-MM-DD⟩ | ⟨what was decided⟩ | ⟨user request / commit / spec⟩ | ⟨what changes as a result⟩ |

## Open questions

*Product or technical decisions that need the user eventually, but do not block
current work.*

- ⟨question⟩

## Work log

*Copy the template for every meaningful work session; newest at the top. Test
statements must name the exact command, result, and environment — "tests pass"
is not sufficient. When this grows long, keep only the last few entries here and
move older ones into a `HISTORY.md` you create then, so this file stays lean.*


### ⟨YYYY-MM-DD HH:MM TZ⟩ — ⟨Agent⟩ — ⟨WORK-ID⟩

- **Goal:**
- **Inspected:**
- **Changed:**
- **Tests / verification:** ⟨exact commands + results + environment⟩
- **Decisions made:**
- **Risks or disagreements:**
- **Next handoff:**
