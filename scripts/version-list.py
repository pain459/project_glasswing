#!/usr/bin/env python3
"""
Glasswing version-list — show current and previous image versions.

Usage:
    python3 scripts/version-list.py stacks/versions.yaml
"""

import sys
import yaml


def main():
    versions_file = sys.argv[1] if len(sys.argv) > 1 else "stacks/versions.yaml"

    try:
        with open(versions_file) as f:
            data = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"[FAIL] {versions_file} not found")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"[FAIL] YAML parse error: {e}")
        sys.exit(1)

    print("=" * 60)
    print(" Glasswing Image Version Registry")
    print("=" * 60)
    print()
    print(f"{'Service':<25} {'Current':<20} {'Previous':<20}")
    print("-" * 65)

    for service, info in sorted(data.items()):
        if isinstance(info, dict):
            current = info.get("current", "?")
            previous = info.get("previous", "?")
            print(f"{service:<25} {current:<20} {previous:<20}")

    print()
    print(f"Total: {len(data)} image versions tracked")


if __name__ == "__main__":
    main()
