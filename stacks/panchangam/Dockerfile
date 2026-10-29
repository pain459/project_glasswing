# Stage 1: Build the Vite SPA from the cloned source
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies
COPY src/package.json src/package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build the SPA
COPY src/ .
RUN npm run build:site

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built SPA into nginx's document root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the pre-generated ICS feed files (the SPA fetches them from /feeds/)
COPY --from=build /app/feeds /usr/share/nginx/html/feeds

# Use custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:80 || exit 1
