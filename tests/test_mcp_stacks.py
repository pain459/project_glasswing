import json
import os
import subprocess
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]


def compose_config(stack: str, extra_env: dict[str, str]) -> dict:
    compose = REPO / "stacks" / stack / "compose.yaml"
    if not compose.exists():
        raise AssertionError(f"missing Compose stack: {compose}")
    env = os.environ | {"GLASSWING_TZ": "Asia/Kolkata"} | extra_env
    result = subprocess.run(
        ["docker", "compose", "-f", str(compose), "config", "--format", "json"],
        cwd=REPO,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr)
    return json.loads(result.stdout)


class MCPStackTests(unittest.TestCase):
    def test_open_notebook_mcp_stack(self) -> None:
        config = compose_config(
            "open-notebook-mcp", {"OPEN_NOTEBOOK_PASSWORD": "test-password"}
        )
        self.assertEqual(config["name"], "glasswing-open-notebook-mcp")
        self.assertEqual(set(config["services"]), {"open-notebook-mcp"})

        service = config["services"]["open-notebook-mcp"]
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


if __name__ == "__main__":
    unittest.main()
