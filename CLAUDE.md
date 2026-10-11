# CLAUDE.md

**Read `CONTEXT.md` beginning of every conversation — and write to it at the end of every prompt response.**
It is this project's single source of shared state: product direction, working rules, live state, the
decisions in force and the newest work log. Before you end a prompt, update your Active work row, append a
Work log entry, and commit your own work. Skip the Work log entry and the commit when a prompt changes no code
or project structure (Rinat, 2026-10-10). `CONTEXT.md` is authoritative; this file only adds Claude-specific notes.

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
