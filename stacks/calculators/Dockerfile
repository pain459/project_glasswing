FROM nginx:alpine

# Copy static site files into nginx's document root
COPY ./public /usr/share/nginx/html

# Expose HTTP
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:80 || exit 1
