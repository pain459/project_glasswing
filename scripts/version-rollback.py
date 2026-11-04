#!/usr/bin/env python3
"""
Glasswing version-rollback — swap current/previous versions in compose files.

Usage:
    python3 scripts/version-rollback.py stacks/versions.yaml <stack_name>
    python3 scripts/version-rollback.py stacks/versions.yaml __all__

This script:
1. Reads stacks/versions.yaml to get current and previous versions
2. Swaps them (current ← previous, previous ← old current)
3. Updates the compose.yaml files to use the rolled-back versions
4. Writes a rollback log to stacks/versions.rollback.log

The versions.yaml file is updated in-place so the rollback is persistent.
"""

import sys
import yaml
import re
import os
import datetime

# Map version registry keys to compose file image references
# Format: {version_key: (compose_file, image_pattern, replacement_prefix)}
VERSION_MAP = {
    # Core Infrastructure
    "infisical": ("stacks/infisical/compose.yaml", "infisical/infisical:", "infisical/infisical:"),
    "nginx": ("stacks/infisical/compose.yaml", "nginx:", "nginx:"),
    "portainer": ("stacks/portainer/compose.yaml", "portainer/portainer-ce:", "portainer/portainer-ce:"),
    "uptime-kuma": ("stacks/uptime-kuma/compose.yaml", "louislam/uptime-kuma:", "louislam/uptime-kuma:"),
    "adguard": ("stacks/adguard/compose.yaml", "adguard/adguardhome:", "adguard/adguardhome:"),
    "glances": ("stacks/glances/compose.yaml", "nicolargo/glances:", "nicolargo/glances:"),
    "vector": ("stacks/vector/compose.yaml", "timberio/vector:", "timberio/vector:"),
    "otel-collector": ("stacks/otel-collector/compose.yaml", "otel/opentelemetry-collector-contrib:", "otel/opentelemetry-collector-contrib:"),
    "docker-socket-proxy": ("stacks/wud/compose.yaml", "tecnativa/docker-socket-proxy:", "tecnativa/docker-socket-proxy:"),
    "wud": ("stacks/wud/compose.yaml", "ghcr.io/getwud/wud:", "ghcr.io/getwud/wud:"),

    # AI Platform
    "ollama": ("stacks/ollama/compose.yaml", "ollama/ollama:", "ollama/ollama:"),
    "anythingllm": ("stacks/anythingllm/compose.yaml", "mintplexlabs/anythingllm:", "mintplexlabs/anythingllm:"),
    "flowise": ("stacks/flowise/compose.yaml", "flowiseai/flowise:", "flowiseai/flowise:"),
    "langfuse": ("stacks/langfuse/compose.yaml", "docker.langfuse.com/langfuse/langfuse:", "docker.langfuse.com/langfuse/langfuse:"),
    "langfuse-worker": ("stacks/langfuse/compose.yaml", "docker.langfuse.com/langfuse/langfuse-worker:", "docker.langfuse.com/langfuse/langfuse-worker:"),
    "clickhouse": ("stacks/langfuse/compose.yaml", "clickhouse/clickhouse-server:", "clickhouse/clickhouse-server:"),
    "minio": ("stacks/langfuse/compose.yaml", "cgr.dev/chainguard/minio:", "cgr.dev/chainguard/minio:"),

    # Developer Workbench
    "forgejo": ("stacks/forgejo/compose.yaml", "codeberg.org/forgejo/forgejo:", "codeberg.org/forgejo/forgejo:"),
    "dbgate": ("stacks/dbgate/compose.yaml", "dbgate/dbgate:", "dbgate/dbgate:"),
    "excalidraw": ("stacks/excalidraw/compose.yaml", "excalidraw/excalidraw:", "excalidraw/excalidraw:"),
    "cyberchef": ("stacks/cyberchef/compose.yaml", "ghcr.io/gchq/cyberchef:", "ghcr.io/gchq/cyberchef:"),
    "it-tools": ("stacks/it-tools/compose.yaml", "ghcr.io/corentinth/it-tools:", "ghcr.io/corentinth/it-tools:"),

    # Research & Intelligence
    "searxng": ("stacks/searxng/compose.yaml", "searxng/searxng:", "searxng/searxng:"),
    "openobserve": ("stacks/openobserve/compose.yaml", "public.ecr.aws/zinclabs/openobserve:", "public.ecr.aws/zinclabs/openobserve:"),
    "jupyterlab": ("stacks/jupyterlab/compose.yaml", "quay.io/jupyter/scipy-notebook:", "quay.io/jupyter/scipy-notebook:"),
    "surrealdb": ("stacks/open-notebook/compose.yaml", "surrealdb/surrealdb:", "surrealdb/surrealdb:"),
    "open-notebook-app": ("stacks/open-notebook/compose.yaml", "lfnovo/open_notebook:", "lfnovo/open_notebook:"),

    # News Centre
    "glance": ("stacks/news-centre/compose.yaml", "glanceapp/glance:", "glanceapp/glance:"),
    "freshrss": ("stacks/news-centre/compose.yaml", "linuxserver/freshrss:", "linuxserver/freshrss:"),

    # Entertainment
    "plex": ("stacks/plex/compose.yaml", "plexinc/pms-docker:", "plexinc/pms-docker:"),
    "kavita": ("stacks/kavita/compose.yaml", "ghcr.io/kareadita/kavita:", "ghcr.io/kareadita/kavita:"),
    "paperless": ("stacks/paperless/compose.yaml", "ghcr.io/paperless-ngx/paperless-ngx:", "ghcr.io/paperless-ngx/paperless-ngx:"),
    "stirling-pdf": ("stacks/stirling-pdf/compose.yaml", "docker.stirlingpdf.com/stirlingtools/stirling-pdf:", "docker.stirlingpdf.com/stirlingtools/stirling-pdf:"),
    "homebox": ("stacks/homebox/compose.yaml", "ghcr.io/sysadminsmedia/homebox:", "ghcr.io/sysadminsmedia/homebox:"),
    "homepage": ("stacks/homepage/compose.yaml", "ghcr.io/gethomepage/homepage:", "ghcr.io/gethomepage/homepage:"),
    "datetime": ("stacks/datetime/compose.yaml", "ghcr.io/airyland/datetime.app:", "ghcr.io/airyland/datetime.app:"),
    "steel-browser": ("stacks/steel/compose.yaml", "ghcr.io/steel-dev/steel-browser:", "ghcr.io/steel-dev/steel-browser:"),

    # Shared infrastructure (used by multiple stacks)
    "postgres": None,  # Used by multiple stacks, handled specially
    "redis": None,
    "valkey": None,
}

# Map stack names to their version keys
STACK_VERSION_KEYS = {
    "infisical": ["infisical", "nginx", "postgres", "redis"],
    "portainer": ["portainer"],
    "uptime-kuma": ["uptime-kuma"],
    "adguard": ["adguard"],
    "glances": ["glances"],
    "vector": ["vector"],
    "otel-collector": ["otel-collector"],
    "wud": ["wud", "docker-socket-proxy"],
    "ollama": ["ollama"],
    "anythingllm": ["anythingllm"],
    "flowise": ["flowise"],
    "langfuse": ["langfuse", "langfuse-worker", "clickhouse", "minio", "postgres", "redis"],
    "forgejo": ["forgejo"],
    "dbgate": ["dbgate"],
    "excalidraw": ["excalidraw"],
    "cyberchef": ["cyberchef"],
    "it-tools": ["it-tools"],
    "searxng": ["searxng", "valkey"],
    "openobserve": ["openobserve"],
    "jupyterlab": ["jupyterlab"],
    "open-notebook": ["surrealdb", "open-notebook-app"],
    "news-centre": ["glance", "freshrss"],
    "plex": ["plex"],
    "kavita": ["kavita"],
    "paperless": ["paperless", "postgres", "valkey"],
    "stirling-pdf": ["stirling-pdf"],
    "homebox": ["homebox"],
    "homepage": ["homepage"],
    "datetime": ["datetime"],
    "steel": ["steel-browser"],
}


def load_versions(versions_file):
    """Load the versions.yaml file."""
    with open(versions_file) as f:
        return yaml.safe_load(f)


def save_versions(versions_file, data):
    """Save the versions.yaml file."""
    with open(versions_file, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)


def rollback_version(data, key):
    """Swap current and previous for a single version key."""
    if key not in data:
        return False, f"Version key '{key}' not found in {VERSIONS_FILE}"
    info = data[key]
    if not isinstance(info, dict):
        return False, f"Version entry '{key}' is not a dict"
    current = info.get("current")
    previous = info.get("previous")
    if not current or not previous:
        return False, f"Version entry '{key}' missing current or previous"
    # Swap
    info["current"] = previous
    info["previous"] = current
    return True, f"  {key}: {current} → {previous}"


def update_compose_file(compose_file, image_prefix, old_tag, new_tag):
    """Update a compose.yaml file to replace old_tag with new_tag for a given image prefix."""
    if not os.path.exists(compose_file):
        return False, f"Compose file {compose_file} not found"
    with open(compose_file) as f:
        content = f.read()
    # Replace the specific image tag
    pattern = re.escape(image_prefix) + re.escape(old_tag) + r"(?=[\s'\"]|$)"
    if re.search(pattern, content):
        new_content = re.sub(pattern, image_prefix + new_tag, content)
        with open(compose_file, "w") as f:
            f.write(new_content)
        return True, f"  Updated {compose_file}: {image_prefix}{old_tag} → {image_prefix}{new_tag}"
    return False, f"  Pattern {image_prefix}{old_tag} not found in {compose_file}"


def log_rollback(message):
    """Append a message to the rollback log."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_file = "stacks/versions.rollback.log"
    with open(log_file, "a") as f:
        f.write(f"[{timestamp}] {message}\n")


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/version-rollback.py <versions_file> <stack_name|__all__>")
        sys.exit(1)

    versions_file = sys.argv[1]
    target = sys.argv[2]

    data = load_versions(versions_file)

    if target == "__all__":
        # Rollback all version keys
        print("[INFO] Rolling back all versions")
        for key in data:
            ok, msg = rollback_version(data, key)
            if ok:
                print(msg)
                log_rollback(f"Rollback all: {key} {msg.strip()}")
        save_versions(versions_file, data)
        print(f"\n[PASS] All versions rolled back. Updated {versions_file}")
        log_rollback("Full rollback completed")
    else:
        # Rollback specific stack
        if target not in STACK_VERSION_KEYS:
            print(f"[FAIL] Unknown stack: {target}")
            print(f"Known stacks: {', '.join(sorted(STACK_VERSION_KEYS.keys()))}")
            sys.exit(1)

        version_keys = STACK_VERSION_KEYS[target]
        print(f"[INFO] Rolling back stack '{target}' (version keys: {', '.join(version_keys)})")

        changes = []
        for key in version_keys:
            ok, msg = rollback_version(data, key)
            if ok:
                print(msg)
                changes.append((key, msg.strip()))
                log_rollback(f"Rollback {target}: {msg.strip()}")
            else:
                print(f"[WARN] {msg}")

        save_versions(versions_file, data)
        print(f"\n[PASS] Stack '{target}' versions rolled back. Updated {versions_file}")
        log_rollback(f"Rollback {target} completed: {len(changes)} versions changed")


if __name__ == "__main__":
    main()
