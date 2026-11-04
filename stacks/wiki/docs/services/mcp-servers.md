# MCP Servers

Model Context Protocol servers that give AI agents access to knowledge bases, browsers, code, and more.

---

## Overview

MCP (Model Context Protocol) is an open standard for connecting AI models to external tools and data sources. Glasswing runs 6 MCP servers, each exposing specialized capabilities.

```
AI Agent (OpenCode, Claude, etc.)
    │
    ├── Open Notebook MCP  :8502   → Knowledge base, vector search
    ├── Steel MCP          :3100   → Browser automation
    ├── Serena MCP         :24282  → Code intelligence
    ├── REA MCP            :8003   → Reverse engineering
    ├── Seq. Thinking MCP  :8004   → Working memory
    └── SearXNG MCP        :8005   → Web search
```

---

## Open Notebook MCP

> **Persistent knowledge base — notes, sources, vector search**

- **URL:** [http://192.168.68.62:8502](http://192.168.68.62:8502)
- **Port:** `:8502`
- **Containers:** `glasswing-open-notebook-mcp`, `glasswing-open-notebook`, `glasswing-open-notebook-surrealdb`
- **Stack:** `stacks/open-notebook/`

### How it works

Persistent memory for AI agents. Stores:
- Session notes and decisions
- Code maps and architecture docs
- Error fixes and gotchas
- Technical reference material

Supports vector search for semantic retrieval. Backend is SurrealDB.

### Key capabilities

- Create/read/update/delete notes
- Vector + text search
- Source ingestion (docs, specs, designs)
- Notebook organization per project

---

## Steel MCP

> **Browser automation — web scraping, screenshots, form filling**

- **URL:** [http://192.168.68.62:3100/ui](http://192.168.68.62:3100/ui)
- **Port:** `:3100`
- **Container:** `glasswing-steel-mcp`
- **Stack:** `stacks/steel-mcp/`

### How it works

Cloud Chrome browser for AI agents. Supports:
- Page scraping (handles JavaScript)
- Screenshot capture
- Form filling and submission
- Multi-step workflows
- PDF rendering

```
AI Agent → Steel MCP → Cloud Chrome
                              │
                              ├── Navigate to URL
                              ├── Take screenshot
                              ├── Fill form
                              └── Extract data
```

---

## Serena MCP

> **Code intelligence — symbol search, references, refactoring**

- **URL:** [http://192.168.68.62:24282](http://192.168.68.62:24282)
- **Port:** `:24282`
- **Container:** `glasswing-serena`
- **Stack:** `stacks/serena/`

### How it works

Language server protocol (LSP) backed code intelligence. Provides:
- Symbol search across codebases
- Reference finding
- Safe renaming and deletion
- File structure overview
- Project memory persistence

### Key capabilities

- `find_symbol` — Locate functions, classes, methods
- `find_referencing_symbols` — Find all usages
- `get_symbols_overview` — File structure tree
- `rename_symbol` — Cross-file renaming
- `search_for_pattern` — Regex in code

---

## REA MCP

> **Reverse engineering — binary analysis, debugging, disassembly**

- **Port:** `:8003` (localhost only)
- **Container:** `glasswing-rea-mcp`
- **Stack:** `stacks/rea-mcp/`

### How it works

Reverse engineering toolkit for AI agents. Supports:
- Binary analysis and disassembly
- GDB debugging sessions
- Rizin integration
- Memory inspection
- Symbol resolution

Localhost-only for security (handles untrusted binaries).

---

## Sequential Thinking MCP

> **Working memory — structured reasoning, evidence tracking**

- **Port:** `:8004` (localhost only)
- **Container:** `glasswing-sequential-thinking-mcp`
- **Stack:** `stacks/sequential-thinking-mcp/`

### How it works

Persistent scratchpad for multi-step reasoning. Provides:
- Structured thought sessions
- Evidence tracking
- Decision logging
- Risk assessment
- SQLite backend (survives context compaction)

### Workflow

```
create_session → add_step(evidence) → add_step(decision)
     → add_step(risk) → finalize_session → distill to Open Notebook
```

---

## SearXNG MCP

> **Private web search — MCP interface to SearXNG**

- **Port:** `:8005` (localhost only)
- **Container:** `glasswing-searxng-mcp`
- **Stack:** `stacks/searxng/`

### How it works

MCP wrapper around the SearXNG instance. AI agents can:
- Perform web searches
- Filter by category (web, images, news, code)
- Get autocomplete suggestions
- Access search engine diagnostics

Shares the same SearXNG backend as the web interface (`:3028`).
