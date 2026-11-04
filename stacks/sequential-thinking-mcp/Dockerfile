# Sequential Thinking MCP server over streamable HTTP.
#
# mcp-sequential-thinking is a Python package that provides persistent working
# memory (sessions, evidence, decisions, risks) backed by SQLite.
# supergateway (Node.js) bridges its stdio MCP interface to the streamable HTTP
# transport that OpenCode's remote MCP client speaks.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install the Python MCP server and Node.js supergateway bridge.
RUN pip install --no-cache-dir "mcp-sequential-thinking==0.7.0" \
 && apt-get update \
 && apt-get install -y --no-install-recommends curl procps wget \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/* \
 && npm install --global --no-fund --no-audit "supergateway@4.2.1"

# Persist SQLite database across container restarts.
VOLUME ["/data"]

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8000/healthz || exit 1

# supergateway bridges the stdio MCP server to streamable HTTP.
CMD ["sh", "-c", "exec supergateway \
  --stdio 'mcp-sequential-thinking' \
  --outputTransport streamableHttp \
  --port 8000 \
  --streamableHttpPath /mcp \
  --stateful \
  --healthEndpoint /healthz \
  --logLevel info"]
