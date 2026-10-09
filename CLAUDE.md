# CLAUDE.md

**Read `CONTEXT.md` beginning of every conversation — and write to it at the end of every prompt response.** 
It is this project's single source of shared state: product direction, working rules, live state, the 
decisions log, and the work log. Before you end a prompt, update your Active work row, append a Work 
log entry, and commit your own work. `CONTEXT.md`is authoritative; this file only adds Claude-specific notes.

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

- ⟨Skills / tools this project uses, harness caveats, browser-pane limits,
  MCP servers, etc. — fill in per project.⟩
- ⟨Build / test / run commands live in `CONTEXT.md` → Conventions → Stack.⟩
