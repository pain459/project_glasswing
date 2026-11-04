# Serena

Serena provides code intelligence to host OpenCode over Streamable HTTP MCP.

- MCP: `http://127.0.0.1:9121/mcp` (loopback only)
- Dashboard: `http://<HOST_IP>:24282/dashboard/index.html` (LAN accessible)
- Infisical path: `/serena` (global settings only)

## Configuring the Active Project

Edit the single mount line in `repos.env` (gitignored; copy from `repos.env.example`):

```
/home/ravik/src_git/project_glasswing:/workspace/project_glasswing
```

The first valid line is both mounted and activated as Serena's active project.
Add further lines below it for additional read-only mounts if needed.

The `pre-up.sh` hook reads `repos.env` and generates `compose.override.yaml`
automatically. Both files are gitignored.

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
