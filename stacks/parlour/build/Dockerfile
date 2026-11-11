# parlour — cozy browser card games (Glasswing build)
# Static export from Next.js (output: 'export'). Served by the project's
# own zero-dependency static server (apps/web/scripts/serve-export.mjs).
# Multiplayer is peer-to-peer (WebRTC) — no game server needed.

FROM node:22-bookworm AS build
RUN npm install -g pnpm@10.30.3
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY apps/web/ apps/web/
RUN pnpm --filter @parlour/web... build

FROM node:22-bookworm AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/web/out ./out
COPY --from=build /app/apps/web/scripts/serve-export.mjs ./serve-export.mjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "serve-export.mjs", "out", "3000"]
