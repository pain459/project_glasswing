#!/usr/bin/env bash
# secrets-plan.sh — what an Infisical project needs before `make restart-all`.
#
# Every stack names the keys it needs in `stacks/<stack>/secrets.list`. Some of
# those values are non-secret configuration that is committed in `*.registry`
# files; the rest (passwords, keys, tokens) live only in Infisical and in your
# offline record. This prints the split so a rebuild does not discover a missing
# password one stack at a time.
#
# Usage:
#   ./scripts/secrets-plan.sh             # report per path and list manual values
#   ./scripts/secrets-plan.sh --template  # write blank registries under .local/secrets-templates
#
# The template mode is for a fresh Infisical project: fill in the values, then
# register each file with `./scripts/infisical-register.sh <path> <file>`.
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="report"
for arg in "$@"; do
  case "$arg" in
    --template) MODE="template" ;;
    -h | --help)
      sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "usage: $0 [--template]" >&2
      exit 2
      ;;
  esac
done

python3 - "$MODE" <<'PY'
import pathlib
import sys
import collections

MODE = sys.argv[1]
TEMPLATE_DIR = pathlib.Path(".local/secrets-templates")

# Secret paths that differ from /<stack>; keep in sync with Makefile INFISICAL_PATH.
PATH_OVERRIDES = {"otel-collector": "/openobserve", "vector": "/openobserve"}


def read_keys(path):
    keys = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        keys.append(line)
    return keys


registry_keys = {}
registry_paths = {}
for reg in sorted(pathlib.Path("stacks").glob("**/*.registry")):
    stack = reg.parts[1]
    path = "/global" if reg.name == "global-secrets.registry" else pathlib.PurePosixPath(PATH_OVERRIDES.get(stack, f"/{stack}")).as_posix()
    registry_paths.setdefault(path, []).append(str(reg))
    for key in read_keys(reg):
        key = key.split("=", 1)[0]
        registry_keys.setdefault(key, set()).add(str(reg))

required = collections.OrderedDict()
for secrets_list in sorted(pathlib.Path("stacks").glob("*/secrets.list")):
    stack = secrets_list.parent.name
    path = PATH_OVERRIDES.get(stack, f"/{stack}")
    for key in read_keys(secrets_list):
        required.setdefault(key, collections.OrderedDict()).setdefault(path, []).append(stack)

global_keys = set(read_keys(pathlib.Path("stacks/global-secrets.list")))
manual = {k: v for k, v in required.items() if k not in registry_keys}
covered = len(required) - len(manual)

print("Glasswing secrets plan")
print("======================")
print(f"{len(list(pathlib.Path('stacks').glob('*/compose.yaml')))} stacks, "
      f"{len({p for v in required.values() for p in v})} Infisical paths, "
      f"{len(required)} distinct keys")
print(f"  committed configuration values : {covered}")
print(f"  values only you can supply     : {len(manual)}")
print()

print("Register the committed configuration with:")
for path in sorted(registry_paths):
    for reg in registry_paths[path]:
        print(f"  ./scripts/infisical-register.sh {path} {reg}")
print()

print("Values to enter by hand (store them offline, never in Git):")
print()
print(f"{'Key':38s} {'Path(s)':34s} Used by")
print(f"{'-' * 38} {'-' * 34} {'-' * 30}")
for key in sorted(manual):
    paths = ", ".join(sorted(manual[key]))
    stacks = ", ".join(sorted({s for names in manual[key].values() for s in names}))
    print(f"{key:38s} {paths:34s} {stacks}")
print()

shared = {k: v for k, v in manual.items() if len(v) > 1}
if shared:
    print("Shared values must be identical wherever they appear:")
    for key in sorted(shared):
        print(f"  {key}: {', '.join(sorted(shared[key]))}")
    print()

print("The injection test also needs /test GLASSWING_TEST_SECRET=pathfinder-ready")
print("(see tests/infisical-secrets.list and `make secrets-check`).")

if MODE != "template":
    raise SystemExit(0)

TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
written = 0
for key in sorted(manual):
    for path, stacks in manual[key].items():
        target = TEMPLATE_DIR / (path.strip("/") + ".registry")
        if not target.exists():
            target.write_text(
                f"# Fill these in and register with:\n"
                f"#   ./scripts/infisical-register.sh {path} {target}\n"
                f"# Never commit this file.\n"
            )
        with target.open("a") as handle:
            handle.write(f"{key}=\n")
        written += 1

print()
print(f"[PASS] Wrote {written} blank entries under {TEMPLATE_DIR}/")
print(f"       fill them with your offline values, then:")
print(f"       for f in {TEMPLATE_DIR}/*.registry; do \\")
print(f"         ./scripts/infisical-register.sh \"/$(basename \"${{f%.registry}}\")\" \"$f\"; done")
PY
