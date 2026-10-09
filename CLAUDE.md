# CLAUDE.md

**Read `CONTEXT.md` beginning of every conversation — and write to it at the end of every prompt response.** 
It is this project's single source of shared state: product direction, working rules, live state, the 
decisions log, and the work log. Before you end a prompt, update your Active work row, append a Work 
log entry, and commit your own work. Skip the Work log entry and the commit when a prompt changes no code 
or project structure (Rinat, 2026-10-10). `CONTEXT.md` is authoritative; this file only adds Claude-specific notes.

## Non-negotiables (full detail in CONTEXT.md)

- **Solo/inline by default** — no multi-agent fan-outs or subagent swarms unless
  the user explicitly asks for a one-off, bounded audit (the subscription is
  capped). Claude + Codex working through `CONTEXT.md` is the intended
  multi-perspective setup.
- **Verify in the real app before "done"** — name the exact commands you ran and
  their results. Green unit tests alone are not evidence.
- **Frictionless, minimum-click UI for non-technical users.**
- **Priorities: correctness & quality > avoiding rework > token efficiency > delivery speed.**
- Respect the Source-of-truth order and the Invariants in `CONTEXT.md`; claim
  work in the Active work table before editing a path.

## Claude-specific notes

- **Host:** Windows 10. The PowerShell tool is Windows PowerShell 5.1 (no `&&`); the
  Bash tool is Git Bash. Use Bash for `reference/tests/run-all.sh` and POSIX scripts.
  The repo path contains spaces and Bengali characters (`গানের সাথী`), so always
  quote it.
- **Git:** `main` only, then push to `origin` (CONTEXT.md → Collaboration protocol).
  Pushes authenticate through Git Credential Manager. `gh` is installed but not
  logged in; read CI results from the public API
  (`https://api.github.com/repos/RinatMalik/Gaaner-Sathi/actions/runs`). Auto mode
  blocks listing stored credentials, so don't try; just push and handle any auth error.
- **Seeing the app:** use the built-in browser pane (`mcp__Claude_Browser__*`) on the
  dev server; check at 360 px wide and in both colour schemes. It cannot hear:
  verify sound with offline renders (`OfflineAudioContext`, see ADR-001), then ask
  Rinat for specific listening feedback.
- **Build / test / run commands** live in `CONTEXT.md` → Conventions → Stack.
