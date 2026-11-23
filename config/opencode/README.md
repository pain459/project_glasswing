# OpenCode configuration — tracked snapshot

`opencode.example.json` is a **sanitized copy** of the active host config at
`~/.config/opencode/opencode.json`. It is checked into git so the model IDs,
context limits, MCP endpoints, and LiteLLM wiring are reviewable and restorable.

It is deliberately not a symlink, and it must never contain a real API key.
The LiteLLM key is stored as:

```
sk-litellm-glasswing-REPLACE_WITH_LITELLM_MASTER_KEY
```

## Refresh the snapshot

From the repository root:

```bash
./scripts/sync-opencode-config.sh              # host -> repo, redacted
DRY_RUN=1 ./scripts/sync-opencode-config.sh    # preview only
```

The sync script:

- reads `OPENCODE_SOURCE` (default `~/.config/opencode/opencode.json`)
- redacts keys that look like secrets and any `sk-`/`hf-`/`ghp-`/`github_pat_`/`Bearer` values
- writes `config/opencode/opencode.example.json` with mode `0644`
- refuses to write if a secret pattern survives redaction

Override the destination with `OPENCODE_TRACKED` if needed.

## Restore on a new host

```bash
./scripts/restore-opencode-config.sh
```

The restore script:

- copies the tracked snapshot to `OPENCODE_TARGET` (default `~/.config/opencode/opencode.json`)
- backs up an existing config first
- prompts for the LiteLLM master key **without echo**, or accepts `LITELLM_MASTER_KEY`
- writes only the host file with mode `0600`; the key never enters the repo
- validates the JSON and prints the next steps

Set `FORCE=1` to skip the overwrite prompt. Set `LITELLM_MASTER_KEY` to supply
the key non-interactively.

## What is tracked where

| Concern | File |
|---|---|
| Host OpenCode config (sanitized) | `config/opencode/opencode.example.json` |
| Backend auto-switch plugin | `.opencode/plugins/vllm-autoswitch.ts` |
| Model → port source of truth | `stacks/vllm/model-registry.yaml` |
| Switch implementation | `stacks/vllm/switch-model.sh` |
| GPU arbitration | `scripts/gpu-mode.sh` |

None of these are symlinks. The two scripts above are the only bridge between
the host config and the repository.
