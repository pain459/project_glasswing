#!/usr/bin/env bash
# Snapshot the host OpenCode config into the repository for tracking.
#
# This is a COPY, not a symlink. Secrets are redacted before anything is
# written to the repo. Use restore-opencode-config.sh to install it elsewhere.
#
# Usage:
#   ./scripts/sync-opencode-config.sh              # sync host -> repo
#   DRY_RUN=1 ./scripts/sync-opencode-config.sh    # show changes only
#   OPENCODE_SOURCE=/path/to/opencode.json ./scripts/sync-opencode-config.sh
#   OPENCODE_TRACKED=/path/to/config.json ./scripts/sync-opencode-config.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${OPENCODE_SOURCE:-${HOME}/.config/opencode/opencode.json}"
DEST="${OPENCODE_TRACKED:-${REPO_ROOT}/config/opencode/opencode.example.json}"
DRY_RUN="${DRY_RUN:-0}"

if [[ ! -f "$SOURCE" ]]; then
  echo "ERROR: source config not found: $SOURCE" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is required." >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"

python3 - "$SOURCE" "$DEST" "$DRY_RUN" <<'PY'
import difflib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

source = Path(sys.argv[1])
dest = Path(sys.argv[2])
dry_run = sys.argv[3] == "1"

PLACEHOLDER = "sk-litellm-glasswing-REPLACE_WITH_LITELLM_MASTER_KEY"
SECRET_KEY = re.compile(
    r"^(api[_-]?key|authorization|password|secret|token|access[_-]?token|"
    r"refresh[_-]?token|client[_-]?secret)$",
    re.I,
)
SECRET_VALUE = re.compile(
    r"(sk-[A-Za-z0-9_-]{8,}|hf_[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{8,}|"
    r"github_pat_[A-Za-z0-9_]{8,}|Bearer\s+\S+)",
    re.I,
)

with source.open(encoding="utf-8") as fh:
    data = json.load(fh)

redacted = []


def clean(value, path=""):
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            child = f"{path}.{key}" if path else str(key)
            if SECRET_KEY.match(str(key)) and isinstance(item, str):
                out[key] = PLACEHOLDER
                redacted.append(child)
            else:
                out[key] = clean(item, child)
        return out
    if isinstance(value, list):
        return [clean(item, f"{path}[{i}]") for i, item in enumerate(value)]
    if isinstance(value, str) and SECRET_VALUE.search(value):
        redacted.append(path)
        return "<redacted-by-sync>"
    return value


cleaned = clean(data)
text = json.dumps(cleaned, indent=2, ensure_ascii=False) + "\n"

# Final safety net: the placeholder itself matches the sk- pattern, so strip it.
probe = text.replace(PLACEHOLDER, "")
if SECRET_VALUE.search(probe):
    raise SystemExit("ERROR: redaction failed; refusing to write a secret into the repo.")

old = dest.read_text(encoding="utf-8") if dest.exists() else ""
if old == text:
    print(f"[sync] no changes: {dest}")
else:
    diff = list(difflib.unified_diff(
        old.splitlines(keepends=True),
        text.splitlines(keepends=True),
        fromfile=str(dest),
        tofile=f"{dest} (sanitized)",
    ))
    if dry_run:
        print(f"[sync] DRY RUN - would update {dest}")
        sys.stdout.writelines(diff[:120])
    else:
        fd, tmp = tempfile.mkstemp(dir=str(dest.parent), prefix=".opencode-sync-")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(text)
            os.chmod(tmp, 0o644)
            os.replace(tmp, dest)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
        print(f"[sync] updated {dest}")
        sys.stdout.writelines(diff[:120])

print(f"[sync] source: {source}")
print(f"[sync] redacted fields: {', '.join(redacted) if redacted else 'none'}")
print("[sync] no symlinks created; this is a sanitized copy for version control.")
PY
