# CLAUDE.md

**Read `CONTEXT.md` once, at the start of each fresh session — not at the start of every prompt.**
On a follow-up prompt check only what changed (`git status --short`). A by-the-way question gets a
direct answer, with nothing written. When work, a decision or the project's state changes, record
the handover before ending the prompt (CONTEXT.md → How to use this file): a Work log entry, a row
in `docs/DECISIONS.md`, Current state or `docs/WAITING.md`, then commit your own files and push
(Rinat, 2026-11-15). `CONTEXT.md` is authoritative; this file only adds Claude-specific notes.

## Claude-specific notes

- **Tools on this Windows 10 host:** the PowerShell tool is Windows PowerShell 5.1 (no `&&`);
  the Bash tool is Git Bash (use it for `reference/tests/run-all.sh` and POSIX scripts).
  Quote the repo path: it has spaces and Bengali characters.
- **Git:** push `main` to `origin`; pushes authenticate through Git Credential Manager.
  Auto mode blocks listing stored credentials, so don't try; just push and handle any auth
  error. `gh` is not logged in: read CI from the public API (CONTEXT.md → Commands).
- **Seeing the app:** the browser pane (`mcp__Claude_Browser__*`) on the dev server, at
  360 px wide and in both colour schemes. When the pane is hidden its page draws nothing:
  drive headless Edge through the DevTools protocol instead (CONTEXT.md → Environment
  gotchas). Neither can hear: verify sound by measurement, then ask Rinat specific
  listening questions.
