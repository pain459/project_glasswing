FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# open-notebook-mcp 0.3.0 imports FastMCP, which was removed in MCP 2.x.
RUN pip install "mcp==1.30.0" "open-notebook-mcp==0.3.0"

WORKDIR /app

RUN useradd --create-home --uid 1000 app
COPY --chown=app:app server.py /app/server.py

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import socket; socket.create_connection(('127.0.0.1', 8000), 3).close()" || exit 1

CMD ["python", "/app/server.py"]
