# Host OpenCode and MCP stack migration — 2026-10-31

## Result

Pathfinder's host-installed OpenCode is the only OpenCode runtime. The former
Compose web service was retired, its port was closed, and its source tree was
preserved in the migration recovery archive.

Three independent Compose stacks expose Streamable HTTP MCP only on loopback:

| Stack | Endpoint | Dependency |
| --- | --- | --- |
| `open-notebook-mcp` | `http://127.0.0.1:8001/mcp` | Open Notebook API on the shared Docker network; `/open-notebook` secrets |
| `steel-mcp` | `http://127.0.0.1:8002/mcp` | Steel API and WebSocket on the shared Docker network |
| `serena` | `http://127.0.0.1:9121/mcp` | Repository mounts configured by Compose |

Serena's dashboard is also host-only at
`http://127.0.0.1:24282/dashboard/index.html`. No MCP endpoint is reachable
directly from the LAN.

## Host OpenCode

- Binary: `/home/ravik/.opencode/bin/opencode`
- Global config: `/home/ravik/.config/opencode/opencode.json` (mode `0600`)
- Model: `ollama/qwen3.6-opencode:latest`
- Ollama API: `http://192.168.68.62:11434/v1`
- MCP transport: three `type: remote` entries with OAuth disabled and loopback
  URLs shown above

OpenCode v2 may report no MCP servers for a few hundred milliseconds immediately
after its background service restarts. Check again after startup; persistent
absence is diagnosed with `opencode debug config` and the OpenCode service log.

## Serena repository mounts

The base stack maps `/home/ravik/src_git` read-write to `/workspace/repos` once.
Additional roots belong in a local `stacks/serena/compose.override.yaml`, copied
from `compose.override.example.yaml`. Prefer read-only mounts unless editing is
required. The named config volume is writable by uid/gid 1000; its initializer
seeds or migrates the checked-in template, then Serena maintains its registered
projects and memories.

## Operations

```bash
make up STACK=open-notebook-mcp
make up STACK=steel-mcp
make up STACK=serena
make mcp-preflight
make ai-preflight
/home/ravik/.opencode/bin/opencode mcp list
```

`make mcp-preflight` performs `initialize`, `notifications/initialized`, and
`tools/list` against every endpoint. `make ai-preflight` validates Ollama GPU
and model settings, the effective host OpenCode model, and a real standalone
prompt.

## Recovery and troubleshooting

- Confirm listeners with `ss -ltn`; ports 8001, 8002, 9121 and 24282 must show
  `127.0.0.1`, never `0.0.0.0` or the LAN address.
- Check one stack with `make ps STACK=<name>` and `make logs STACK=<name>`.
- A Serena `projects key not found` error means its config volume predates v2;
  redeploy so `init-permissions` migrates the template.
- If OpenCode shows a disconnected server while the protocol preflight passes,
  run `opencode service restart`, wait for startup, and re-run `opencode mcp list`.
- Roll back host configuration by restoring the archived pre-migration file and
  restarting the OpenCode service. The migration archive is intentionally kept
  outside the repository and must not be deleted without explicit approval.

## Verification evidence

At migration time the protocol catalog reported 33 Open Notebook tools, 16
Steel tools and 3 Serena tools. A native OpenCode session successfully called
`open-notebook.list_notebooks`, `serena.initial_instructions`, and
`steel.steel_scrape` against `https://example.com`.
