# AGENTS.md

**Read `CONTEXT.md` once, at the start of each fresh session — not at the start of every prompt.**
On a follow-up prompt check only what changed (`git status --short`). A by-the-way question gets
a direct answer, with nothing written. When work, a decision or the project's state changes,
record the handover before ending the prompt (CONTEXT.md → How to use this file): a Work log
entry, a row in `docs/DECISIONS.md`, Current state or `docs/WAITING.md`, then commit your own
work, staging only the files you changed, and push (Rinat, 2026-11-15). `CONTEXT.md` is
authoritative; this file only adds notes for Codex and other LLMs.

## Notes for Codex and other LLMs

- **Windows 10 host:** run `reference/tests/run-all.sh` with bash (Git Bash or WSL), not cmd
  or PowerShell. Quote the repo path: it has spaces and Bengali characters.
- **Git:** `main` only; commit, then push to `origin`. Only one agent works on the repo at a
  time.
- **Seeing the app:** `npm run dev`, then check at 360 px wide in both colour schemes.
  Without a visible browser, drive a muted headless Edge or Chrome through the DevTools
  protocol (CONTEXT.md → Environment gotchas). Nobody can hear it: verify sound by
  measurement, then ask Rinat specific listening questions.
