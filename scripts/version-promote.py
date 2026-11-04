#!/usr/bin/env python3
"""
Glasswing version-promote — upgrade an image to a new version.

Updates stacks/versions.yaml (shifts current→previous, sets new current)
and then syncs all compose files via version-apply.py.

Usage:
    python3 scripts/version-promote.py stacks/versions.yaml <key> <new_version>
    python3 scripts/version-promote.py stacks/versions.yaml nginx 1.29-alpine

This is the "one knob" for upgrading any image:
  1. WUD detects a newer version
  2. You run: make version-promote KEY=nginx VERSION=1.29-alpine
  3. versions.yaml is updated, compose files are synced, stack is redeployed
"""

import sys
import yaml
import subprocess
import os


def main():
    if len(sys.argv) < 4:
        print("Usage: python3 scripts/version-promote.py <versions_file> <key> <new_version>")
        print()
        print("Example:")
        print("  python3 scripts/version-promote.py stacks/versions.yaml nginx 1.29-alpine")
        sys.exit(1)

    versions_file = sys.argv[1]
    key = sys.argv[2]
    new_version = sys.argv[3]

    # Load versions
    with open(versions_file) as f:
        data = yaml.safe_load(f)

    if key not in data:
        print(f"[FAIL] Version key '{key}' not found in {versions_file}")
        print("Available keys:")
        for k in sorted(data.keys()):
            entry = data[k]
            current = entry.get("current", "?") if isinstance(entry, dict) else "?"
            print(f"  {key}: {current}")
        sys.exit(1)

    entry = data[key]
    if not isinstance(entry, dict):
        print(f"[FAIL] Entry '{key}' is not a dict in {versions_file}")
        sys.exit(1)

    old_current = entry.get("current")
    old_previous = entry.get("previous")

    if not old_current:
        print(f"[FAIL] Entry '{key}' has no 'current' version")
        sys.exit(1)

    # Promote: shift current → previous, set new current
    entry["previous"] = old_current
    entry["current"] = new_version

    # Save
    with open(versions_file, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    print(f"[PROMOTE] {key}: {old_current} → {new_version}")
    print(f"  previous: {old_previous} → {old_current}")
    print()

    # Now apply to compose files
    print("[INFO] Syncing compose files...")
    result = subprocess.run(
        [sys.executable, "scripts/version-apply.py", versions_file],
        capture_output=True, text=True
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        print(f"[FAIL] version-apply failed (exit {result.returncode})")
        sys.exit(result.returncode)

    print()
    print(f"[PASS] {key} promoted to {new_version}. Compose files synced.")
    print(f"Run: make up STACK=<name> to redeploy")


if __name__ == "__main__":
    main()
