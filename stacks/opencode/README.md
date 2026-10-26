# OpenCode

A web OpenCode server wired to the local Ollama instance and to Open Notebook
for retrieval-augmented context.

## Services

| Service | Purpose |
| --- | --- |
| `opencode` | OpenCode V2 server and web UI on `192.168.68.62:3019` |
| `open-notebook-mcp` | Streamable HTTP MCP bridge to the Open Notebook API |
| `init-permissions` | One-shot ownership fix for the host bind mounts |

## Prerequisites

- The `open-notebook` stack is running: `make up STACK=open-notebook`.
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

The first deployment builds two local images:

- `glasswing/opencode:2.1.2`
- `glasswing/open-notebook-mcp:0.3.0`

## Access

Open <http://192.168.68.62:3019>, choose **Use password**, and enter:

- Server: `http://192.168.68.62:3019`
- Password: the value of `OPENCODE_SERVER_PASSWORD`

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
every visitor, and `/api/health` returns 401 without a session.

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
