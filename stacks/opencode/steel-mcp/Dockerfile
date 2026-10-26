# Steel MCP server over streamable HTTP.
#
# steel-mcp 3.0.0 is only distributed as source (GitHub releases), so it is
# built here at a pinned commit. supergateway bridges the stdio server to the
# streamable HTTP transport that OpenCode's remote MCP client speaks.
FROM node:22-alpine AS build

ARG STEEL_MCP_COMMIT=f28a17571b10053e3df5e4bbbc4d3bc30f58ba39

RUN apk add --no-cache git

WORKDIR /src

RUN git init -q . \
 && git remote add origin https://github.com/steel-dev/steel-mcp-server.git \
 && git fetch -q --depth 1 origin "${STEEL_MCP_COMMIT}" \
 && git checkout -q FETCH_HEAD

RUN npm ci --ignore-scripts \
 && npm run build \
 && npm prune --omit=dev


FROM node:22-alpine

RUN npm install --global --no-fund --no-audit "supergateway@4.2.1"

WORKDIR /app

COPY --from=build /src/dist ./dist
COPY --from=build /src/node_modules ./node_modules
COPY --from=build /src/package.json ./package.json

ENV STEEL_LOCAL=true \
    NODE_ENV=production

RUN chown -R node:node /app
USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8000/healthz || exit 1

# --stateful keeps one MCP session per client, which is what the browser tools
# need: they hand back a session_id that later calls resolve against.
CMD ["sh", "-c", "exec supergateway \
  --stdio 'node /app/dist/stdio.js' \
  --outputTransport streamableHttp \
  --port 8000 \
  --streamableHttpPath /mcp \
  --stateful \
  --healthEndpoint /healthz \
  --logLevel info"]
