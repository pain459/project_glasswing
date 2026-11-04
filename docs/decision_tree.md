Date: 2026-11-04
Repo: project_glasswing     Branch: main     Commit: cbdbf37
Components: Serena, Open Notebook, Sequential Thinking, Steel, REA
Symbols: N/A (infrastructure protocol)
Keywords: decision tree, protocol flow, MCP servers, agent operating procedure, retrieval order, capture triggers, session lifecycle
Tags: #mcp-stack #decision-tree #protocol #reference #architecture
Status: active
Related: Decision - MCP Stack - Sequential Thinking Integration (note:0mo3x0gqj2wlwb0ebnij), Ref - Sequential Thinking MCP Setup (note:tl0sp26cp7r5p36gfdrv)

---

# MCP Stack Agent Decision Tree and Protocol Flow

This document captures the complete decision tree for how AI agents operate in this repository using four MCP servers: **Serena** (code intelligence), **Open Notebook** (persistent memory), **Sequential Thinking** (working memory), and **Steel** (browser access). It is derived from the local `AGENTS.md` at `/home/ravik/src_git/project_glasswing/AGENTS.md`.

## Server Roles

| Server | Config Key | Role | Analogy |
|---|---|---|---|
| **Serena** | `serena` | Code intelligence: symbol-level navigation, editing, diagnostics | Eyes & hands on the code |
| **Open Notebook** | `open-notebook` | Long-term persistent memory: session history, decisions, code maps, fixes | Disk |
| **Sequential Thinking** | `sequential-thinking` | Working memory: structured scratchpad, survives compaction | RAM |
| **Steel** | `steel` | Real browser access: scrape, navigate, interact, screenshot | Web browser |

## Core Principles

1. **Remember before you look.** Check Open Notebook before exploring code.
2. **Navigate by symbol, never by brute force.** Use Serena, never repository-wide grep.
3. **Reason structurally during complex tasks.** >3 connected steps across tools → Sequential Thinking session.
4. **Capture continuously.** Context compacts silently; write notes before heavy operations.
5. **Rich answers demand rich notes.** Decompose into focused micro-notes, never monolithic summaries.
6. **Write-then-verify every note.** Search by title after writing; retry once; fall back to local buffer.

---

## Decision Tree 1: Session Start Bootstrap

```
START
  │
  ├─→ Serena: initial_instructions → list_memories
  │     └─→ Onboarding exists? ─yes─→ read relevant memories
  │                           └─no──→ run onboarding (once), write_memory
  │
  ├─→ Open Notebook: list_notebooks
  │     └─→ Project notebook exists? ─yes─→ use it
  │                              └─no──→ create_notebook()
  │
  ├─→ Open Notebook: search for latest Session/Checkpoint/Run note
  │     └─→ Read Pending Items & Resume Here
  │
  ├─→ Open Notebook: search for Code Map notes on relevant components
  │
  ├─→ Sequential Thinking: list_sessions
  │     └─→ Active session exists? ─yes─→ read_session() to resume
  │
  ├─→ Fallback buffer: .agent-memory/pending-notes.md exists?
  │     └─→ yes → sync to Open Notebook, clear file
  │
  └─→ Report to user: what notes/memories found (or none)
```

---

## Decision Tree 2: Retrieval Order (Memory → Map → Symbols)

```
User asks about architecture, config, errors, code location, or past decisions
  │
  ├─→ STEP 1: Open Notebook search (dual-query)
  │     ├─→ Vector search (type:"vector", minimum_score:0.5)
  │     └─→ Text search (type:"text") for exact strings
  │     └─→ Results above 0.5?
  │         ├─→ YES → proceed to Step 2
  │         └─→ NO  → rephrase once with synonyms
  │                   └─→ still nothing? → "no stored notes matched"
  │
  ├─→ STEP 2: Code Map drift check
  │     ├─→ git rev-parse HEAD vs note Commit SHA
  │     │   ├─→ Same commit → 100% verified, use snippets directly
  │     │   └─→ Different → git diff --name-only <commit> HEAD -- <files>
  │     │       ├─→ Files unchanged → snippets still verified
  │     │       └─→ Files changed → snippets stale, re-explore via Serena
  │     │
  │     └─→ Zero-roundtrip fast path: answer from notebook, skip disk reads
  │
  ├─→ STEP 2b: Sequential Thinking active session check
  │     └─→ Complex task? → check for existing session, read if found
  │
  ├─→ STEP 3: Serena navigation (only if nothing in memory covers it)
  │     └─→ get_symbols_overview → find_symbol → find_referencing_symbols
  │
  └─→ STEP 4: Verify & cite
        ├─→ Cite note title / source ID / symbol path
        ├─→ Note contradicts code? → trust code, update note
        └─→ Nothing matched? → say so plainly, never invent
```

---

## Decision Tree 3: Task Complexity Router

```
What is the task?
  │
  ├─→ Simple lookup (single tool call)
  │     └─→ Open Notebook search directly, no Sequential Thinking overhead
  │
  ├─→ Multi-step across 2+ tools (Serena + REA, Serena + Steel, etc.)
  │     └─→ Create Sequential Thinking session
  │         └─→ add_step(evidence) → execute tool → add_step(evidence) → ...
  │
  ├─→ Debugging hard-to-trace bug
  │     └─→ Sequential Thinking session (hypotheses, tests, dead ends)
  │
  ├─→ Reverse engineering investigation
  │     └─→ Sequential Thinking session (binary findings, Serena cross-ref)
  │
  ├─→ Long web workflow
  │     └─→ Sequential Thinking session (page states, form progress)
  │
  └─→ Architectural exploration (>3 symbols traced)
        └─→ Sequential Thinking session → Code Map note at end
```

---

## Decision Tree 4: Code Navigation

```
Need to find code?
  │
  ├─→ Code map exists for this component?
  │     └─→ YES → go directly to mapped symbol paths via Serena
  │
  ├─→ No code map, cold start needed?
  │     └─→ Read root manifests (pyproject.toml, package.json, etc.)
  │     └─→ Shallow listing (depth ≤ 2) of top-level source dirs
  │     └─→ get_symbols_overview on 1-2 candidate files
  │
  ├─→ Symbol located?
  │     ├─→ include_body: false first (signatures only)
  │     └─→ include_body: true only for symbols you actually need
  │
  ├─→ Need callers/usages?
  │     └─→ find_referencing_symbols
  │
  ├─→ Need implementations?
  │     └─→ find_implementations
  │
  ├─→ Non-symbol files (Helm, Dockerfiles, properties, SQL)?
  │     └─→ search_for_pattern with relative_path + context_lines_after: 10-15
  │
  └─→ Budget limits:
        ├─→ Scouting: 3-5 calls max, then stop
        └─→ Traversal: 5 consecutive no-progress calls → ask user
```

---

## Decision Tree 5: Capture Triggers (When to Write)

```
Event occurs → should I write a note?
  │
  ├─→ HARD TRIGGERS (write immediately):
  │     ├─→ Decision made, fix resolved, gotcha discovered, >3 symbols traced
  │     │   └─→ Write atomic note NOW
  │     │
  │     ├─→ About to do context-heavy operation (large refactor, big file read)
  │     │   └─→ Checkpoint FIRST before proceeding
  │     │
  │     ├─→ Starting complex multi-step task (>3 steps across tools)
  │     │   └─→ Create Sequential Thinking session
  │     │
  │     ├─→ User signals closure ("done", "wrap up", "goodbye")
  │     │   └─→ Session Closure Protocol (finalize ST → write notes → verify)
  │     │
  │     ├─→ Topic changes substantially
  │     │   └─→ Finalize ST session → summarize old topic → move on
  │     │
  │     └─→ User validates ("save this", "remember this", "note that")
  │         └─→ Comprehensive Knowledge Persistence Protocol
  │             (Architecture Manual + Code Maps + Config Matrix + Gotchas + Runbook)
  │
  ├─→ SOFT TRIGGERS (write within next turn):
  │     ├─→ Milestone reached in long task → update Checkpoint note
  │     ├─→ Every 10-15 tool calls → safety checkpoint
  │     └─→ During ST session, significant finding → add_step()
  │
  └─→ NO TRIGGER → continue working
```

---

## Decision Tree 6: Session Closure Protocol

```
User says "done" / session ending
  │
  ├─→ 1. Finalize all active Sequential Thinking sessions
  │
  ├─→ 2. Write pending atomic notes (decisions, fixes, gotchas, code maps)
  │     └─→ Distill ST session results into focused Open Notebook notes
  │
  ├─→ 3. Update session note with full template
  │
  ├─→ 4. Verify every written note is searchable
  │
  ├─→ 5. Sync fallback buffer (.agent-memory/pending-notes.md)
  │
  ├─→ 6. Update Serena's notebook-index memory
  │
  └─→ 7. Respond to user: session closed
```

---

## Decision Tree 7: Web Browsing (Steel)

```
Need web access?
  │
  ├─→ Read-only task?
  │     └─→ steel_scrape(url) — no session, no billing
  │
  ├─→ Need PDF?
  │     └─→ steel_pdf(url) — no session needed
  │
  ├─→ Need screenshot?
  │     └─→ steel_screenshot(url)
  │
  └─→ Interactive multi-step workflow?
        ├─→ steel_session_create(...)
        ├─→ steel_navigate(url)
        ├─→ steel_snapshot / steel_find (read before acting)
        ├─→ steel_act(action, target) — click, type, fill
        ├─→ Sensitive input? → steel_session_handoff
        ├─→ Before payment/confirmation? → STOP
        └─→ steel_session_release() — stop billing
```

---

## Decision Tree 8: Fallback (Server Unavailable)

```
Server fails?
  │
  ├─→ Open Notebook unreachable
  │     └─→ Write to .agent-memory/pending-notes.md (local buffer)
  │
  ├─→ Serena unavailable
  │     └─→ Tell user, ask for specific files/symbols, do NOT brute-force
  │
  ├─→ Steel unavailable
  │     └─→ Tell user, do NOT shell-scrape fallback
  │
  └─→ Sequential Thinking unavailable
        └─→ Continue task, record findings in Open Notebook checkpoints
```

---

## Knowledge Ownership Matrix

```
What knowledge → where does it live?
  │
  ├─→ Session history, checkpoints, run logs → Open Notebook (notes)
  ├─→ Decisions, fixes, gotchas, runbooks → Open Notebook (notes)
  ├─→ Code maps (where things live) → Open Notebook (notes)
  ├─→ Specs, designs, external docs → Open Notebook (sources)
  ├─→ Project onboarding (build/test/layout) → Serena memories
  ├─→ Index of key Open Notebook notes → Serena memory "notebook-index"
  ├─→ Working reasoning (during a task) → Sequential Thinking (sessions)
  └─→ The code itself → Repository, read via Serena (source of truth)
```

---

## Key Invariants

1. **Sequential Thinking = RAM** — working memory, survives compaction, distilled to Open Notebook at task end
2. **Open Notebook = Disk** — persistent, searchable across sessions and repositories
3. **Serena = Code eyes** — symbol-first navigation, never brute-force grep
4. **Steel = Browser** — scrape-first, session only when interaction needed, release promptly
5. **Code always wins** over stale notes or memories
6. **Sanitize everything** — secrets, client data, PII never stored anywhere

