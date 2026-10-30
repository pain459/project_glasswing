# Glasswing platform memory — 2026-10-29

> Superseded for OpenCode/MCP topology on 2026-10-31 by
> `docs/session-memory/2026-10-31-host-opencode-mcp-stacks.md`. The `:3019`
> OpenCode web service and internal sidecars described below are retained only
> as dated history; native OpenCode now uses three loopback MCP stacks.

Session record for the network/access hardening work on **pathfinder**
(`192.168.68.62`, Ubuntu, RTX 4090, repo `/home/ravik/src_git/project_glasswing`).

## Objective

Make the platform usable without internal DNS (plain `IP:port`), stop Docker
subnet-pool exhaustion, and remove the per-stack repetition that made every
platform-wide change a 29-file edit.

## What shipped

| Commit | Branch | Summary |
| --- | --- | --- |
| `ffa29de` | `feat/remove-proxy` → `main` | Reverted the nginx reverse proxy; direct IP access restored. Kept the non-proxy fixes from `0dd5437` (Infisical retry loop, healthcheck + `depends_on: service_healthy`, image pins). |
| `35e56f7` | `feat/p0-network-pool` | P0: one shared `glasswing` bridge with pinned subnet, per-stack private nets only for real backends, widened Docker address pool, `doctor.sh`, `make network`/`docker-pool`/`doctor`. |
| `85ed5b4` | `feat/p0-network-pool` | Fixed doctor/config scripts for root-only `/etc/docker/daemon.json` (probe-network fallback), no more tracebacks or bogus "pool exhausted". |
| `dc842fa` | `feat/host-ip-access-map` | All 31 port bindings use `${GLASSWING_HOST_IP:?…}`; Infisical's `HOST_IP` unified; glances 61208 bound; generated `ACCESS.md` via `make access`; doctor rejects hardcoded IPs. |
| `67c221d` | `feat/host-ip-access-map` | `stacks/base.yaml` centralises restart policy + log rotation (`base`) and opt-in `no-new-privileges` (`hardened`); 42 services use `extends`. |
| `c43a4af` | `feat/host-ip-access-map` | `make restart-all` deploys 27 stacks `JOBS` (default 4) at a time after Infisical + Ollama; deleted `Makefile.bak`, `scripts/phase_0_disk.txt`. |

`main` = `c43a4af`, deployed and verified on 2026-10-29.

## Deployed state (facts)

- **Networks: 7.** `bridge`, `host`, `none`, `glasswing` (external, pinned
  `10.89.0.0/24`), plus `glasswing-infisical_internal`,
  `glasswing-langfuse_internal`, `glasswing-open-notebook_internal`.
  Host-network stacks (`dagu`, `plex`) declare no network at all.
- **Address pool:** `/etc/docker/daemon.json` has
  `default-address-pools: [{base: 172.16.0.0/12, size: 24}]` (4096 networks),
  merged next to the NVIDIA runtime, backed up before every write. The file is
  `0600 root`, so tooling must read it as root or probe the daemon instead.
- **Access:** no DNS, no proxy. 33 published ports, all bound to
  `GLASSWING_HOST_IP=192.168.68.62`. `ACCESS.md` (36 endpoints) is generated;
  `make access-check` fails when it drifts.
- **Secrets:** Infisical at `https://192.168.68.62:8095` (self-signed CA in
  `stacks/infisical/tls/cert.pem`). `scripts/with-infisical.sh` injects only the
  keys each `secrets.list` names, plus `/global` first.
- **Ollama baseline:** `qwen3.6-opencode:latest`, 131k ctx, 32k predict,
  temp 0.3, q8_0 KV, flash attention, ~90.8% GPU residency (baseline ~91%).

## Decisions and why

- **No reverse proxy, no client DNS.** Rejected because clients cannot resolve
  hostnames; everything is `http://192.168.68.62:<port>`.
- **One shared bridge** instead of one network per stack: an explicit subnet is
  not allocated from the pool, so 27 stacks stopped consuming 27 slots.
- **`make doctor` must run unprivileged.** When `daemon.json` is unreadable it
  creates a throwaway `glasswing-doctor-probe-$$` network, inspects the subnet
  the daemon actually hands out, then deletes it.
- **One host-IP variable.** Resolution order: `make GLASSWING_HOST_IP=…` / shell,
  then `stacks/infisical/.env` (accepts the legacy `HOST_IP` key). Infisical
  cannot supply its own bootstrap config, hence the file.
- **`base` vs `hardened`.** `no-new-privileges` blocks setuid, so it is applied
  only where the stack already declared it; the refactor changed no container's
  privileges. It did standardise log rotation (5 MB × 2) for 35 services that
  previously had none — that is the intended disk-pressure fix.

## Gotchas learned the hard way

- Compose `extends` merges only the service block: every stack still declares
  its own top-level `networks:` and interpolation values.
- `network_mode: host` conflicts with any `networks:` key — dagu/plex must have
  neither a service network nor a top-level block.
- `open_notebook` publishes ports *and* talks to `surrealdb`, so it must join
  both `internal` and `glasswing`; `surrealdb` stays `internal` only.
- `docker compose config` interpolation happens before YAML parsing, so
  `${GLASSWING_HOST_IP:?message}` fails loudly and correctly.
- Parsing compose files by indentation needs blank-line skipping; treating a
  blank line as end-of-section silently truncates the last service (this bug
  briefly hid ports from the access map).
- Open Notebook has two different doors: the **REST API/UI** at
  `https?://192.168.68.62:8502` (Bearer `OPEN_NOTEBOOK_PASSWORD`) and an
  **internal MCP bridge** (`open-notebook-mcp:8000/mcp`, Host allowlist
  `open-notebook-mcp:8000,127.0.0.1:8000,localhost:8000`, not published).
- The OpenCode web UI at `:3019` and its MCP sidecars are separate from
  Open Notebook; the MCP sidecars only talk over the compose network.

## Commands worth remembering

```bash
make doctor            # pool, shared net, orphans, ports, hardcoded IPs, restart loops, Infisical
make access            # regenerate ACCESS.md from compose port bindings
make access-check      # fail if ACCESS.md is stale
make network           # create/report the shared bridge
make docker-pool       # sudo: write the 4096-network pool, restart Docker
make restart-all       # Infisical, Ollama, then 27 stacks, 4 at a time
make restart-all JOBS=2
make up STACK=langfuse # one stack, with secrets + hooks + health wait
```

## Verification evidence (2026-10-29, on pathfinder)

- `make doctor`: 12 checks, 0 failures, 0 warnings.
- `make restart-all`: all 29 stacks `[PASS]`, Ollama preflight 13 passed.
- `make access-check`: `ACCESS.md` up to date.
- `docker network ls | wc -l` → 8 immediately after prune (watchtower's bridge),
  7 after removing the orphan container.

## Open backlog

1. Fold `make access-check` into `make doctor` so drift is caught in one command.
2. Generate Homepage service tiles from `ACCESS.md` so dashboard and doc agree.
3. Remove the last `0.0.0.0`-adjacent risk: verify every stack truly binds the
   LAN IP (doctor covers this) and decide whether Dagu/Plex host-network ports
   need firewall rules.
4. Off-host backup copy for Restic; systemd timers for scheduling.
5. `steel` still tracks a mutable tag; langfuse/steel healthchecks exceed the
   120 s timeout used by the update DAG.
6. LAN-only access: VPN or tunnel is still not configured.
