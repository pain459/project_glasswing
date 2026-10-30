# Serena

Serena provides code intelligence to host OpenCode over Streamable HTTP MCP.

- MCP: `http://127.0.0.1:9121/mcp`
- Dashboard: `http://127.0.0.1:24282/dashboard`
- Default repositories: `/home/ravik/src_git` → `/workspace/repos` (read-write)

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
```

The one-shot init service owns the persistent configuration volume as UID/GID
1000 before Serena starts. The checked-in configuration is mounted as a nested
read-only file, so the volume cannot mask it.
