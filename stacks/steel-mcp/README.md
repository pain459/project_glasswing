# Steel MCP

Streamable HTTP MCP bridge for the Glasswing Steel browser service.

- Host endpoint: `http://127.0.0.1:8002/mcp`
- Container endpoint: `http://0.0.0.0:8000/mcp`
- Downstream service: `http://steel:3000` on the shared Docker network
- Infisical path: `/steel` (global settings only; no gateway secret)

The host binding is intentionally loopback-only. Start or validate it with:

```bash
make up STACK=steel-mcp
make check STACK=steel-mcp
python3 scripts/mcp-preflight.py --name steel http://127.0.0.1:8002/mcp
```

Host OpenCode configures this as a remote MCP URL with OAuth disabled. If the
MCP probe passes but browser operations fail, check `make ps STACK=steel` and
the Steel API/CDP listeners before rebuilding the gateway.

The image builds Steel MCP 3.0.0 from pinned source and uses Supergateway's
stateful Streamable HTTP transport. Update the source commit, image tag, and
documentation together.
