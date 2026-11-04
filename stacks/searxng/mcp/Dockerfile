# syntax=docker/dockerfile:1
# SearXNG MCP server for Glasswing.
# Upstream: https://github.com/bumbaRasch/searxng-mcp-server
#
# Architecture (consistent with REA and Sequential Thinking MCP):
#   OpenCode (MCP Client)
#       ↓ HTTP → supergateway (streamable HTTP)
#       ↓ stdio → searxng-mcp-server (stdio transport)
#       ↓ HTTP → SearXNG instance (JSON API)
#
# supergateway bridges the stdio MCP protocol to streamable HTTP, avoiding
# the @modelcontextprotocol/server@2.x legacy protocol incompatibility.

FROM docker.io/library/node:24-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN git clone --depth 1 https://github.com/bumbaRasch/searxng-mcp-server.git .
RUN corepack enable
RUN pnpm install --frozen-lockfile
RUN pnpm build && pnpm prune --prod

FROM docker.io/library/node:24-slim
RUN npm install --global --no-fund --no-audit "supergateway@4.2.1"
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8000/healthz', r => { r.on('data',()=>{}); r.on('end',()=>process.exit(0)); }).on('error',()=>process.exit(1))" || exit 1

# supergateway bridges the MCP server's stdio transport to streamable HTTP.
# SEARXNG_TRANSPORT=stdio tells the server to use stdio (default).
CMD ["sh", "-c", "exec supergateway \
  --stdio 'node dist/index.js' \
  --outputTransport streamableHttp \
  --port 8000 \
  --streamableHttpPath /mcp \
  --stateful \
  --healthEndpoint /healthz \
  --logLevel info"]