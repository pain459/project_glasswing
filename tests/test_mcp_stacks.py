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
        self.assertIn("chmod 600", init_command)
        init_volumes = {volume["target"]: volume for volume in init["volumes"]}
        self.assertTrue(init_volumes["/bootstrap/serena_config.yml"]["read_only"])

        service = config["services"]["serena"]
        self.assertEqual(
            service["image"],
            "ghcr.io/oraios/serena@sha256:0b0ff857c2eca5094aa3b4f406e58ba3cacf647b20d237adcfbbeadffc14cd65",
        )
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


if __name__ == "__main__":
    unittest.main()
