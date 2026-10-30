# Open Notebook MCP

Streamable HTTP MCP bridge for the Glasswing Open Notebook service.

- Host endpoint: `http://127.0.0.1:8001/mcp`
- Container endpoint: `http://0.0.0.0:8000/mcp`
- Downstream API: `http://open_notebook:5055` on the shared Docker network
- Infisical path: `/open-notebook`

The host binding is intentionally loopback-only. Start or validate it with:

```bash
make up STACK=open-notebook-mcp
make check STACK=open-notebook-mcp
```

`open-notebook-mcp==0.3.0` requires the compatibility wrapper in `server.py`
and `mcp==1.30.0`; update those together.
