# OpenCode

A web OpenCode server wired to the local Ollama instance and to Open Notebook
for retrieval-augmented context.

## Services

| Service | Purpose |
| --- | --- |
| `opencode` | OpenCode V2 server and web UI on `192.168.68.62:3019` |
| `open-notebook-mcp` | Streamable HTTP MCP bridge to the Open Notebook API |
| `steel-mcp` | Streamable HTTP MCP bridge to the self-hosted Steel browser |
| `init-permissions` | One-shot ownership fix for the host bind mounts |

## Prerequisites

- The `open-notebook` stack is running: `make up STACK=open-notebook`.
- The `steel` stack is running: `make up STACK=steel` (browser tools).
- Ollama is running with:
  - `qwen3.6-opencode:latest` for coding. The model is built with
    `num_ctx 131072`, and this stack declares that as the context limit.
  - `nomic-embed-text:latest` for Open Notebook embeddings.
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

The first deployment builds three local images:

- `glasswing/opencode:2.1.2`
- `glasswing/open-notebook-mcp:0.3.0`
- `glasswing/steel-mcp:3.0.0`

## Access

Open <http://192.168.68.62:3019>, choose **Use password**, and enter:

- Server: `http://192.168.68.62:3019`
- Password: the value of `OPENCODE_SERVER_PASSWORD`

The app's form has no username. If the browser instead shows its own grey
**Sign in to 192.168.68.62:3019** dialog, that is HTTP Basic auth from the API:
the username is `opencode` and the password is the same value. You can also
cancel it and use the app's **Use password** form, which creates a 30-day
session cookie.

For a one-time pairing link instead:

```bash
docker exec glasswing-opencode \
  opencode pair --url http://192.168.68.62:3019
```

The link expires after five minutes and works once.

## Monitoring

`/health` is unauthenticated and reports whether the server is up, so it is the
right target for availability checks:

- Homepage: `stacks/homepage/config/services.yaml` lists OpenCode under
  **AI Platform** with `siteMonitor: http://192.168.68.62:3019/health`.
- Uptime Kuma monitor URL: `http://192.168.68.62:3019/health`
  (HTTP, 60s interval recommended).

Prefer `/health` over `/` for the actual check: `/` returns the app shell to
every visitor, and `/api/health` requires Basic auth (`opencode` plus the server
password) or a session cookie.

## Context and RAG

The model window is 131,072 tokens. RAG does not make the window literally
unlimited; it lets OpenCode work over a larger corpus by retrieving only the
relevant passages.

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
  <http://192.168.68.62:8502>. The MCP bridge searches whatever Open Notebook
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

In the Open Notebook UI at <http://192.168.68.62:8502> you can confirm what is
indexed: **Notebooks** lists the sources, and each source shows its embedding
status. The UI does not stream other clients' queries live, so the transcript
and the container log are the real-time views.

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

The one-shot init service creates these directories and gives them to UID/GID
`1000`, matching the `ravik` user on Pathfinder.

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

- The web UI is plain HTTP on the LAN. Use an SSH tunnel
  (`ssh -L 3019:192.168.68.62:3019 ravik@192.168.68.62`) or a TLS reverse proxy
  if the network is not trusted.
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
