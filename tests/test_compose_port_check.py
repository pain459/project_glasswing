import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "scripts" / "compose-port-check.py"


class ComposePortCheckTests(unittest.TestCase):
    def run_check(self, stacks: dict[str, str]) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, compose in stacks.items():
                stack_dir = root / "stacks" / name
                stack_dir.mkdir(parents=True)
                (stack_dir / "compose.yaml").write_text(compose)
            return subprocess.run(
                [sys.executable, str(SCRIPT), "--root", str(root)],
                text=True,
                capture_output=True,
                check=False,
            )

    def test_accepts_and_classifies_loopback_binding(self) -> None:
        result = self.run_check(
            {"alpha": 'services:\n  api:\n    ports:\n      - "127.0.0.1:8001:8000"\n'}
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("LOOPBACK 8001 alpha", result.stdout)
        self.assertNotIn("LITERAL", result.stdout)
        self.assertNotIn("UNBOUND", result.stdout)

    def test_reports_all_interface_and_hardcoded_lan_bindings(self) -> None:
        result = self.run_check(
            {
                "alpha": (
                    'services:\n  api:\n    ports:\n'
                    '      - "0.0.0.0:8001:8000"\n'
                    '      - "192.168.68.62:8002:8000"\n'
                )
            }
        )
        self.assertIn("LITERAL alpha 8001,8002", result.stdout)

    def test_reports_unqualified_binding(self) -> None:
        result = self.run_check(
            {"alpha": 'services:\n  api:\n    ports:\n      - "8001:8000"\n'}
        )
        self.assertIn("UNBOUND alpha:8001", result.stdout)

    def test_reports_duplicate_host_port(self) -> None:
        result = self.run_check(
            {
                "alpha": 'services:\n  api:\n    ports:\n      - "127.0.0.1:8001:8000"\n',
                "beta": 'services:\n  api:\n    ports:\n      - "${GLASSWING_HOST_IP:?required}:8001:8000"\n',
            }
        )
        self.assertIn("DUP 8001 alpha beta", result.stdout)


if __name__ == "__main__":
    unittest.main()
