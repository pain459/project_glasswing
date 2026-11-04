# AI Platform

Local AI inference, agent workflows, observability, and RAG — all running on the RTX 4090.

---

## Ollama

> **Local LLM inference on NVIDIA RTX 4090**

- **URL:** [http://192.168.68.62:11434](http://192.168.68.62:11434)
- **Port:** `:11434`
- **Container:** `glasswing-ollama`
- **Stack:** `stacks/ollama/`

### How it works

Ollama runs large language models locally on the RTX 4090 GPU. Models are pulled on-demand and cached on disk.

```
Client (Flowise, AnythingLLM, ATLAS)
    │
    │  HTTP POST /api/generate
    ▼
Ollama :11434
    │
    ├── llama3.1:8b    (general chat)
    ├── mistral:7b     (fast inference)
    ├── codellama:7b   (code assistance)
    └── ... (more models)
```

### GPU passthrough

The container has direct GPU access via NVIDIA Container Toolkit. VRAM is used for model loading and inference.

### Key endpoints

- `POST /api/generate` — Text generation
- `POST /api/chat` — Chat completion
- `GET /api/tags` — List loaded models
- `GET /api/version` — Health check

---

## Flowise

> **Visual AI agent & workflow builder**

- **URL:** [http://192.168.68.62:3002](http://192.168.68.62:3002)
- **Port:** `:3002`
- **Container:** `glasswing-flowise`
- **Stack:** `stacks/flowise/`

### How it works

Drag-and-drop interface for building LLM workflows. Connects to Ollama as the model provider. Supports:
- Chat chains with memory
- Tool calling (web search, code execution)
- Document loaders for RAG
- Conditional branching

```
User → Flowise → Ollama (llm)
                ↘ Vector Store (RAG)
                ↘ Tools (search, calculator)
```

---

## Langfuse

> **LLM observability — tracing, prompts, datasets, analytics**

- **URL:** [http://192.168.68.62:3010](http://192.168.68.62:3010)
- **Port:** `:3010`
- **Containers:** `glasswing-langfuse-web`, `glasswing-langfuse-worker`, `glasswing-langfuse-postgres`, `glasswing-langfuse-clickhouse`, `glasswing-langfuse-redis`, `glasswing-langfuse-minio`
- **Stack:** `stacks/langfuse/`

### How it works

Observability platform for LLM applications. Tracks:
- Every LLM call (prompt, response, latency, tokens)
- Cost estimation per model
- Dataset management for evaluation
- Prompt versioning

### Architecture

```
Flowise / AnythingLLM
    │
    │  OTLP traces
    ▼
Langfuse Web :3010
    │
    ├── ClickHouse (event storage)
    ├── PostgreSQL (metadata)
    ├── Redis (caching)
    └── MinIO :9090 (file storage)
```

---

## AnythingLLM

> **Local RAG — chat with documents, knowledge bases**

- **URL:** [http://192.168.68.62:3012](http://192.168.68.62:3012)
- **Port:** `:3012`
- **Container:** `glasswing-anythingllm`
- **Stack:** `stacks/anythingllm/`

### How it works

Document-based AI chat. Upload PDFs, text files, or web pages, then chat with them using Ollama as the LLM backend.

```
Document upload
    │
    ▼
Text extraction → Chunking → Embedding
    │
    ▼
Vector Store (local)
    │
    ▼
Chat → Retrieve relevant chunks → Ollama generates response
```

### Workspaces

Each workspace is isolated with its own documents, vector store, and conversation history.

---

## SearXNG

> **Private metasearch engine — no tracking, 70+ sources**

- **URL:** [http://192.168.68.62:3028](http://192.168.68.62:3028)
- **Port:** `:3028`
- **Containers:** `glasswing-searxng`, `glasswing-searxng-valkey`
- **Stack:** `stacks/searxng/`

### How it works

Self-hosted metasearch aggregator. Queries 70+ search engines and aggregates results without tracking.

```
User query
    │
    ├── Google, Bing, DuckDuckGo (web)
    ├── Wikipedia, Wikidata (knowledge)
    ├── GitHub, GitLab (code)
    ├── Reddit, HackerNews (social)
    └── ... (70+ sources)
    │
    ▼
Aggregated results → User
```

### MCP integration

Exposed as an MCP server (`glasswing-searxng-mcp` on `:8005`) for AI agents to perform web searches.

### Caching

Valkey (Redis fork) caches search results to reduce redundant queries and rate limiting.
