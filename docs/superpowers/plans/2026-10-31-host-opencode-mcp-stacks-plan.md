# Host OpenCode and Independent MCP Stacks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the containerized OpenCode stack with host OpenCode plus three independently deployable, loopback-only Streamable HTTP MCP stacks.

**Architecture:** Open Notebook MCP, Steel MCP, and Serena become separate Compose projects managed by the existing Glasswing Make/Infisical lifecycle. Host OpenCode connects to `127.0.0.1:8001`, `127.0.0.1:8002`, and `127.0.0.1:9121`; the old OpenCode Compose project remains available until all new endpoints and real tool calls pass.

**Tech Stack:** Docker Compose, Bash, Python 3 standard library, MCP Streamable HTTP/JSON-RPC, Infisical, OpenCode 2.2.2, Serena 2.1.1.dev0.

**Spec:** `docs/superpowers/specs/2026-10-31-host-opencode-mcp-stacks-design.md`

## Global Constraints

- Bind MCP and Serena dashboard ports to `127.0.0.1` only; never publish them on `GLASSWING_HOST_IP` or `0.0.0.0`.
- Preserve the existing dirty worktree as migration input and archive it before moving or deleting files.
- Preserve `/home/ravik/.config/opencode/opencode.json`; change only the MCP document in `opencode.jsonc` after backing it up.
- Keep the old `glasswing-opencode` Compose project available until all three new MCP stacks and host OpenCode calls pass.
- Reuse `/open-notebook` and `/steel` Infisical paths; do not leave an `/opencode` runtime dependency.
- Pin Serena to `ghcr.io/oraios/serena@sha256:0b0ff857c2eca5094aa3b4f406e58ba3cacf647b20d237adcfbbeadffc14cd65`.
- Mount `/home/ravik/src_git` once at `/workspace/repos`, read-write; additional roots use a gitignored Compose override.
- Do not rewrite clearly dated historical records; add a superseding note when needed.

## Review Focus

- A root-owned fresh Serena config volume must be initialized to UID/GID 1000 before Serena starts; covered by Task 5 topology and live startup tests.
- Streamable HTTP servers may be stateful JSON, stateless JSON, or SSE; covered by Task 6 protocol-fixture tests.
- Loopback bindings must not weaken doctor's rejection of `0.0.0.0` or hardcoded LAN addresses; covered by Task 2 fixture tests.
- An optional Serena override must compose without replacing the default repository-root mount; covered by Task 5 rendered-Compose test.
- Failure after host OpenCode switches must remain recoverable until final verification; covered by Tasks 1, 7, and 10 rollback checks.

---

### Task 1: Recovery checkpoint and working branch

**Files:**
- Create outside repo: `/home/ravik/src_git/project_glasswing-mcp-migration-<timestamp>/`
- Preserve: `stacks/opencode/`, `stacks/homepage/config/services.yaml`, host OpenCode config

**Interfaces:**
- Produces: recovery directory path recorded in the implementation log and a feature branch containing the current dirty state.

- [ ] **Step 1: Record the exact starting state**

Run `git status --short --branch`, `git diff --binary`, and `git ls-files --others --exclude-standard`; save their outputs in the recovery directory.

- [ ] **Step 2: Archive affected repository inputs**

Archive `stacks/opencode/` and `stacks/homepage/config/services.yaml`, including untracked Serena files. Verify the archive with `tar -tzf` before continuing.

- [ ] **Step 3: Back up host OpenCode configuration**

Copy `/home/ravik/.config/opencode/opencode.json` and `opencode.jsonc` into the recovery directory with modes and timestamps preserved.

- [ ] **Step 4: Create the implementation branch**

Run `git switch -c refactor/host-opencode-mcp-stacks`; verify the dirty files remain present and byte-identical to the archived inputs.

### Task 2: Teach repository tooling about loopback-only services

**Files:**
- Create: `scripts/compose-port-check.py`
- Create: `tests/test_compose_port_check.py`
- Create: `tests/test_access_map.py`
- Modify: `scripts/doctor.sh`
- Modify: `scripts/access-map.sh`
- Modify: `Makefile`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `python3 scripts/compose-port-check.py [--root PATH]`, `scripts/access-map.sh --stdout`, and automatic inclusion of `stacks/<name>/compose.override.yaml` by every Make lifecycle target.

- [ ] **Step 1: Write failing port-policy tests**

Use `unittest` temporary Compose fixtures. Assert that `127.0.0.1:8001:8000` is accepted, `0.0.0.0:8001:8000` and `192.168.68.62:8001:8000` are reported as invalid literal bindings, unqualified `8001:8000` is reported unbound, and duplicate host ports fail.

- [ ] **Step 2: Run the port tests and verify failure**

Run `python3 -m unittest tests.test_compose_port_check -v`; expect failure because `compose-port-check.py` does not exist.

- [ ] **Step 3: Extract and implement the Compose port checker**

Move doctor's embedded port parsing into `scripts/compose-port-check.py`. Preserve its `DUP`, `LITERAL`, `UNBOUND`, and `COUNT` line protocol; add `LOOPBACK` classification and allow only `127.0.0.1` as a literal host binding. Make `doctor.sh` consume this CLI output.

- [ ] **Step 4: Run the port tests and doctor regression check**

Run `python3 -m unittest tests.test_compose_port_check -v` and `make doctor`; expect all fixture tests to pass and no new doctor failures beyond the already-known Serena restart loop.

- [ ] **Step 5: Write failing access-map tests**

Assert that `scripts/access-map.sh --stdout` labels a `127.0.0.1` fixture row as `host-only`, preserves the literal URL, and continues to label `GLASSWING_HOST_IP` rows as `LAN`.

- [ ] **Step 6: Implement access-map and override support**

Add `--stdout` to `access-map.sh`, add an `Access` column (`host-only` or `LAN`), and preserve literal loopback addresses. In the Makefile, construct Compose arguments from `compose.yaml` plus an optional `compose.override.yaml`; add `stacks/*/compose.override.yaml` to `.gitignore`.

- [ ] **Step 7: Verify and commit tooling**

Run `python3 -m unittest tests.test_compose_port_check tests.test_access_map -v`, `make access-check` (expected to report drift until Task 9 regenerates it), and `make check STACK=ollama`. Commit as `refactor: support host-only stack endpoints`.

### Task 3: Extract the Open Notebook MCP stack

**Files:**
- Create: `stacks/open-notebook-mcp/compose.yaml`
- Move: `stacks/opencode/mcp/Dockerfile` → `stacks/open-notebook-mcp/Dockerfile`
- Move: `stacks/opencode/mcp/server.py` → `stacks/open-notebook-mcp/server.py`
- Create: `stacks/open-notebook-mcp/secrets.list`
- Create: `stacks/open-notebook-mcp/README.md`
- Modify: `stacks/open-notebook/open-notebook-config.registry`
- Modify: `stacks/open-notebook/secrets.list`
- Modify: `Makefile`
- Create/modify: `tests/test_mcp_stacks.py`

**Interfaces:**
- Consumes: Makefile multi-file Compose support from Task 2.
- Produces: `http://127.0.0.1:8001/mcp`, container `glasswing-open-notebook-mcp`, and Infisical routing from `open-notebook-mcp` to `/open-notebook`.

- [ ] **Step 1: Add failing Open Notebook stack tests**

Assert the stack exists, binds exactly `127.0.0.1:8001:8000`, joins `glasswing`, retains `mcp==1.30.0` and `open-notebook-mcp==0.3.0`, has a healthcheck, and contains no OpenCode service dependency.

- [ ] **Step 2: Run the test and verify failure**

Run `python3 -m unittest tests.test_mcp_stacks.MCPStackTests.test_open_notebook_mcp_stack -v`; expect failure because the independent stack is absent.

- [ ] **Step 3: Build the independent stack**

Move the existing compatibility source unchanged. Configure `OPEN_NOTEBOOK_URL=http://open_notebook:5055`, bind the MCP server to container port 8000, allow Host headers for `127.0.0.1:8001`, and reuse `OPEN_NOTEBOOK_PASSWORD` from `/open-notebook`. Add the Makefile Infisical path mapping.

- [ ] **Step 4: Validate Compose and tests**

Run `make check STACK=open-notebook-mcp` and the focused unittest; expect both to pass without deploying.

- [ ] **Step 5: Commit**

Commit as `feat: extract open notebook mcp stack`.

### Task 4: Extract the Steel MCP stack

**Files:**
- Create: `stacks/steel-mcp/compose.yaml`
- Move: `stacks/opencode/steel-mcp/Dockerfile` → `stacks/steel-mcp/Dockerfile`
- Create: `stacks/steel-mcp/secrets.list`
- Create: `stacks/steel-mcp/README.md`
- Modify: `Makefile`
- Modify: `tests/test_mcp_stacks.py`

**Interfaces:**
- Produces: `http://127.0.0.1:8002/mcp`, container `glasswing-steel-mcp`, and downstream access to `http://steel:3000` / `ws://steel:3000` on the shared Docker network.

- [ ] **Step 1: Add failing Steel stack tests**

Assert the stack binds exactly `127.0.0.1:8002:8000`, keeps the pinned Steel MCP commit `f28a17571b10053e3df5e4bbbc4d3bc30f58ba39`, keeps `supergateway@4.2.1`, uses stateful Streamable HTTP, joins `glasswing`, and has `/healthz` health checking.

- [ ] **Step 2: Run the focused test and verify failure**

Run `python3 -m unittest tests.test_mcp_stacks.MCPStackTests.test_steel_mcp_stack -v`; expect failure because the stack is absent.

- [ ] **Step 3: Build the independent stack**

Move the existing Dockerfile unchanged except path-relative documentation. Configure `STEEL_LOCAL=true`, `STEEL_BASE_URL=http://steel:3000`, and `STEEL_CONNECT_URL=ws://steel:3000`; reuse the `/steel` Infisical path for global settings.

- [ ] **Step 4: Validate and commit**

Run `make check STACK=steel-mcp` and the focused unittest. Commit as `feat: extract steel mcp stack`.

### Task 5: Build a durable Serena stack

**Files:**
- Create: `stacks/serena/compose.yaml`
- Move/adapt: `stacks/opencode/serena-mcp/serena_config.yml` → `stacks/serena/config/serena_config.yml`
- Create: `stacks/serena/compose.override.example.yaml`
- Create: `stacks/serena/secrets.list`
- Create/adapt: `stacks/serena/README.md`
- Modify: `tests/test_mcp_stacks.py`

**Interfaces:**
- Produces: `http://127.0.0.1:9121/mcp`, `http://127.0.0.1:24282/dashboard`, a UID-1000 writable config volume, and `/workspace/repos` mapped once from `/home/ravik/src_git`.

- [ ] **Step 1: Add failing Serena topology tests**

Assert the exact pinned digest, loopback bindings, one read-write `/home/ravik/src_git:/workspace/repos` mount, no `/workspace/repos/scip`, no `:latest`, completed init-service dependency, and a separate read-only nested config-file mount that is not hidden by the writable config volume.

- [ ] **Step 2: Add failing override rendering test**

Copy the example override to a temporary file, render Compose with both files, and assert the default repository-root mount remains alongside the example extra root.

- [ ] **Step 3: Run the Serena tests and verify failure**

Run `python3 -m unittest tests.test_mcp_stacks.MCPStackTests.test_serena_stack tests.test_mcp_stacks.MCPStackTests.test_serena_override -v`; expect failure because `stacks/serena` is absent.

- [ ] **Step 4: Implement the Serena stack**

Use the pinned OCI digest directly. Add a root init service that creates/chowns the config volume to `1000:1000`; mount the volume at `/workspaces/serena/config` and the checked-in YAML as a nested read-only file. Run Serena as `1000:1000` with Streamable HTTP on 9121 and the dashboard on 24282.

- [ ] **Step 5: Validate and commit**

Run the focused unittests and `make check STACK=serena`. Commit as `feat: add host-only serena mcp stack`.

### Task 6: Add protocol-level MCP preflight checks

**Files:**
- Create: `scripts/mcp-preflight.py`
- Create: `tests/test_mcp_preflight.py`
- Create: `stacks/open-notebook-mcp/post-up.sh`
- Create: `stacks/steel-mcp/post-up.sh`
- Create: `stacks/serena/post-up.sh`
- Modify: `Makefile`

**Interfaces:**
- Produces: `python3 scripts/mcp-preflight.py --name NAME URL` and `make mcp-preflight`.
- Behavior: exit 0 only after `initialize`, `notifications/initialized`, and `tools/list` succeed with a non-empty tool list; support stateless JSON, stateful JSON with `Mcp-Session-Id`, and SSE `data:` responses.

- [ ] **Step 1: Write failing protocol fixture tests**

Use `http.server.ThreadingHTTPServer` fixtures for stateless JSON, stateful JSON, SSE, HTTP 500, invalid JSON, missing session reuse, and empty tools. Assert only the first three succeed and report the expected tool count.

- [ ] **Step 2: Run tests and verify failure**

Run `python3 -m unittest tests.test_mcp_preflight -v`; expect failure because the probe is absent.

- [ ] **Step 3: Implement the standard-library probe**

Implement CLI parsing plus `probe(url: str, name: str, timeout: float) -> int`. Preserve returned session headers, parse JSON or SSE payloads, send MCP protocol version `2025-11-25`, and print `[PASS] <name>: <N> tools` only on complete success.

- [ ] **Step 4: Wire lifecycle checks**

Each stack's executable post-up hook invokes the probe against its loopback URL. Add `mcp-preflight` to the Makefile to run all three probes without redeploying.

- [ ] **Step 5: Verify and commit**

Run `python3 -m unittest tests.test_mcp_preflight -v`. Commit as `feat: validate streamable mcp endpoints`.

### Task 7: Deploy new stacks and switch host OpenCode

**Files:**
- Modify on host: `/home/ravik/.config/opencode/opencode.jsonc`
- Preserve: `/home/ravik/.config/opencode/opencode.json`

**Interfaces:**
- Consumes: the three loopback endpoints and recovery directory.
- Produces: host OpenCode effective configuration with three remote MCP servers.

- [ ] **Step 1: Deploy and validate Open Notebook MCP**

Run `make up STACK=open-notebook-mcp`; verify healthy status, zero restarts, and `python3 scripts/mcp-preflight.py --name open-notebook http://127.0.0.1:8001/mcp` passes.

- [ ] **Step 2: Deploy and validate Steel MCP**

Run `make up STACK=steel-mcp`; verify healthy status, zero restarts, and the 8002 probe passes.

- [ ] **Step 3: Deploy and validate Serena**

Run `make up STACK=serena`; verify init service exit 0, Serena healthy with zero restarts, dashboard reachable on loopback, and the 9121 probe passes.

- [ ] **Step 4: Run aggregate MCP preflight**

Run `make mcp-preflight`; expect three PASS lines with non-zero tool counts.

- [ ] **Step 5: Install the host OpenCode MCP config atomically**

Generate a JSONC document containing only the three remote server definitions, validate it with `opencode --standalone debug config`, then replace `opencode.jsonc` atomically with mode 0644. Do not alter `opencode.json`.

- [ ] **Step 6: Reload and verify host OpenCode**

Run `/home/ravik/.opencode/bin/opencode reload`, then verify effective configuration and MCP status. Perform an Open Notebook vector search, a read-only Steel scrape, and Serena project activation plus symbol lookup.

- [ ] **Step 7: Exercise rollback without leaving it applied**

Confirm the archived `opencode.jsonc` can be parsed and that the old Compose project is still running; retain both until Task 10 passes.

### Task 8: Remove the containerized OpenCode topology

**Files:**
- Delete after moved content is verified: `stacks/opencode/`
- Modify: `scripts/ai-preflight.sh`
- Modify: `stacks/ollama/post-up.sh`
- Modify: `stacks/homepage/config/services.yaml`
- Modify: `tests/test_mcp_stacks.py`

**Interfaces:**
- Produces: no OpenCode Compose project or port 3019; `make ai-preflight` validates host OpenCode/Ollama instead of a container.

- [ ] **Step 1: Add failing retirement tests**

Assert `stacks/opencode/compose.yaml` is absent, Homepage has no OpenCode or loopback Serena tile, no active source file references `glasswing-opencode` or `STACK=opencode`, and `scripts/ai-preflight.sh` contains no `docker exec` against an OpenCode container.

- [ ] **Step 2: Run focused tests and verify failure**

Run `python3 -m unittest tests.test_mcp_stacks.MCPStackTests.test_containerized_opencode_removed -v`; expect failure while the old stack exists.

- [ ] **Step 3: Adapt AI preflight**

Keep `--ollama`. Redefine `--opencode` as host OpenCode validation: check the host binary/effective model configuration and a real standalone default-model prompt, without expecting an OpenCode container. Update comments and Ollama hook references accordingly.

- [ ] **Step 4: Remove obsolete UI topology and verify migration inputs**

Remove OpenCode and Serena Homepage tiles. Verify every reusable MCP file exists in its new stack and compare it with the recovery archive. Keep `stacks/opencode/` in place until the old Compose project is down.

- [ ] **Step 5: Stop and remove only the old Compose project**

Using the still-present old Compose file and `/opencode` Infisical path, run the old project's `down` only after host OpenCode tool calls pass. Confirm the three new MCP containers remain running and port 3019 is closed.

- [ ] **Step 6: Delete the obsolete source tree, verify, and commit**

Delete `stacks/opencode/`, run focused tests and `make ai-preflight`, and confirm the recovery archive contains the former tree. Commit as `refactor: retire containerized opencode`.

### Task 9: Update repository documentation and generated access data

**Files:**
- Modify: `README.md`
- Regenerate: `ACCESS.md`
- Modify: `REBUILD.md`
- Modify: `DR_RUNBOOK.md`
- Modify: `MAINTENANCE.md`
- Modify: `stacks/infisical-plan.md`
- Modify: `stacks/ollama/README.md`
- Modify: relevant registry documentation and new stack READMEs
- Modify: `docs/session-memory/2026-10-29-platform-hardening.md` only by adding a dated superseding note
- Create: `docs/session-memory/2026-10-31-host-opencode-mcp-stacks.md`

**Interfaces:**
- Produces: current architecture documentation and an access map that labels the four loopback endpoints host-only.

- [ ] **Step 1: Add a documentation consistency test**

Extend `tests/test_mcp_stacks.py` to scan active documentation for obsolete port 3019/container deployment instructions while allowing clearly dated historical text with a superseding note.

- [ ] **Step 2: Run the documentation test and verify failure**

Run the focused unittest; expect listed obsolete references.

- [ ] **Step 3: Update all active documentation**

Document host OpenCode installation/configuration, three independent stack lifecycles, loopback security, ports, Infisical paths, Serena repository overrides, MCP preflight, rollback, and troubleshooting.

- [ ] **Step 4: Regenerate access metadata**

Run `make access`; verify rows for 8001, 8002, 9121, and 24282 use `127.0.0.1` and `host-only`, and no 3019 row remains.

- [ ] **Step 5: Verify search results and commit**

Run repository-wide searches for `glasswing-opencode`, `STACK=opencode`, `stacks/opencode`, and `:3019`; classify any remaining dated history explicitly. Run the documentation test and `make access-check`. Commit as `docs: document host opencode mcp architecture`.

### Task 10: Full verification and cleanup gate

**Files:**
- Review only; no new feature changes.

**Interfaces:**
- Produces: evidence that the migration is complete and the recovery archive can be retained without remaining runtime dependency.

- [ ] **Step 1: Run all repository tests**

Run `python3 -m unittest discover -s tests -p 'test_*.py' -v`; expect zero failures.

- [ ] **Step 2: Run platform checks**

Run `make mcp-preflight`, `make ai-preflight`, `make access-check`, and `make doctor`; expect zero failures and no restart-loop warning.

- [ ] **Step 3: Verify live state**

Confirm three healthy MCP containers, no `glasswing-opencode` container/project, no listener on 3019, and loopback-only listeners on 8001, 8002, 9121, and 24282.

- [ ] **Step 4: Repeat real host OpenCode calls**

Repeat Open Notebook search, Steel scrape, and Serena activation/symbol lookup from host OpenCode after old-stack removal.

- [ ] **Step 5: Inspect repository integrity**

Run `git status --short`, `git diff --check`, review `git diff --stat` and the complete diff, and verify no credentials or generated runtime state were added.

- [ ] **Step 6: Confirm rollback assets and final commit**

Verify the recovery archive and original host config remain readable. Commit any verification-only corrections as `chore: complete mcp stack migration`; do not delete the recovery archive without explicit user approval.
