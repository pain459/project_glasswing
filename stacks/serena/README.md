# Serena

Serena provides code intelligence to host OpenCode over Streamable HTTP MCP.

- MCP: `http://127.0.0.1:9121/mcp`
- Dashboard: `http://127.0.0.1:24282/dashboard/index.html`
- Default repositories: `/home/ravik/src_git` → `/workspace/repos` (read-write)
- Infisical path: `/serena` (global settings only)

Both published ports are intentionally loopback-only.

## Additional repository roots

Copy the example override and replace its source and target paths:

```bash
cp stacks/serena/compose.override.example.yaml stacks/serena/compose.override.yaml
make up STACK=serena
```

`compose.override.yaml` is gitignored and is automatically included by the
Makefile. Prefer read-only mounts unless Serena must use its editing tools.

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
service can migrate the volume. Keep both published ports on loopback.
