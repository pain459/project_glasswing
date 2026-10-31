# REA MCP server over streamable HTTP.
#
# REA (Reverse Engineer Anything) is distributed as an npm package with
# pre-compiled dist/ included. supergateway bridges the stdio server
# to the streamable HTTP transport that OpenCode's remote MCP client speaks.
FROM node:22-alpine

RUN npm install --global --no-fund --no-audit "rea-agents@6.8.0" \
    "supergateway@4.2.1" \
 && apk add --no-cache procps

ENV NODE_ENV=production

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8000/healthz || exit 1

# supergateway bridges REA's stdio MCP to streamable HTTP.
# --stateful keeps one MCP session per client. REA uses session state for
# open binary targets, retained Evidence, and analysis settings across turns.
CMD ["sh", "-c", "exec supergateway \
  --stdio 'rea mcp' \
  --outputTransport streamableHttp \
  --port 8000 \
  --streamableHttpPath /mcp \
  --stateful \
  --healthEndpoint /healthz \
  --logLevel info"]
