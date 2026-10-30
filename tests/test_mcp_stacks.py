import json
import os
import subprocess
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]


def compose_config_files(files: list[Path], extra_env: dict[str, str]) -> dict:
    for compose in files:
        if not compose.exists():
            raise AssertionError(f"missing Compose file: {compose}")
    env = os.environ | {"GLASSWING_TZ": "Asia/Kolkata"} | extra_env
    compose_args = [argument for compose in files for argument in ("-f", str(compose))]
    result = subprocess.run(
        ["docker", "compose", *compose_args, "config", "--format", "json"],
        cwd=REPO,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr)
    return json.loads(result.stdout)


def compose_config(stack: str, extra_env: dict[str, str]) -> dict:
    return compose_config_files([REPO / "stacks" / stack / "compose.yaml"], extra_env)


class MCPStackTests(unittest.TestCase):
    def test_open_notebook_mcp_stack(self) -> None:
        config = compose_config(
            "open-notebook-mcp", {"OPEN_NOTEBOOK_PASSWORD": "test-password"}
        )
        self.assertEqual(config["name"], "glasswing-open-notebook-mcp")
        self.assertEqual(set(config["services"]), {"open-notebook-mcp"})

        service = config["services"]["open-notebook-mcp"]
        self.assertNotIn("container_name", service)
        self.assertEqual(
            service["ports"],
            [
                {
                    "mode": "ingress",
                    "target": 8000,
                    "published": "8001",
                    "protocol": "tcp",
                    "host_ip": "127.0.0.1",
                }
            ],
        )
        self.assertIn("glasswing", service["networks"])
        self.assertEqual(service["environment"]["OPEN_NOTEBOOK_URL"], "http://open_notebook:5055")
        self.assertIn("127.0.0.1:8001", service["environment"]["MCP_ALLOWED_HOSTS"])

        dockerfile = (REPO / "stacks" / "open-notebook-mcp" / "Dockerfile").read_text()
        self.assertIn("HEALTHCHECK", dockerfile)
        self.assertIn('"mcp==1.30.0"', dockerfile)
        self.assertIn('"open-notebook-mcp==0.3.0"', dockerfile)

    def test_steel_mcp_stack(self) -> None:
        config = compose_config("steel-mcp", {})
        self.assertEqual(config["name"], "glasswing-steel-mcp")
        self.assertEqual(set(config["services"]), {"steel-mcp"})

        service = config["services"]["steel-mcp"]
        self.assertNotIn("container_name", service)
        self.assertEqual(
            service["ports"],
            [
                {
                    "mode": "ingress",
                    "target": 8000,
                    "published": "8002",
                    "protocol": "tcp",
                    "host_ip": "127.0.0.1",
                }
            ],
        )
        self.assertIn("glasswing", service["networks"])
        self.assertEqual(service["environment"]["STEEL_LOCAL"], "true")
        self.assertEqual(service["environment"]["STEEL_BASE_URL"], "http://steel:3000")
        self.assertEqual(service["environment"]["STEEL_CONNECT_URL"], "ws://steel:3000")

        dockerfile = (REPO / "stacks" / "steel-mcp" / "Dockerfile").read_text()
        self.assertIn("f28a17571b10053e3df5e4bbbc4d3bc30f58ba39", dockerfile)
        self.assertIn('"supergateway@4.2.1"', dockerfile)
        self.assertIn("--outputTransport streamableHttp", dockerfile)
        self.assertIn("--stateful", dockerfile)
        self.assertIn("--healthEndpoint /healthz", dockerfile)
        self.assertIn("HEALTHCHECK", dockerfile)

    def test_serena_stack(self) -> None:
        config = compose_config("serena", {})
        self.assertEqual(config["name"], "glasswing-serena")
        self.assertEqual(set(config["services"]), {"init-permissions", "serena"})

        init = config["services"]["init-permissions"]
        self.assertEqual(init["user"], "root")
        init_command = " ".join(init["command"])
        self.assertIn("grep -q '^projects:'", init_command)
        self.assertIn("cp /bootstrap/serena_config.yml", init_command)
        self.assertIn("serena_config.yml.pre-v2", init_command)
        self.assertIn("projects: []", init_command)
        self.assertIn("chmod 600", init_command)
        init_volumes = {volume["target"]: volume for volume in init["volumes"]}
        self.assertTrue(init_volumes["/bootstrap/serena_config.yml"]["read_only"])

        service = config["services"]["serena"]
        self.assertEqual(
            service["image"],
            "glasswing/serena:2.1.1-node22",
        )
        self.assertIn("build", service)
        self.assertEqual(service["user"], "1000:1000")
        self.assertEqual(service["depends_on"]["init-permissions"]["condition"], "service_completed_successfully")
        self.assertEqual(
            {(port["host_ip"], port["published"], port["target"]) for port in service["ports"]},
            {("127.0.0.1", "9121", 9121), ("127.0.0.1", "24282", 24282)},
        )

        volumes = {volume["target"]: volume for volume in service["volumes"]}
        repos = volumes["/workspace/repos"]
        self.assertEqual(repos["source"], "/home/ravik/src_git")
        self.assertFalse(repos.get("read_only", False))
        self.assertEqual(volumes["/workspaces/serena/config"]["type"], "volume")
        self.assertNotIn("/workspaces/serena/config/serena_config.yml", volumes)
        self.assertNotIn("/workspace/repos/scip", json.dumps(config))
        self.assertNotIn(":latest", service["image"])

        dockerfile = (REPO / "stacks" / "serena" / "Dockerfile").read_text()
        self.assertIn(
            "ghcr.io/oraios/serena@sha256:0b0ff857c2eca5094aa3b4f406e58ba3cacf647b20d237adcfbbeadffc14cd65",
            dockerfile,
        )
        self.assertIn("/usr/local/bin/node", dockerfile)
        self.assertIn("/usr/local/bin/uvx", dockerfile)
        self.assertIn("useradd --uid 1000", dockerfile)
        self.assertIn("NPM_CONFIG_CACHE=/tmp/npm-cache", dockerfile)
        self.assertIn("UV_CACHE_DIR=/tmp/uv-cache", dockerfile)
        self.assertIn("UV_PYTHON_INSTALL_DIR=/tmp/uv-python", dockerfile)
        self.assertIn("UV_TOOL_DIR=/tmp/uv-tools", dockerfile)

        project_config = (REPO / ".serena" / "project.yml").read_text()
        self.assertIn("language_servers:", project_config)
        self.assertIn("- python", project_config)
        self.assertIn("- bash", project_config)

        serena_config = (stack := REPO / "stacks" / "serena" / "config" / "serena_config.yml").read_text()
        self.assertIn("projects: []", serena_config, f"missing required projects key in {stack}")

    def test_serena_override(self) -> None:
        stack = REPO / "stacks" / "serena"
        config = compose_config_files(
            [stack / "compose.yaml", stack / "compose.override.example.yaml"], {}
        )
        targets = {volume["target"] for volume in config["services"]["serena"]["volumes"]}
        self.assertIn("/workspace/repos", targets)
        self.assertIn("/workspace/extra/example", targets)

    def test_containerized_opencode_removed(self) -> None:
        self.assertFalse(
            (REPO / "stacks" / "opencode" / "compose.yaml").exists(),
            "the host-installed OpenCode must be the only OpenCode runtime",
        )

        homepage = (REPO / "stacks" / "homepage" / "config" / "services.yaml").read_text()
        self.assertNotIn("- OpenCode:", homepage)
        self.assertNotIn("- Serena:", homepage)
        self.assertNotIn("192.168.68.62:3019", homepage)
        self.assertNotIn("192.168.68.62:24282", homepage)

        preflight = (REPO / "scripts" / "ai-preflight.sh").read_text()
        self.assertNotIn("OPENCODE_CONTAINER", preflight)
        self.assertNotIn('docker exec "$OPENCODE_CONTAINER"', preflight)
        self.assertIn("OPENCODE_BIN", preflight)

    def test_active_docs_describe_host_opencode(self) -> None:
        active_docs = [
            "README.md",
            "REBUILD.md",
            "DR_RUNBOOK.md",
            "MAINTENANCE.md",
            "stacks/infisical-plan.md",
            "stacks/ollama/README.md",
        ]
        obsolete = (":3019", "STACK=opencode", "stacks/opencode", "glasswing-opencode")
        failures = []
        for relative in active_docs:
            text = (REPO / relative).read_text()
            for line_number, line in enumerate(text.splitlines(), 1):
                if any(marker in line for marker in obsolete):
                    failures.append(f"{relative}:{line_number}: {line.strip()}")
        self.assertEqual([], failures, "obsolete OpenCode deployment references:\n" + "\n".join(failures))

        readme = (REPO / "README.md").read_text()
        for endpoint in ("127.0.0.1:8001", "127.0.0.1:8002", "127.0.0.1:9121"):
            self.assertIn(endpoint, readme)
        self.assertIn("host-installed OpenCode", readme)

        example = json.loads((REPO / "config" / "opencode" / "opencode.example.json").read_text())
        self.assertEqual(example["model"], "ollama/qwen3.6-opencode:latest")
        self.assertEqual(
            {name: value["url"] for name, value in example["mcp"].items()},
            {
                "open-notebook": "http://127.0.0.1:8001/mcp",
                "steel": "http://127.0.0.1:8002/mcp",
                "serena": "http://127.0.0.1:9121/mcp",
            },
        )

    def test_mcp_lifecycle_targets_run_protocol_hooks(self) -> None:
        makefile = (REPO / "Makefile").read_text()
        rebuild = makefile.split("rebuild:", 1)[1].split("\nrestart:", 1)[0]
        restart = makefile.split("restart:", 1)[1].split("\nlogs:", 1)[0]
        for recipe in (rebuild, restart):
            self.assertIn("$(POST_UP_HOOK)", recipe)
            self.assertIn("--wait --wait-timeout 180", recipe)

        aggregate = makefile.split("mcp-preflight:", 1)[1].split("\n\n", 1)[0]
        self.assertIn("status=0", aggregate)
        self.assertEqual(aggregate.count("|| status=1"), 3)


if __name__ == "__main__":
    unittest.main()
