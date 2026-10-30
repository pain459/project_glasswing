#!/usr/bin/env bash
# access-map.sh — generate ACCESS.md from the published ports in stacks/*/compose.yaml.
#
# The platform is reached as IP:port (there is no internal DNS), so this table is
# the canonical list of what lives where. Regenerate it whenever a port changes.
#
# Usage:
#   ./scripts/access-map.sh           # write ACCESS.md and print a summary
#   ./scripts/access-map.sh --check   # exit 1 when ACCESS.md is out of date
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGET="ACCESS.md"
MODE="${1:-}"

# Ports published by stacks that use `network_mode: host`; Compose cannot see them.
generate() {
  python3 - <<'PY'
import os, pathlib, re

# Host IP: same resolution order as the Makefile.
ip = os.environ.get("GLASSWING_HOST_IP", "").strip()
if not ip:
    env = pathlib.Path("stacks/infisical/.env")
    if env.exists():
        text = env.read_text()
        for key in ("GLASSWING_HOST_IP", "HOST_IP"):
            m = re.search(rf"^{key}=(.+)$", text, re.M)
            if m:
                ip = m.group(1).strip().strip('"').strip("'")
                break
ip = ip or "<host-ip>"

HOST_NETWORK_PORTS = {
    "dagu": [(3014, 3014)],
    "plex": [(32400, 32400)],
}

NON_WEB = {53: "dns", 22: "ssh", 5432: "postgres"}


def service_blocks(lines):
    try:
        start = next(
            i for i, l in enumerate(lines) if l.strip() == "services:" and not l.startswith(" ")
        )
    except StopIteration:
        return []
    out, cur, end = [], None, len(lines)
    for i in range(start + 1, len(lines)):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line.startswith((" ", "\t")):
            end = i
            break
        m = re.match(r"^  ([A-Za-z0-9_.-]+):\s*(#.*)?$", line)
        if m:
            if cur:
                out.append((cur[0], cur[1], i))
            cur = (m.group(1), i)
    if cur:
        out.append((cur[0], cur[1], end))
    return out


# Port numbers are sometimes configuration (`${STEEL_PORT}`). The committed
# registries carry those non-secret values, so resolve them here instead of
# silently dropping the binding.
registry_values = {}
for registry in pathlib.Path("stacks").glob("**/*.registry"):
    for line in registry.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            registry_values.setdefault(key.strip(), value.strip())


def resolve_vars(spec):
    def repl(match):
        name = match.group(1).split(":")[0].split("-")[0]
        return registry_values.get(name, match.group(0))

    return re.sub(r"\$\{([^}]+)\}", repl, spec)


rows = []
host_net_stacks = set()

for compose in sorted(pathlib.Path("stacks").glob("*/compose.yaml")):
    stack = compose.parent.name
    lines = compose.read_text().splitlines()

    for name, start, end in service_blocks(lines):
        body = lines[start:end]
        host_net = any(l.strip() == "network_mode: host" for l in body)

        networks, in_networks = [], False
        ports, in_ports = [], False
        for line in body:
            inline = re.match(r"^    networks:\s*\[(.+)\]\s*$", line)
            if inline:
                networks = [n.strip() for n in inline.group(1).split(",") if n.strip()]
                in_networks = in_ports = False
                continue
            if re.match(r"^    networks:\s*$", line):
                in_networks = True
                in_ports = False
                continue
            if re.match(r"^    ports:\s*$", line):
                in_ports = True
                in_networks = False
                continue
            if re.match(r"^    \S", line) or (line.startswith("  ") and not line.startswith("    ")):
                in_networks = in_ports = False
            if in_networks:
                m = re.match(r"^      - (\S+)\s*$", line)
                if m:
                    networks.append(m.group(1))
            if in_ports:
                m = re.match(r'^      - "([^"]+)"\s*(#.*)?$', line) or re.match(
                    r'^      - (\S+)\s*(#.*)?$', line
                )
                if m:
                    ports.append(m.group(1))

        if host_net and not ports:
            host_net_stacks.add(stack)
            ports = [f"{h}:{c}" for h, c in HOST_NETWORK_PORTS.get(stack, [])]

        network_col = "host" if host_net else ("+".join(networks) if networks else "default")

        for spec in ports:
            base, _, proto = spec.partition("/")
            proto = proto or "tcp"
            # "${GLASSWING_HOST_IP:?...}:3006:3000" -> ":3006:3000"
            base = re.sub(r"^\$\{[^}]+\}", "", base)
            base = resolve_vars(base)
            parts = base.split(":")
            if len(parts) == 3:
                host_ip, host_port, container_port = parts
                host_ip = host_ip or ip
            elif len(parts) == 2:
                host_ip, (host_port, container_port) = ip, parts
            else:
                host_ip, host_port, container_port = ip, parts[0], parts[0]

            try:
                host_port_int = int(host_port)
            except ValueError:
                continue
            sort_key = host_port_int

            try:
                container_port_int = int(container_port)
            except ValueError:
                container_port_int = -1
            if container_port_int in NON_WEB:
                scheme = NON_WEB[container_port_int]
            elif container_port == "443" or host_port == "9443":
                scheme = "https"
            else:
                scheme = "http"

            url = f"{scheme}://{host_ip}:{host_port}"
            container = f"{container_port}/{proto}"
            access = "host-only" if host_ip == "127.0.0.1" else "LAN"
            rows.append((sort_key, proto, stack, name, url, container, network_col, access))

rows.sort(key=lambda r: (r[0], r[1], r[2]))

out = []
out.append("# Access map")
out.append("")
out.append(
    "Every published service is reached as `IP:port`; there is no internal DNS.\n"
    "LAN services bind the Pathfinder address, while host-only services bind loopback.\n"
    "These are the canonical addresses. `make access` regenerates this file from the `ports:`\n"
    "entries in `stacks/*/compose.yaml` — change the compose file, not this table."
)
out.append("")
out.append(f"Host IP: `{ip}` (from `GLASSWING_HOST_IP`, else `stacks/infisical/.env`).")
out.append("")
out.append("| Stack | Service | URL | Container port | Network | Access |")
out.append("| --- | --- | --- | --- | --- | --- |")
for _, _, stack, service, url, container, network, access in rows:
    out.append(f"| `{stack}` | `{service}` | {url} | {container} | {network} | {access} |")
out.append("")

non_web = sorted({r[4].split("://")[0] for r in rows if not r[4].startswith("http")})
if non_web:
    out.append("`" + "`, `".join(non_web) + "` rows are not web UIs.")
    out.append("")

if host_net_stacks:
    out.append(
        "`network_mode: host` stacks ("
        + ", ".join(f"`{s}`" for s in sorted(host_net_stacks))
        + ") publish outside Compose; their ports come from the stack defaults."
    )
    out.append("")

print("\n".join(out))
PY
}

case "$MODE" in
  "")
    generate > "$TARGET"
    rows="$(awk '/^\| `/{n++} END{print n+0}' "$TARGET")"
    stacks="$(awk '/^\| `/{split($0,a,"|"); print a[2]}' "$TARGET" | sort -u | wc -l | tr -d ' ')"
    echo "[PASS] Wrote ${TARGET}: ${rows} endpoints across ${stacks} stacks"
    ;;
  --check)
    tmp="$(mktemp)"
    trap 'rm -f "$tmp"' EXIT
    generate > "$tmp"
    if cmp -s "$tmp" "$TARGET"; then
      echo "[PASS] ${TARGET} is up to date"
      exit 0
    fi
    echo "[FAIL] ${TARGET} is out of date"
    diff -u "$TARGET" "$tmp" | head -40 || true
    echo "       fix: make access"
    exit 1
    ;;
  --stdout)
    generate
    ;;
  *)
    echo "usage: $0 [--check|--stdout]" >&2
    exit 2
    ;;
esac
