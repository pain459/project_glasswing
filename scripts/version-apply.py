#!/usr/bin/env python3
"""
Glasswing version-apply — sync compose files to match stacks/versions.yaml.

Reads the central version registry and updates every compose.yaml so that
image tags match the pinned versions. This is the single source of truth:
  versions.yaml  →  compose files

Usage:
    python3 scripts/version-apply.py stacks/versions.yaml [--dry-run]

Exit codes:
    0  — all compose files are already in sync (or changes applied)
    1  — error reading versions.yaml or a compose file
    2  — compose files are out of sync (used by make version-check)
"""

import sys
import os
import re
import yaml

# ---------------------------------------------------------------------------
# Mapping: versions.yaml key  →  (compose_file, image_prefix)
#
# image_prefix is the part before the tag, e.g. "nginx:" or
# "ghcr.io/getwud/wud:". The script replaces whatever tag follows that
# prefix with the pinned version from versions.yaml.
#
# Shared images (postgres, redis, valkey) appear in multiple stacks;
# list every occurrence.
# ---------------------------------------------------------------------------

VERSION_MAP = [
    # --- Core Infrastructure ---
    ("infisical",      "stacks/infisical/compose.yaml",      "infisical/infisical:"),
    ("nginx",          "stacks/infisical/compose.yaml",      "nginx:"),
    ("postgres",       "stacks/infisical/compose.yaml",      "postgres:"),
    ("redis",          "stacks/infisical/compose.yaml",      "redis:"),

    ("portainer",      "stacks/portainer/compose.yaml",      "portainer/portainer-ce:"),
    ("uptime-kuma",    "stacks/uptime-kuma/compose.yaml",    "louislam/uptime-kuma:"),
    ("adguard",        "stacks/adguard/compose.yaml",        "adguard/adguardhome:"),
    ("glances",        "stacks/glances/compose.yaml",        "nicolargo/glances:"),
    ("vector",         "stacks/vector/compose.yaml",         "timberio/vector:"),
    ("otel-collector", "stacks/otel-collector/compose.yaml", "otel/opentelemetry-collector-contrib:"),

    ("docker-socket-proxy", "stacks/wud/compose.yaml",       "tecnativa/docker-socket-proxy:"),
    ("wud",                "stacks/wud/compose.yaml",        "ghcr.io/getwud/wud:"),

    # --- AI Platform ---
    ("ollama",         "stacks/ollama/compose.yaml",         "ollama/ollama:"),
    ("anythingllm",    "stacks/anythingllm/compose.yaml",    "mintplexlabs/anythingllm:"),
    ("flowise",        "stacks/flowise/compose.yaml",        "flowiseai/flowise:"),

    ("langfuse",           "stacks/langfuse/compose.yaml",   "docker.langfuse.com/langfuse/langfuse:"),
    ("langfuse-worker",    "stacks/langfuse/compose.yaml",   "docker.langfuse.com/langfuse/langfuse-worker:"),
    ("clickhouse",         "stacks/langfuse/compose.yaml",   "clickhouse/clickhouse-server:"),
    ("minio",              "stacks/langfuse/compose.yaml",   "cgr.dev/chainguard/minio:"),
    ("postgres",           "stacks/langfuse/compose.yaml",   "postgres:"),
    ("redis",              "stacks/langfuse/compose.yaml",   "redis:"),

    # --- Developer Workbench ---
    ("forgejo",    "stacks/forgejo/compose.yaml",    "codeberg.org/forgejo/forgejo:"),
    ("dbgate",     "stacks/dbgate/compose.yaml",     "dbgate/dbgate:"),
    ("excalidraw", "stacks/excalidraw/compose.yaml", "excalidraw/excalidraw:"),
    ("cyberchef",  "stacks/cyberchef/compose.yaml",  "ghcr.io/gchq/cyberchef:"),
    ("it-tools",   "stacks/it-tools/compose.yaml",   "ghcr.io/corentinth/it-tools:"),

    # --- Research & Intelligence ---
    ("searxng",     "stacks/searxng/compose.yaml",   "searxng/searxng:"),
    ("valkey",      "stacks/searxng/compose.yaml",   "valkey/valkey:"),
    ("openobserve", "stacks/openobserve/compose.yaml","public.ecr.aws/zinclabs/openobserve:"),
    ("jupyterlab",  "stacks/jupyterlab/compose.yaml", "quay.io/jupyter/scipy-notebook:"),

    ("surrealdb",        "stacks/open-notebook/compose.yaml", "surrealdb/surrealdb:"),
    ("open-notebook-app","stacks/open-notebook/compose.yaml", "lfnovo/open_notebook:"),

    # --- News Centre ---
    ("glance",     "stacks/news-centre/compose.yaml", "glanceapp/glance:"),
    ("freshrss",   "stacks/news-centre/compose.yaml", "linuxserver/freshrss:"),

    # --- Entertainment ---
    ("plex",       "stacks/plex/compose.yaml",        "plexinc/pms-docker:"),
    ("kavita",     "stacks/kavita/compose.yaml",      "ghcr.io/kareadita/kavita:"),
    ("paperless",  "stacks/paperless/compose.yaml",   "ghcr.io/paperless-ngx/paperless-ngx:"),
    ("postgres",   "stacks/paperless/compose.yaml",   "postgres:"),
    ("valkey",     "stacks/paperless/compose.yaml",   "valkey/valkey:"),
    ("stirling-pdf","stacks/stirling-pdf/compose.yaml","docker.stirlingpdf.com/stirlingtools/stirling-pdf:"),
    ("homebox",    "stacks/homebox/compose.yaml",     "ghcr.io/sysadminsmedia/homebox:"),
    ("homepage",   "stacks/homepage/compose.yaml",    "ghcr.io/gethomepage/homepage:"),
    ("datetime",   "stacks/datetime/compose.yaml",    "ghcr.io/airyland/datetime.app:"),
    ("steel-browser","stacks/steel/compose.yaml",     "ghcr.io/steel-dev/steel-browser:"),
]


def load_versions(path):
    with open(path) as f:
        return yaml.safe_load(f)


def get_pinned(versions, key):
    """Return the current pinned tag for a version key."""
    entry = versions.get(key)
    if isinstance(entry, dict):
        return entry.get("current")
    return None


def find_tag_in_line(line, prefix):
    """
    Given a compose.yaml line like:
        image: nginx:stable-alpine
    and prefix "nginx:", return the current tag "stable-alpine".
    Returns None if the prefix is not found on an image: line.
    """
    # Only process lines that start with "image:" (with optional whitespace)
    stripped = line.strip()
    if not stripped.startswith("image:") and not stripped.startswith("image :"):
        return None

    # Match the prefix followed by a tag (everything after : until whitespace/quote/end)
    pattern = re.escape(prefix) + r'(\S+)'
    m = re.search(pattern, line)
    if m:
        tag = m.group(1).strip("'\"")
        return tag
    return None


def apply_to_compose(compose_path, prefix, expected_tag):
    """
    Update the image tag in a compose file to match expected_tag.
    Returns (changed: bool, old_tag: str | None).
    """
    if not os.path.isfile(compose_path):
        print(f"  [WARN] {compose_path} not found, skipping")
        return False, None

    with open(compose_path) as f:
        lines = f.readlines()

    new_lines = []
    changed = False
    old_tag = None

    for line in lines:
        # Only look at lines that contain an image reference with our prefix
        tag = find_tag_in_line(line, prefix)
        if tag and tag != expected_tag:
            old_tag = tag
            # Replace the tag in the line
            pattern = re.escape(prefix) + re.escape(tag)
            new_line = re.sub(pattern, prefix + expected_tag, line)
            new_lines.append(new_line)
            changed = True
        else:
            new_lines.append(line)

    if changed:
        with open(compose_path, "w") as f:
            f.writelines(new_lines)

    return changed, old_tag


def main():
    dry_run = "--dry-run" in sys.argv
    check_only = "--check" in sys.argv

    versions_file = "stacks/versions.yaml"
    for arg in sys.argv[1:]:
        if arg.endswith(".yaml") or arg.endswith(".yml"):
            versions_file = arg

    versions = load_versions(versions_file)

    total = 0
    applied = 0
    drift = 0

    if dry_run:
        print("[DRY-RUN] Version apply — no files will be modified")
    elif check_only:
        print("[CHECK] Version sync — checking compose files against versions.yaml")
    else:
        print("[APPLY] Version sync — updating compose files to match versions.yaml")

    for key, compose_path, prefix in VERSION_MAP:
        expected = get_pinned(versions, key)
        if expected is None:
            print(f"  [WARN] No pinned version for '{key}', skipping")
            continue

        total += 1
        changed, old_tag = apply_to_compose(compose_path, prefix, expected)

        if changed:
            applied += 1
            if not check_only:
                print(f"  [CHANGE] {compose_path}: {prefix}{old_tag} → {prefix}{expected}")
            else:
                print(f"  [DRIFT]  {compose_path}: has {prefix}{old_tag}, expects {prefix}{expected}")
        else:
            # Check if there's a mismatch that wasn't caught (tag already correct or not found)
            # Only search image: lines to avoid false positives from connection URIs
            if os.path.isfile(compose_path):
                with open(compose_path) as f:
                    for content_line in f:
                        tag = find_tag_in_line(content_line, prefix)
                        if tag and tag != expected:
                            drift += 1
                            if check_only:
                                print(f"  [DRIFT]  {compose_path}: has {prefix}{tag}, expects {prefix}{expected}")
                            break

    print()
    print(f"Total references checked: {total}")
    print(f"Changes needed: {applied}")

    if check_only:
        if applied > 0 or drift > 0:
            print(f"\n[FAIL] {applied + drift} compose file(s) out of sync with versions.yaml")
            print("Run: make version-apply")
            sys.exit(2)
        else:
            print("\n[PASS] All compose files are in sync")
            sys.exit(0)
    elif dry_run:
        print("\n[Dry run complete — re-run without --dry-run to apply]")
    else:
        if applied > 0:
            print(f"\n[PASS] Applied {applied} version update(s)")
        else:
            print("\n[PASS] All compose files already in sync")


if __name__ == "__main__":
    main()
