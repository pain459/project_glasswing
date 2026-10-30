# Host OpenCode and Independent MCP Stacks Design

## Intent

Pathfinder's host-installed OpenCode will be the only OpenCode runtime. The
containerized OpenCode web service is redundant and will be removed. Open
Notebook MCP, Steel MCP, and Serena will become independent Glasswing stacks
that expose Streamable HTTP endpoints only on the host loopback interface.

This keeps model and agent control on the machine-hosted OpenCode process while
retaining Docker isolation, lifecycle management, health checks, and
reproducible deployment for each MCP server.

## Goals

- Remove the `glasswing-opencode` container, port 3019, its persistent service
  directories, and repository references to a containerized OpenCode runtime.
- Create three independently deployable stacks:
  `open-notebook-mcp`, `steel-mcp`, and `serena`.
- Expose all three MCP endpoints using Streamable HTTP on `127.0.0.1` only.
- Point host OpenCode's global MCP configuration at those endpoints.
- Make Serena repository discovery broad enough for normal use without
  hardcoding duplicate project mounts.
- Preserve existing working Open Notebook and Steel behavior.
- Add deployment checks that fail when an MCP endpoint is unhealthy or does
  not complete the MCP initialization handshake.
- Update the complete repository documentation and generated access metadata.

## Non-goals

- No remote or LAN MCP access in this phase.
- No replacement OpenCode web UI.
- No authentication proxy; loopback binding is the access boundary.
- No changes to Ollama's model configuration.
- No changes to the underlying Open Notebook or Steel application stacks.
- No automatic mounting of arbitrary paths outside the configured repository
  roots.

## Anti-goals

- Do not publish browser automation or repository tooling on
  `192.168.68.62` without authentication.
- Do not retain an `opencode` Compose project merely as a container for
  unrelated MCP sidecars.
- Do not use `depends_on: service_started` as proof that an MCP server is
  usable.
- Do not mount a named volume over an image-baked configuration file.
- Do not silently discard or reset the existing dirty worktree.

## Current constraints

- The repository is on `main` with pre-existing changes in
  `stacks/opencode/compose.yaml`, `stacks/opencode/config/opencode.jsonc`,
  `stacks/homepage/config/services.yaml`, and the untracked
  `stacks/opencode/serena-mcp/` directory.
- Those changes are migration input from the unfinished Serena attempt. Reuse
  their intended behavior where it fits this design; do not reset them or keep
  obsolete duplicate implementations in the final tree. Before moving or
  deleting any of them, capture the tracked diff plus all affected untracked
  files in a timestamped recovery archive outside the repository.
- Open Notebook MCP 0.3.0 requires `mcp==1.30.0` and the existing compatibility
  wrapper.
- Steel MCP 3.0.0 is built from pinned source and requires `supergateway` to
  expose Streamable HTTP.
- Host OpenCode is installed at `/home/ravik/.opencode/bin/opencode`; its
  global configuration is under `/home/ravik/.config/opencode`.
- Glasswing lifecycle commands discover stacks from
  `stacks/*/compose.yaml` and inject global/per-stack values through Infisical.
- The access-map and doctor scripts currently assume published services use
  `GLASSWING_HOST_IP`; they must explicitly understand loopback-only services.

## Approaches considered

### 1. Keep a renamed MCP gateway bundle

Move the three sidecars into one `mcp-gateways` Compose project. This minimizes
file movement but retains coupled deployment and failure domains. It conflicts
with Glasswing's one-application/one-stack convention and was rejected.

### 2. Three independent, LAN-bound stacks

Create one stack per MCP server and publish each on
`192.168.68.62`. This follows existing access conventions but exposes browser
automation, notebook operations, and repository tooling to unauthenticated LAN
clients. It was rejected for this phase.

### 3. Three independent, loopback-only stacks — selected

Create one stack per MCP server and publish each endpoint only on
`127.0.0.1`. Host OpenCode can reach them directly, each has an independent
lifecycle and health boundary, and no LAN client can invoke them. Repository
tooling will explicitly model loopback as a supported host-only endpoint.

## Target architecture

### Open Notebook MCP

- Stack: `stacks/open-notebook-mcp/`
- Container: `glasswing-open-notebook-mcp`
- Host endpoint: `http://127.0.0.1:8001/mcp`
- Container endpoint: `http://0.0.0.0:8000/mcp`
- Source: move the existing compatibility `Dockerfile` and `server.py` from
  `stacks/opencode/mcp/` without changing dependency versions.
- Secret source: reuse `OPEN_NOTEBOOK_PASSWORD` from Infisical's
  `/open-notebook` path; non-secret transport settings remain checked in.
- Health: retain the socket healthcheck and add an MCP protocol check in the
  stack post-up validation.

### Steel MCP

- Stack: `stacks/steel-mcp/`
- Container: `glasswing-steel-mcp`
- Host endpoint: `http://127.0.0.1:8002/mcp`
- Container endpoint: `http://0.0.0.0:8000/mcp`
- Source: move the existing pinned Steel MCP build and Supergateway wrapper
  from `stacks/opencode/steel-mcp/`.
- Configuration source: reuse Steel connection values from Infisical's
  `/steel` path, with the existing `glasswing-steel` application remaining the
  downstream browser service.
- Health: retain `/healthz` and add an MCP initialization/tools-list check in
  post-up validation.

### Serena

- Stack: `stacks/serena/`
- Container: `glasswing-serena`
- MCP endpoint: `http://127.0.0.1:9121/mcp`
- Dashboard: `http://127.0.0.1:24282/dashboard`
- Image: pin Serena to an immutable version or digest verified during
  implementation; do not retain `:latest`.
- Run as UID/GID 1000, matching `ravik` and host OpenCode.
- Bake the read-only base configuration somewhere not hidden by a volume.
  Persist only Serena's writable state/memories in a separately initialized
  path owned by UID/GID 1000.
- Repository root: mount `/home/ravik/src_git` once at
  `/workspace/repos`, read-write. Every repository below that host directory is
  then activatable by name without editing Compose for each project.
- Optional extra roots: support a gitignored Compose override file for paths
  outside `/home/ravik/src_git`; document the exact override invocation and do
  not generate YAML from an unvalidated environment string.
- Health: socket/container health plus a real Streamable HTTP MCP handshake.

The read-write Serena mount is intentional: host OpenCode already has ravik's
filesystem authority, and Serena's refactoring tools must not advertise edits
that Docker will reject. Loopback-only exposure limits the client boundary to
the host.

## Host OpenCode configuration

Preserve the existing Ollama provider configuration in
`/home/ravik/.config/opencode/opencode.json`. Replace only the MCP definitions
in `/home/ravik/.config/opencode/opencode.jsonc` with remote servers:

- `open-notebook` → `http://127.0.0.1:8001/mcp`
- `steel` → `http://127.0.0.1:8002/mcp`
- `serena` → `http://127.0.0.1:9121/mcp`

Remove local-command MCP definitions and embedded Open Notebook credentials
from the host OpenCode configuration. Reload or restart OpenCode's background
service only after all three endpoints pass their checks. Back up the existing
host configuration before changing it.

## Repository and lifecycle changes

- Remove `stacks/opencode/` after moving reusable MCP sources into their new
  stacks.
- Remove the OpenCode and Serena LAN tiles from Homepage. Loopback URLs are not
  useful from a browser on another device and are not reachable as loopback
  from the Homepage container.
- Extend the Makefile's Infisical path routing:
  - `open-notebook-mcp` reuses `/open-notebook`.
  - `steel-mcp` reuses `/steel`.
  - `serena` needs only globally injected configuration unless a future secret
    is added.
- Add a shared read-only MCP probe script that performs initialize and
  `tools/list` against a Streamable HTTP endpoint. Each MCP stack's post-up hook
  invokes it against its loopback URL.
- Add an aggregate `make mcp-preflight` target that checks all three endpoints
  and reports their tool counts.
- Update doctor port validation to permit explicit `127.0.0.1` bindings while
  continuing to reject unintended hardcoded LAN addresses and `0.0.0.0`.
- Update the access-map generator so loopback bindings render as
  `http://127.0.0.1:<port>` and are labelled host-only rather than substituted
  with `GLASSWING_HOST_IP`.

## Health and failure behavior

- `docker compose up --wait` must fail when a container never becomes healthy.
- Post-up validation must fail when TCP is open but MCP initialization or
  `tools/list` fails.
- Independent stacks mean one failed MCP server does not stop the other two,
  while aggregate validation still reports the platform as incomplete.
- Host OpenCode must show all three servers as connected through its effective
  MCP state before the migration is considered complete.
- A failed migration keeps the backed-up host OpenCode config available for
  immediate restoration.
- Rollback remains valid until the final verification suite passes. Keep the
  old Compose stack and containers available during new-stack deployment and
  the host configuration switch; remove them only at the final cleanup step.
  Retain the pre-migration worktree/config archive after cleanup so the exact
  prior state can still be reconstructed if final verification exposes a
  regression.

## Tests and verification

Repository tests will cover:

- `stacks/opencode/compose.yaml` no longer exists.
- Exactly three independent MCP stack Compose files exist.
- MCP ports bind to `127.0.0.1`, never `0.0.0.0` or
  `GLASSWING_HOST_IP`.
- Serena uses one repository-root mount, has no duplicate project aliases, and
  does not mask image-baked configuration with its writable volume.
- Serena does not use a mutable image reference.
- Access-map output preserves loopback addresses.
- Doctor accepts approved loopback bindings but still rejects hardcoded LAN
  addresses and all-interface bindings.
- The MCP probe fails on an HTTP-only/non-MCP service and succeeds for each
  deployed server.

Live completion checks:

1. All three containers report healthy with zero restart loops.
2. `make mcp-preflight` reports three successful MCP handshakes and non-zero
   tool counts.
3. Host OpenCode's live MCP status reports `open-notebook`, `steel`, and
   `serena` connected.
4. An Open Notebook search, a read-only Steel scrape, and Serena project
   activation/symbol lookup each succeed through host OpenCode.
5. No `glasswing-opencode` container, image dependency, Compose project,
   listener on 3019, or generated access entry remains.
6. Existing repository tests, `make access-check`, and `make doctor` pass.

## Documentation scope

Update every repository reference found by a repository-wide search, including:

- root `README.md`, `ACCESS.md`, `REBUILD.md`, `DR_RUNBOOK.md`, and
  `MAINTENANCE.md`;
- Infisical planning/registry documentation;
- Homepage service metadata;
- stack-specific READMEs for all three MCP servers;
- OpenCode/AI preflight documentation and commands;
- session-memory or architecture notes whose statements would otherwise be
  factually wrong.

Historical records remain historical when clearly dated; add a superseding
note rather than rewriting claims about what was true at that time.

## Migration order

1. Capture a timestamped recovery archive of the dirty worktree and host
   OpenCode configuration.
2. Add tests for the target topology and loopback handling.
3. Extract and deploy Open Notebook MCP independently.
4. Extract and deploy Steel MCP independently.
5. Repair, pin, and deploy Serena independently.
6. Validate all three endpoints without changing host OpenCode.
7. Switch host OpenCode's MCP configuration; validate real tool
   calls.
8. Remove the old OpenCode stack and containerized web service only after the
   switch is proven.
9. Regenerate access metadata and update all documentation.
10. Run the full verification suite and inspect the final worktree diff.

This ordering avoids a window where host OpenCode has no working MCP services
and makes rollback a configuration-file restoration rather than a stack
reconstruction.
