# Steel MCP

Streamable HTTP MCP bridge for the Glasswing Steel browser service.

- Host endpoint: `http://127.0.0.1:8002/mcp`
- Container endpoint: `http://0.0.0.0:8000/mcp`
- Downstream service: `http://steel:3000` on the shared Docker network

The host binding is intentionally loopback-only. Start or validate it with:

```bash
make up STACK=steel-mcp
make check STACK=steel-mcp
```

The image builds Steel MCP 3.0.0 from pinned source and uses Supergateway's
stateful Streamable HTTP transport. Update the source commit, image tag, and
documentation together.
