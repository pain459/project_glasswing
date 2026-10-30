import os

from mcp.server.transport_security import TransportSecuritySettings
from open_notebook_mcp.server import mcp

# open-notebook-mcp 0.3.0 passes host/port to FastMCP.run(), which does not
# accept them in MCP 1.x. Configure the server object instead.
mcp.settings.host = os.getenv("HOST", "0.0.0.0")
mcp.settings.port = int(os.getenv("PORT", "8000"))
mcp.settings.streamable_http_path = os.getenv("MCP_PATH", "/mcp")
mcp.settings.stateless_http = os.getenv("STATELESS_HTTP", "1") == "1"
mcp.settings.json_response = os.getenv("JSON_RESPONSE", "1") == "1"

# FastMCP's DNS-rebinding protection only accepts localhost by default. The
# OpenCode container reaches this server as http://open-notebook-mcp:8000, so
# allow exactly that host name instead of disabling the check.
allowed_hosts = [h.strip() for h in os.getenv("MCP_ALLOWED_HOSTS", "").split(",") if h.strip()]
mcp.settings.transport_security = TransportSecuritySettings(
    enable_dns_rebinding_protection=True,
    allowed_hosts=allowed_hosts,
    allowed_origins=[f"http://{host}" for host in allowed_hosts],
)

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
