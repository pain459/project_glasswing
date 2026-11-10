# sudokUI — self-hosted sudoku (Glasswing build)
# Static PWA + a small Node server that renders /p/ and /daily/ share pages.
# The daily global-stats API and telemetry are Cloudflare-specific (D1 /
# Analytics Engine) and are not available here; the app still plays fully.

FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The build runs build-indexnow.ts, which fails unless the IndexNow key file
# (public/<32-hex>.txt) is present and correct. It ships in the repo, so the
# build succeeds as-is.
RUN npm run build

FROM node:22-bookworm AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Copy the built site, the server, and the content modules the server imports
# (share.ts, home.ts, dailies.ts, dailies.json, slugs.ts, ratings.ts, locales).
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/src/content ./src/content
COPY --from=build /app/src/engine ./src/engine
COPY --from=build /app/src/state ./src/state
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
RUN npm ci --omit=dev && npm install --no-save vite-node@2.1.9
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=60s \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node_modules/.bin/vite-node", "server.mjs"]
