FROM ghcr.io/oraios/serena@sha256:0b0ff857c2eca5094aa3b4f406e58ba3cacf647b20d237adcfbbeadffc14cd65

# Upstream bundles Node under /root/.nvm, but this stack runs as uid 1000 and
# cannot traverse /root. Publish the already-pinned Node 22 runtime and npm in
# conventional system paths so Serena can start Node-backed language servers.
USER root
ENV NPM_CONFIG_CACHE=/tmp/npm-cache
ENV UV_CACHE_DIR=/tmp/uv-cache
ENV UV_PYTHON_INSTALL_DIR=/tmp/uv-python
ENV UV_TOOL_DIR=/tmp/uv-tools
RUN groupadd --gid 1000 serena \
 && useradd --uid 1000 --gid 1000 --home-dir /workspaces/serena \
      --shell /usr/sbin/nologin --no-create-home serena \
 && install -m 0755 \
      "/root/.nvm/versions/node/v${NODE_VERSION}/bin/node" \
      /usr/local/bin/node \
 && install -m 0755 /root/.local/bin/uv /usr/local/bin/uv \
 && install -m 0755 /root/.local/bin/uvx /usr/local/bin/uvx \
 && cp -a "/root/.nvm/versions/node/v${NODE_VERSION}/lib/node_modules" /usr/local/lib/ \
 && ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && node --version \
 && npm --version \
 && uv --version
