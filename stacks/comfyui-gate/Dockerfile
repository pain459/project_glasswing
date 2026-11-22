# syntax=docker/dockerfile:1
# Tiny always-on dispatcher for ComfyUI on :3042.
# aiohttp gives us both HTTP streaming and WebSocket passthrough in one process.
FROM python:3.12-slim

RUN pip install --no-cache-dir --disable-pip-version-check "aiohttp==3.11.18"

WORKDIR /app
COPY app.py .

ENV PYTHONUNBUFFERED=1 \
    PORT=80

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:80/health', timeout=3)" || exit 1

CMD ["python", "app.py"]
