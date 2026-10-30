#!/usr/bin/env python3
"""Report published Compose ports for Glasswing policy checks."""

from __future__ import annotations

import argparse
import collections
import pathlib
import re


HOST = r"(?P<host>\$\{[^}]+\}|\d+\.\d+\.\d+\.\d+)"
BOUND = re.compile(r'-\s*["\']?' + HOST + r":(?P<host_port>\d+):(?P<container_port>\d+)")
UNBOUND = re.compile(r'-\s*["\']?(?P<host_port>\d+):(?P<container_port>\d+)["\']?\s*(?:/tcp)?\s*$')


def scan(root: pathlib.Path) -> list[str]:
    published: dict[str, set[str]] = collections.defaultdict(set)
    literals: dict[str, set[str]] = collections.defaultdict(set)
    loopback: dict[str, set[str]] = collections.defaultdict(set)
    unbound: list[str] = []

    for compose in sorted((root / "stacks").glob("*/compose.yaml")):
        stack = compose.parent.name
        for line in compose.read_text().splitlines():
            match = BOUND.search(line)
            if match:
                host = match.group("host")
                port = match.group("host_port")
                published[port].add(stack)
                if host == "127.0.0.1":
                    loopback[port].add(stack)
                elif not host.startswith("${"):
                    literals[stack].add(port)
                continue

            match = UNBOUND.search(line.strip())
            if match:
                port = match.group("host_port")
                published[port].add(stack)
                unbound.append(f"{stack}:{port}")

    report: list[str] = []
    for port, stacks in sorted(published.items(), key=lambda item: int(item[0])):
        if len(stacks) > 1:
            report.append(f"DUP {port} {' '.join(sorted(stacks))}")
    for stack, ports in sorted(literals.items()):
        report.append(f"LITERAL {stack} {','.join(sorted(ports, key=int))}")
    for port, stacks in sorted(loopback.items(), key=lambda item: int(item[0])):
        report.append(f"LOOPBACK {port} {' '.join(sorted(stacks))}")
    for item in sorted(unbound):
        report.append(f"UNBOUND {item}")
    report.append(f"COUNT {len(published)}")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path.cwd())
    args = parser.parse_args()
    print("\n".join(scan(args.root.resolve())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
