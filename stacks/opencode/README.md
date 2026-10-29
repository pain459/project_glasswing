# OpenCode

A web OpenCode server wired to the local Ollama instance and to Open Notebook
for retrieval-augmented context.

## Services

| Service | Purpose |
| --- | --- |
| `opencode` | OpenCode V2 server and web UI on `https://opencode.glasswing.lan` |
| `open-notebook-mcp` | Streamable HTTP MCP bridge to the Open Notebook API |
| `steel-mcp` | Streamable HTTP MCP bridge to the self-hosted Steel browser |
| `init-permissions` | One-shot ownership fix for the host bind mounts |

## Prerequisites

- The `open-notebook` stack is running: `make up STACK=open-notebook`.
- The `steel` stack is running: `make up STACK=steel` (browser tools).
- Ollama is reconciled automatically by `make up STACK=opencode`, and can be
  run alone with `make up STACK=ollama`. It starts the container, pulls
  `qwen3.6:27b` if missing, and builds `qwen3.6-opencode:latest` from the
  checked-in
  [`../ollama/models/qwen3.6-opencode.Modelfile`](../ollama/models/qwen3.6-opencode.Modelfile)
  with `num_ctx 131072`, `num_predict 32768` and `temperature 0.3`.
- `nomic-embed-text:latest` is required by Open Notebook for embeddings; it is
  not used by OpenCode.
- Add these secrets under the Infisical path `/opencode`:
  - `OPENCODE_SERVER_PASSWORD` — a long random password for the web UI/API.
  - `OPEN_NOTEBOOK_PASSWORD` — the same value used by `/open-notebook`.

If your Infisical version supports secret references, point
`/opencode/OPEN_NOTEBOOK_PASSWORD` at the Open Notebook value instead of
copying it. Otherwise, update both paths together when the password changes.

## Deploy

```bash
make check STACK=opencode
make up STACK=opencode
```

The three local images are rebuilt from their Dockerfiles on every deployment:

- `glasswing/opencode:2.1.2`
- `glasswing/open-notebook-mcp:0.3.0`
- `glasswing/steel-mcp:3.0.0`

`make up STACK=opencode` builds those images, reconciles the Ollama stack, starts
OpenCode, then runs the full preflight. A deployment that does not meet the
inference baseline fails instead of reporting success. Layer caching keeps the
rebuild cheap when only a service file changed.

## Inference baseline

The coding model and both containers are tuned together. The numbers below are
one contract: a context window declared in OpenCode does not allocate anything
in Ollama, and a generation budget declared in Ollama can silently truncate a
response that OpenCode believes is complete.

| Component | Setting | Where |
| --- | --- | --- |
| Context window | 131,072 tokens | `num_ctx` in the Modelfile and `limit.context` |
| Generation budget | 32,768 tokens | `num_predict` in the Modelfile and `limit.output` |
| Temperature | 0.3 | Modelfile and request `body` |
| Reasoning | Disabled | `body.reasoning_effort: "none"` |
| Compaction | Auto, keep 24k, reserve 20k | `compaction.auto`, `keep.tokens`, `buffer` |
| KV cache | `q8_0` with flash attention | `../ollama/compose.yaml` |
| Parallel requests / loaded models | 1 / 1 | `../ollama/compose.yaml` |

Thinking is off because this model emits a separate `thinking` trace before the
answer. For the same one-line coding prompt, thinking on used 1,108 characters
of reasoning and 323 completion tokens, while thinking off used 23 tokens. In
the earlier setup a 2,048-token budget was exhausted by the trace, returning
`done_reason=length` with no visible answer.

The KV-cache and concurrency limits are for GPU residency. A 27B model at a
131k context does not fit in 24 GB of VRAM with an f16 KV cache, so Ollama
offloads some layers to the CPU. `q8_0` halves the cache, flash attention makes
it usable, and one request at a time stops two sessions from competing for the
same memory. Offloading is measured, not assumed.

## Preflight

`make up STACK=opencode` runs this automatically. To rerun it without
redeploying:

```bash
make ai-preflight
```

The script is read-only. It checks, in order:

1. Both containers are running.
2. Ollama can see the RTX 4090 from inside its container.
3. `OLLAMA_FLASH_ATTENTION`, `OLLAMA_KV_CACHE_TYPE`, `OLLAMA_NUM_PARALLEL`,
   `OLLAMA_MAX_LOADED_MODELS` and `OLLAMA_KEEP_ALIVE` have the agreed values.
4. The model's effective parameters match the Modelfile.
5. The OpenCode model, limits, temperature, reasoning and compaction agree.
6. OpenCode reaches Ollama's `/v1/models` from inside its own container.
7. A small coding prompt returns `finish_reason=stop` with a non-empty answer
   and no thinking trace; the thinking-on run is reported for comparison.
8. `ollama ps` reports how much of the model is actually in VRAM.

A baseline measured on 2026-10-27, before the KV-cache flags were applied, put
`qwen3.6-opencode` at 72.1% GPU (15.1 GB of 20.9 GB in VRAM) with the full 131k
context. Re-measure after deploying; the earlier tuned setup reached about 91%.

`make up STACK=ollama` runs only the Ollama part, equivalent to
`./scripts/ai-preflight.sh --ollama`.

## Access

Open <https://opencode.glasswing.lan>, choose **Use password**, and enter:

- Server: `https://opencode.glasswing.lan`
- Password: the value of `OPENCODE_SERVER_PASSWORD`

The app's form has no username. If the browser instead shows its own grey
**Sign in to opencode.glasswing.lan** dialog, that is HTTP Basic auth from the
API: the username is `opencode` and the password is the same value. You can
also cancel it and use the app's **Use password** form, which creates a 30-day
session cookie.

For a one-time pairing link instead:

```bash
docker exec glasswing-opencode \
  opencode pair --url https://opencode.glasswing.lan
```

The link expires after five minutes and works once.

## Monitoring

`/health` is unauthenticated and reports whether the server is up, so it is the
right target for availability checks:

- Homepage: `stacks/homepage/config/services.yaml` lists OpenCode under
  **AI Platform** with `siteMonitor: http://glasswing-opencode:4096/health`.
- Uptime Kuma monitor URL: `https://opencode.glasswing.lan/health`
  (HTTPS, 60s interval recommended).

Prefer `/health` over `/` for the actual check: `/` returns the app shell to
every visitor, and `/api/health` requires Basic auth (`opencode` plus the server
password) or a session cookie.

## Context and RAG

The model window is 131,072 tokens and the generation budget is 32,768
tokens. RAG does not make the window literally unlimited; it lets OpenCode work
over a larger corpus by retrieving only the relevant passages.

Open Notebook is the document store and retrieval engine. OpenCode reaches it
through the `open-notebook` MCP server. The global instructions in
`config/AGENTS.md` tell the agent to:

1. Discover notebooks and sources.
2. Run vector search for focused passages.
3. Treat retrieved text as evidence.

To add material:

- Web pages: ask OpenCode to call `create_source` with `type: "link"` and
  `embed: true`, or add the link in the Open Notebook UI.
- PDFs and uploads: add them in the Open Notebook UI at
  <https://notebook.glasswing.lan>. The MCP bridge searches whatever Open Notebook
  has already indexed.

Automatic compaction keeps long sessions inside the window while preserving
recent detail.

## Watching Open Notebook work

Three places show retrieval happening. The first is usually enough.

1. **OpenCode transcript.** Every MCP call is a visible tool step. During a RAG
   query the agent runs `tools["open-notebook"].list_notebooks`,
   `list_sources`, then `search`, and the result card lists the matched
   notebook, source and score. If you only ever see a text answer with no
   `open-notebook` step, the model answered from its own weights — ask it
   explicitly to search the notebook.
2. **Open Notebook API log.** This is proof of the request reaching the server:
   ```bash
   docker logs -f glasswing-open-notebook-open_notebook-1 2>&1 | grep -E 'POST|GET'
   ```
   A retrieval shows up as `GET /api/notebooks`, `GET /api/sources` and a
   `POST /api/search` or `/api/search/ask` from the docker gateway address. A
   `401 Unauthorized` there means the password in `/opencode` no longer matches
   `/open-notebook`.
3. **MCP bridge log.**
   ```bash
   docker logs -f glasswing-open-notebook-mcp
   ```
   Shows each `tools/call` the OpenCode server makes and any error it returns.

In the Open Notebook UI at <https://notebook.glasswing.lan> you can confirm what is
indexed: **Notebooks** lists the sources, and each source shows its embedding
status. The UI does not stream other clients' queries live, so the transcript
and the container log are the real-time views.

Insights are **not** chat output. A source's insight count only grows when a
transformation is run against it: open the source, go to **Insights** and use
**Generate New Insight**. Chat, `ask_question` and the MCP bridge never create
them, so a source added from OpenCode always starts at 0 insights. Insights are
embedded as well, so they also appear in vector search results.

To check the whole path end to end, put a unique token in a notebook source
(for example `BLUE-LANTERN-42`), then ask OpenCode a question whose answer is
that token. If it answers without a tool call, retrieval is not being used; if
it returns the token after an `open-notebook` search step, the chain works.

## Web browsing with Steel

`steel-mcp` gives the agent a real Chrome through the self-hosted Steel
service at `192.168.68.62:3100`. It speaks stdio only, so `supergateway` wraps
it in Streamable HTTP on `http://steel-mcp:8000/mcp`; the OpenCode server sees
it as the `steel` MCP server.

Nothing is exposed to the host: the sidecar has no published port, and Steel
itself is the only component on the LAN. The tools the model gets are:

| Tool | Use |
| --- | --- |
| `steel_scrape` | One-shot read of a URL; no session, cheapest |
| `steel_session_create` | Start a browser session, returns `session_id` |
| `steel_navigate` | Go to a URL inside that session |
| `steel_snapshot` / `steel_find` | Text structure of the page, or search it |
| `steel_act` | Click, type, scroll |
| `steel_screenshot` / `steel_pdf` | Image or PDF of the page |
| `steel_wait_for` | Wait for text, selector or network idle |
| `steel_session_release` | Stop the browser and the meter |
| `steel_batch`, `steel_session_diagnostics`, `steel_session_replay` | Multi-step runs, debugging |

Prompts that work well:

- `Scrape https://news.ycombinator.com and summarise the top five stories.`
- `Open https://example.com in Steel, take a snapshot, and quote the paragraph.`
- `Search the web for X, read the top three results in Steel, and cite them.`
- `Fill in the contact form on <url> with these details and screenshot the result.`

Conventions worth keeping:

- Prefer `steel_scrape` for a single page; it avoids creating a session.
- A session is created on demand by the agent, but **always released** when the
  work is done. Idle sessions are dropped after 600 seconds, and each session
  has a hard lifetime that cannot be extended.
- Page text comes back wrapped in `<untrusted-page-content>`. The agent is
  instructed to treat it as data, not instructions.

Steel does not expose a working remote viewer: it advertises session URLs as
`ws://0.0.0.0:3000` because it binds all interfaces, so the built-in UI at
`/ui` tries to reach `0.0.0.0` from your browser and stays blank. To see what
the agent sees, ask for a `steel_screenshot` (it is recorded as an image on the
tool call) or a `steel_snapshot` (text), and check the live session list:

```bash
curl -s http://192.168.68.62:3100/v1/sessions | jq -r '.sessions[] | [.id,.status,.createdAt] | @tsv'
docker logs -f glasswing-steel-mcp
```

A failed call is visible in the `steel-mcp` log as a JSON-RPC result with
`isError: true`; the common causes are a session id that was already released
and a Steel service that is down (`/v1/health`).

## Data

| Host path | Container path | Purpose |
| --- | --- | --- |
| `/srv/glasswing/opencode/home` | `/home/opencode` | Sessions, database, cache, logs |
| `/srv/glasswing/opencode/workspace` | `/workspace` | Persistent project workspace |
| `/home/ravik` | `/home/ravik` | Repositories, dotfiles, SSH keys |
| `/mnt/storage` | `/mnt/storage` | Ollama models, Glasswing backups |
| `/mnt/cold` | `/mnt/cold` | Books, games, media, Open WebUI data |

The one-shot init service creates the first two directories and gives them to
UID/GID `1000`, matching the `ravik` user on Pathfinder.

The remaining mounts are the host itself. The container runs as `1000:1000`,
which is the same uid and gid as `ravik`, so the agent reads and writes those
paths directly, at their real absolute paths. There is no copy step and no
workspace synchronisation.

Two consequences are deliberate:

- The agent can change any file `ravik` can change, including the Git
  checkouts in `/home/ravik/src_git`. Do not give the server password to
  anyone who should not have that access.
- `/home/ravik/.ssh` is visible, so the agent can clone and push over SSH. It
  can also read any key stored there.

The mount roots themselves must be writable by `ravik`. On Pathfinder they
shipped as `root:root`, which made `/mnt/storage` and `/mnt/cold` read-only
even though their subdirectories were not:

```bash
sudo chown ravik:ravik /mnt/storage /mnt/cold
```

The children keep their own owners, so Ollama's model directory stays
`995:docker` and the backup directories stay `root`.

`config/` is mounted read-only at `/etc/opencode`, which is OpenCode's system
configuration directory.

## Adding tools

Add another MCP server under `mcp.servers` in `config/opencode.jsonc` and
redeploy:

```jsonc
"mcp": {
  "servers": {
    "open-notebook": {
      "type": "remote",
      "url": "http://open-notebook-mcp:8000/mcp",
      "oauth": false
    },
    "example": {
      "type": "remote",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

## Notes

- The web UI is served over HTTPS by the Glasswing reverse proxy at
  `https://opencode.glasswing.lan`. It is still LAN-only; do not port-forward
  the proxy to the internet.
- The OpenCode image is pinned to `2.1.2`. Update the tag in `Dockerfile` and
  the local image tag in `compose.yaml` together.
- The MCP bridge pins `mcp==1.30.0` because `open-notebook-mcp` 0.3.0 imports
  `FastMCP`, which MCP 2.x removed.
- FastMCP rejects requests whose `Host` header is not allowed, which shows up
  as HTTP 421. `MCP_ALLOWED_HOSTS` in `compose.yaml` lists the host name used by
  OpenCode (`open-notebook-mcp:8000`). Update it if you rename the service.
- `steel-mcp` is built from source because 3.0.0 is not published to npm. The
  commit is pinned by `STEEL_MCP_COMMIT` in `steel-mcp/Dockerfile`; bump it
  together with the image tag in `compose.yaml`.
- Steel is addressed by its LAN URL (`STEEL_BASE_URL`,
  `STEEL_CONNECT_URL` in `compose.yaml`) rather than a compose service name,
  because the browser sessions run in the `steel` stack, not this one.
