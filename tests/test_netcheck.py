"""Tests for scripts/netcheck.sh — the mandatory LAN IP reservation gate."""

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
LAN = "192.168.68.62"
OTHER = "192.168.29.97"


class NetcheckTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        (self.root / "scripts").mkdir()
        shutil.copy(REPO / "scripts" / "netcheck.sh", self.root / "scripts" / "netcheck.sh")
        (self.root / "stacks" / "infisical").mkdir(parents=True)
        self.bin = self.root / "bin"
        self.bin.mkdir()

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _host_addresses(self, *addresses: tuple[str, str]) -> None:
        """Install a fake `ip` that reports the given (interface, address/prefix) pairs."""
        lines = [
            f"{index}: {iface}    inet {addr} brd 0.0.0.0 scope global {iface}"
            for index, (iface, addr) in enumerate(addresses, start=2)
        ]
        fake = self.bin / "ip"
        fake.write_text("#!/bin/sh\ncat <<'EOF'\n" + "\n".join(lines) + "\nEOF\n")
        fake.chmod(0o755)

    def _write_env(self, value: str) -> None:
        (self.root / "stacks" / "infisical" / ".env").write_text(
            f"GLASSWING_HOST_IP={value}\n"
        )

    def _env(self, **extra: str) -> dict[str, str]:
        env = {k: v for k, v in os.environ.items() if k != "GLASSWING_HOST_IP"}
        env["PATH"] = f"{self.bin}:{env.get('PATH', '')}"
        env.update(extra)
        return env

    def _run(self, *args: str, env: dict[str, str] | None = None) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["bash", str(self.root / "scripts" / "netcheck.sh"), *args],
            cwd=self.root,
            env=env if env is not None else self._env(),
            text=True,
            capture_output=True,
            check=False,
        )

    def test_reserved_address_present_passes(self) -> None:
        self._write_env(LAN)
        self._host_addresses(("enp6s0", f"{LAN}/22"))
        result = self._run()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("[PASS]", result.stdout)
        self.assertIn(LAN, result.stdout)

    def test_mismatch_fails_and_reports_both_addresses(self) -> None:
        self._write_env(LAN)
        self._host_addresses(("enp6s0", f"{OTHER}/24"))
        result = self._run()
        self.assertEqual(result.returncode, 1)
        self.assertIn(LAN, result.stderr)
        self.assertIn(OTHER, result.stderr)
        self.assertIn("no stacks were started", result.stderr)

    def test_explicit_argument_overrides_env_file(self) -> None:
        self._write_env(LAN)
        self._host_addresses(("enp6s0", f"{OTHER}/24"))
        result = self._run(OTHER)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_exported_variable_overrides_env_file(self) -> None:
        self._write_env(LAN)
        self._host_addresses(("enp6s0", f"{OTHER}/24"))
        result = self._run(env=self._env(GLASSWING_HOST_IP=OTHER))
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_no_configured_address_fails(self) -> None:
        self._host_addresses(("enp6s0", f"{LAN}/22"))
        result = self._run()
        self.assertEqual(result.returncode, 1)
        self.assertIn("No host IP configured", result.stderr)

    def test_docker_bridge_addresses_are_ignored(self) -> None:
        self._write_env(LAN)
        self._host_addresses(
            ("enp6s0", f"{OTHER}/24"),
            ("br-adaf1bc27ee9", f"{LAN}/24"),
        )
        result = self._run()
        self.assertEqual(result.returncode, 1)
        self.assertIn(LAN, result.stderr)

    def test_similar_address_does_not_match(self) -> None:
        self._write_env(LAN)
        self._host_addresses(("enp6s0", "192.168.68.6/22"))
        result = self._run()
        self.assertEqual(result.returncode, 1)


if __name__ == "__main__":
    unittest.main()
