#!/usr/bin/env bash
# Restore the tracked OpenCode config onto a host, with guidance.
#
# This script COPIES the sanitized repository config into place. It never
# creates a symlink. Any existing config is backed up first. The LiteLLM key
# is prompted for without echo and is written only to the host config (0600);
# it is never stored in the repository.
#
# Usage:
#   ./scripts/restore-opencode-config.sh
#   LITELLM_MASTER_KEY='...' FORCE=1 ./scripts/restore-opencode-config.sh
#   OPENCODE_TARGET=/path/to/opencode.json ./scripts/restore-opencode-config.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRACKED="${OPENCODE_TRACKED:-${REPO_ROOT}/config/opencode/opencode.example.json}"
TARGET="${OPENCODE_TARGET:-${HOME}/.config/opencode/opencode.json}"
FORCE="${FORCE:-0}"

say() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

say "=== Restore host OpenCode config ==="
say ""
say "This will:"
say "  1. Copy $TRACKED"
say "     to   $TARGET"
say "  2. Back up any existing file first"
say "  3. Ask for the LiteLLM master key (not echoed, never written to the repo)"
say "  4. Set mode 0600 and validate the JSON"
say ""

[[ -f "$TRACKED" ]] || die "tracked config not found: $TRACKED. Run scripts/sync-opencode-config.sh first."
command -v python3 >/dev/null 2>&1 || die "python3 is required."

mkdir -p "$(dirname "$TARGET")"

if [[ -e "$TARGET" ]]; then
  if [[ "$FORCE" != "1" ]]; then
    read -r -p "Overwrite existing $TARGET? [y/N] " answer
    [[ "$answer" =~ ^[Yy]$ ]] || die "aborted; nothing was changed."
  fi
  backup="${TARGET}.bak.$(date +%Y%m%d%H%M%S)"
  cp -p "$TARGET" "$backup"
  chmod 600 "$backup"
  say "[restore] existing config backed up to: $backup"
fi

KEY_SOURCE=""
if [[ -n "${LITELLM_MASTER_KEY:-}" ]]; then
  KEY_SOURCE="environment"
  key="$LITELLM_MASTER_KEY"
else
  read -r -s -p "LiteLLM master key (Enter to keep the placeholder): " key
  echo
  KEY_SOURCE="prompt"
fi

export LITELLM_MASTER_KEY="$key"

python3 - "$TRACKED" "$TARGET" "$KEY_SOURCE" <<'PY'
import json
import os
import sys
import tempfile
from pathlib import Path

tracked = Path(sys.argv[1])
target = Path(sys.argv[2])
key_source = sys.argv[3]
key = os.environ.get("LITELLM_MASTER_KEY", "")
placeholder = "sk-litellm-glasswing-REPLACE_WITH_LITELLM_MASTER_KEY"

with tracked.open(encoding="utf-8") as fh:
    data = json.load(fh)

replaced = 0


def walk(value):
    global replaced
    if isinstance(value, dict):
        return {k: walk(v) for k, v in value.items()}
    if isinstance(value, list):
        return [walk(v) for v in value]
    if isinstance(value, str) and placeholder in value:
        if not key:
            return value
        replaced += 1
        return value.replace(placeholder, key)
    return value


data = walk(data)
text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

fd, tmp = tempfile.mkstemp(dir=str(target.parent), prefix=".opencode-restore-")
try:
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(text)
    os.chmod(tmp, 0o600)
    os.replace(tmp, target)
finally:
    if os.path.exists(tmp):
        os.unlink(tmp)

# Re-read to prove the installed file is valid JSON.
with target.open(encoding="utf-8") as fh:
    json.load(fh)

if replaced:
    print(f"[restore] installed {target} (key supplied via {key_source}, placeholder replaced in {replaced} field(s))")
elif key:
    print(f"[restore] installed {target} (key supplied via {key_source}; no placeholder found)")
else:
    print(f"[restore] installed {target} with PLACEHOLDER - replace it before using LiteLLM")
print("[restore] mode 0600, JSON valid, no symlink created.")
PY

say ""
say "=== Next steps in the new environment ==="
say "  1. Start the inference stacks:"
say "       make up STACK=vllm"
say "       make up STACK=tei"
say "       make up STACK=litellm"
say "  2. Confirm the backend:  make vllm-model current"
say "  3. Restart OpenCode (or run /reload in the TUI). The project-local plugin"
say "     .opencode/plugins/vllm-autoswitch.ts is already in this repo and loads"
say "     automatically when OpenCode is launched from the repository root."
say "  4. Verify model switching with:  make vllm-model MODEL=qwen3.6"
say ""
say "Related tracked files (no symlinks):"
say "  config/opencode/opencode.example.json   sanitized host config snapshot"
say "  .opencode/plugins/vllm-autoswitch.ts    backend switching plugin"
say "  stacks/vllm/model-registry.yaml         model -> port/source of truth"
say "  stacks/vllm/switch-model.sh             switch implementation"
