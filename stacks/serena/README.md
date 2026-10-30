# Serena

Serena provides code intelligence to host OpenCode over Streamable HTTP MCP.

- MCP: `http://127.0.0.1:9121/mcp` (loopback only)
- Dashboard: `http://<HOST_IP>:24282/dashboard/index.html` (LAN accessible)
- Infisical path: `/serena` (global settings only)

## Configuring Repository Mounts

Repo mounts are driven by `repos.env` — a simple, gitignored file that lists
host-to-container path mappings, one per line:

```bash
cp stacks/serena/repos.env.example stacks/serena/repos.env
```

Then edit `repos.env`:

```
# Format: HOST_PATH:CONTAINER_PATH[:ro]
/home/ravik/src_git:/workspace/repos
/mnt/storage/other-project:/workspace/other-project:ro
```

The `pre-up.sh` hook reads this file and generates `compose.override.yaml`
automatically. Both files are gitignored.

Prefer `:ro` (read-only) mounts unless Serena must edit files in that repo.

## Lifecycle

```bash
make up STACK=serena
make check STACK=serena
python3 scripts/mcp-preflight.py --name serena http://127.0.0.1:9121/mcp
```

The one-shot init service owns the persistent configuration volume as UID/GID
1000 before Serena starts. It seeds a missing config or migrates a pre-v2 config
that lacks the required `projects` registry, then leaves the writable volume to
Serena so project registrations and memories persist.

Host OpenCode configures Serena as a remote MCP URL with OAuth disabled. If the
container logs report a missing `projects` key, redeploy the stack so the init
service can migrate the volume. The MCP port (9121) remains loopback-only; the
dashboard port (24282) is LAN-accessible.
