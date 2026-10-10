# AGENTS.md

**Read `CONTEXT.md` beginning of every conversation — and write to it at the end of every prompt response.** 
It is this project's single source of shared state: product direction, working rules, live
state, the decisions log, and the work log. Before you end a prompt, update your Active 
work row, append a Work log entry, and commit your own work — staging only the files you 
changed (never everything while other LLMs have work in flight). Skip the Work log entry and 
the commit when a prompt changes no code or project structure (Rinat, 2026-10-10). 

`CONTEXT.md` is authoritative; this file only adds Codex-specific or other LLM specific notes.

## Non-negotiables (full detail in CONTEXT.md)

- **Solo/inline by default** — no multi-agent fan-outs or subagent swarms unless
  the user explicitly asks for a one-off, bounded audit (the subscription is
  capped). Codex + Claude + Local LLMs working through `CONTEXT.md` is the intended
  multi-perspective setup.
- **Verify in the real app before "done"** — name the exact commands you ran and
  their results. Green unit tests alone are not evidence.
- **Frictionless, minimum-click UI for non-technical users.**
- **Priorities: correctness & quality > avoiding rework > token efficiency > delivery speed.**
- Respect the Source-of-truth order and the Invariants in `CONTEXT.md`; claim
  work in the Active work table before editing a path.

## Codex-specific notes

- **Host:** Windows 10. Run `reference/tests/run-all.sh` with bash (Git Bash or WSL),
  not cmd or PowerShell. The repo path contains spaces and Bengali characters
  (`গানের সাথী`), so always quote it.
- **Git:** `main` only; commit, then push to `origin` (CONTEXT.md → Collaboration
  protocol). Only one agent works on the repo at a time.
- **Seeing the app:** `npm run dev`, then check at 360 px wide in both colour schemes.
  Without a visible browser, drive a muted headless Edge or Chrome through the DevTools
  protocol (CONTEXT.md → Environment gotchas). Nobody can hear it: verify sound by
  measurement, then ask Rinat for specific listening feedback.
- **Build / test / run commands** live in `CONTEXT.md` → Conventions → Stack.
