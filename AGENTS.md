# AGENTS.md

**Read `CONTEXT.md` beginning of every conversation — and write to it at the end of every prompt response.**
It is this project's single source of shared state: product direction, working rules, live
state, the decisions in force and the newest work log. Before you end a prompt, update your
Active work row, append a Work log entry, and commit your own work, staging only the files you
changed. Skip the Work log entry and the commit when a prompt changes no code or project
structure (Rinat, 2026-10-10). `CONTEXT.md` is authoritative; this file only adds notes for
Codex and other LLMs.

## Notes for Codex and other LLMs

- **Windows 10 host:** run `reference/tests/run-all.sh` with bash (Git Bash or WSL), not cmd
  or PowerShell. Quote the repo path: it has spaces and Bengali characters.
- **Git:** `main` only; commit, then push to `origin`. Only one agent works on the repo at a
  time.
- **Seeing the app:** `npm run dev`, then check at 360 px wide in both colour schemes.
  Without a visible browser, drive a muted headless Edge or Chrome through the DevTools
  protocol (CONTEXT.md → Environment gotchas). Nobody can hear it: verify sound by
  measurement, then ask Rinat specific listening questions.
