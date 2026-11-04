# AGENTS.md Evolution and Dual-File Architecture

> Created: 2026-11-04 | Commit: cbdbf37 | Branch: main

## The Two AGENTS.md Files

OpenCode loads AGENTS.md from **two locations**, and both are active simultaneously:

| File | Path | Role | Lines |
|---|---|---|---|
| **Global** | `~/.config/opencode/AGENTS.md` | Baseline protocol for all projects | ~294 |
| **Project** | `project_glasswing/AGENTS.md` | Extended protocol with Sequential Thinking | ~523 |

OpenCode auto-discovers both and watches for changes. The project-local file **extends** (not replaces) the global one. Having overlapping content is harmless — OpenCode merges them.

## How It Works

```
OpenCode startup
  ├─ Load ~/.config/opencode/AGENTS.md          (global baseline)
  └─ Load <repo>/AGENTS.md                       (project overlay)
     └─ Both are active instructions for every session
```

The global file (`~/.config/opencode/AGENTS.md`) is the "Reliable Coding Execution" template — checkpointing, recovery, output discipline. It was the original protocol covering Open Notebook + Serena + Steel (3 MCP servers).

The project file (`project_glasswing/AGENTS.md`) evolved from that baseline into a comprehensive 4-server protocol. It was rewritten in commit `d80ceb9` to merge the v2 protocol, then extended with Sequential Thinking in the current uncommitted diff.

## Git History of project_glasswing/AGENTS.md

| Commit | Message | What Changed |
|---|---|---|
| `(uncommitted)` | Sequential Thinking integration | Added 4th MCP server, Section 14, updated 9 sections |
| `3cdb22f` | improve(agents): add compaction-safe note capture protocol | Hardened capture triggers, added "Resume Here" template |
| `0f2f560` | Finalize AGENTS.md: neutralize remaining references | Cleaned up stale cross-references |
| `d80ceb9` | Rewrite AGENTS.md: v2 protocol merge | Full rewrite: Serena symbol-first, Steel scrape-first, Open Notebook search-first |
| `15f8bec` | agents.md updated to create notebook per project | Added per-project notebook creation protocol |
| `5615f4b` | agents file generated | Initial AGENTS.md generation |
| `5a36723` | Revert "Experimental changes to homepage." | Reverted homepage experiments |
| `a0b7737` | Experimental changes to homepage. | Brief homepage experiment (reverted) |

## The Current Uncommitted Diff

The working tree has **101 insertions, 24 deletions** relative to HEAD (`3cdb22f`). These changes integrate Sequential Thinking as the 4th MCP server:

### Sections Modified

1. **Header** — Title changed from "(Serena + Open Notebook + Steel)" to "(Serena + Open Notebook + Sequential Thinking + Steel)". Server count: 3 → 4.

2. **Core Principles** — Added principle #3 ("Reason structurally during complex tasks"). Renumbered existing principles 3-5 to 4-6.

3. **Section 1 (Which Server Owns What)** — Added "Working reasoning → Sequential Thinking (sessions)" row. Added two rules about Sequential Thinking being RAM not disk, and surviving compaction.

4. **Section 2 (Session Start)** — Added step 7: check `list_sessions` for active Sequential Thinking sessions before starting work. Renumbered steps 7-8 to 8-9.

5. **Section 3 (Retrieval Order)** — Added Step 2b: check for active Sequential Thinking sessions before Serena navigation.

6. **Section 7 (When to Capture)** — Restructured hard/soft triggers. Added trigger #3 for creating Sequential Thinking sessions on complex tasks. Session Closure Protocol now starts with "Finalize all active Sequential Thinking sessions."

7. **Section 9 (Data Handling)** — Extended rules to cover "every Sequential Thinking session step."

8. **Section 10 (Fallback)** — Added fallback behavior when Sequential Thinking is unavailable.

9. **New Section 14 (Structured Reasoning)** — Full guide: when to use, step kinds (evidence/decision/risk/next_action), workflow pattern, key rules (idempotent writes, provenance, supersedes), session lifecycle.

10. **Quick Checklist** — Added Sequential Thinking entries to Start, Explore, and Always lines.

### Why the Diff is Uncommitted

The user previously instructed "don't commit or push" for changes in this repo. The diff remains in the working tree.

## Global vs Project Divergence

The global file (`~/.config/opencode/AGENTS.md`) still references the **3-server** protocol (Serena + Open Notebook + Steel). It has **not** been updated with Sequential Thinking. The project file is the authoritative 4-server version.

This is intentional: the global file serves as a baseline for other projects that may not have Sequential Thinking configured. The project file extends it with the 4th server.

## Other AGENTS.md Files in the Environment

| Path | Purpose |
|---|---|
| `~/.config/opencode/AGENTS.md` | Global OpenCode baseline (3-server) |
| `project_glasswing/AGENTS.md` | Project protocol (4-server, with Sequential Thinking) |
| `graphify/AGENTS.md` | Separate project, independent protocol |
| `rea/AGENTS.md` | REA project protocol |
| `rea/website/AGENTS.md` | REA website protocol |
| `project_glasswing/stacks/panchangam/src/AGENTS.md` | Panchangam stack source (not loaded by OpenCode) |
| `project_glasswing-mcp-migration-20261030T184515/retired-opencode-live-tree/config/AGENTS.md` | Archived migration snapshot (not active) |

Only the first two are loaded by OpenCode during sessions in `project_glasswing`.

## How Sequential Thinking "Turned On"

The integration happened in three phases:

### Phase 1: Decision (earlier session)
- Researched Sequential Thinking MCP servers on GitHub.
- Selected `arben-adm/mcp-sequential-thinking` (Python, SQLite, ⭐959).
- Created decision note in Open Notebook: `note:0mo3x0gqj2wlwb0ebnij`.

### Phase 2: Protocol Update (this session, earlier)
- Rewrote `AGENTS.md` across 9 sections to integrate Sequential Thinking.
- Updated Serena `notebook-index` memory.

### Phase 3: Infrastructure (this session, now complete)
- Created `stacks/sequential-thinking-mcp/` with Dockerfile, compose.yaml, secrets.list.
- Built Docker image `glasswing/sequential-thinking-mcp:0.7.0`.
- Registered in `~/.config/opencode/opencode.json` as `"sequential-thinking"` on port 8004.
- Added to Homepage dashboard under "MCP Servers" section.
- Verified full tool workflow: create_session → add_step → read_session → finalize_session.
- Saved reference note in Open Notebook: `note:tl0sp26cp7r5p36gfdrv`.

## Summary

The AGENTS.md file is the **operating manual** for AI agents in this repository. It evolved from a generic checkpointing guide into a detailed 4-server protocol. The project-local copy is the authoritative version (523 lines, 4 MCP servers). The global copy remains a 3-server baseline for other projects. The current uncommitted diff adds Sequential Thinking as working memory (RAM) alongside Open Notebook as persistent memory (disk).
