import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]


class AccessMapTests(unittest.TestCase):
    def test_stdout_preserves_loopback_and_labels_access_scope(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "scripts").mkdir()
            shutil.copy(REPO / "scripts" / "access-map.sh", root / "scripts" / "access-map.sh")
            for name in ("alpha", "beta"):
                (root / "stacks" / name).mkdir(parents=True)
            (root / "stacks" / "alpha" / "compose.yaml").write_text(
                'services:\n  api:\n    ports:\n      - "127.0.0.1:8001:8000"\n'
            )
            (root / "stacks" / "beta" / "compose.yaml").write_text(
                'services:\n  web:\n    ports:\n'
                '      - "${GLASSWING_HOST_IP:?required}:9000:9000"\n'
            )
            env = os.environ | {"GLASSWING_HOST_IP": "192.168.68.62"}
            result = subprocess.run(
                ["bash", str(root / "scripts" / "access-map.sh"), "--stdout"],
                cwd=root,
                env=env,
                text=True,
                capture_output=True,
                check=False,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("| Access |", result.stdout)
        self.assertIn("http://127.0.0.1:8001", result.stdout)
        self.assertRegex(result.stdout, r"(?m)^\| `alpha` .*\| host-only \|$")
        self.assertIn("http://192.168.68.62:9000", result.stdout)
        self.assertRegex(result.stdout, r"(?m)^\| `beta` .*\| LAN \|$")


if __name__ == "__main__":
    unittest.main()
