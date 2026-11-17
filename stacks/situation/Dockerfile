FROM python:3.12-slim

# The situation brief is a single self-contained script that uses only the
# standard library (urllib, json, os, sys). No pip installs needed.
#
# The container is a one-shot worker: it runs brief.py, delivers to Telegram,
# and exits. Dagu (or `make situation`) invokes it on schedule.

WORKDIR /app
COPY brief.py /app/brief.py
COPY listener.py /app/listener.py
COPY paperless-tags.list /app/paperless-tags.list

# Run as root to access the Docker socket (mounted read-only).
# The brief is a short-lived worker, not a long-running service, so the
# security risk is minimal.

ENTRYPOINT ["python", "/app/brief.py"]
