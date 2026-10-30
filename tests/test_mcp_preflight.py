import json
import subprocess
import sys
import threading
import unittest
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "scripts" / "mcp-preflight.py"


class MCPHandler(BaseHTTPRequestHandler):
    mode = "stateless"

    def log_message(self, format: str, *args: object) -> None:
        return

    def send_payload(self, payload: dict, *, session: bool = False) -> None:
        body = json.dumps(payload).encode()
        self.send_response(200)
        if session:
            self.send_header("Mcp-Session-Id", "fixture-session")
        if self.mode == "sse":
            body = b"event: message\ndata: " + body + b"\n\n"
            self.send_header("Content-Type", "text/event-stream")
        else:
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        if self.mode == "http500":
            self.send_error(500)
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        if self.mode == "invalid_json":
            body = b"not-json"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        request = json.loads(raw or b"{}")
        method = request.get("method")
        if method == "initialize":
            self.send_payload(
                {
                    "jsonrpc": "2.0",
                    "id": request["id"],
                    "result": {
                        "protocolVersion": "2025-11-25",
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "fixture", "version": "1"},
                    },
                },
                session=self.mode == "stateful",
            )
            return
        if self.mode == "stateful" and self.headers.get("Mcp-Session-Id") != "fixture-session":
            self.send_error(400, "missing MCP session")
            return
        if self.mode == "missing_session":
            self.send_error(400, "session required but initialize returned none")
            return
        if method == "notifications/initialized":
            self.send_response(202)
            self.end_headers()
            return
        if method == "tools/list":
            tools = [] if self.mode == "empty_tools" else [{"name": "fixture_tool"}]
            self.send_payload(
                {"jsonrpc": "2.0", "id": request["id"], "result": {"tools": tools}}
            )
            return
        self.send_error(400)


@contextmanager
def fixture(mode: str):
    handler = type("ModeHandler", (MCPHandler,), {"mode": mode})
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/mcp"
    finally:
        server.shutdown()
        thread.join()
        server.server_close()


class MCPPreflightTests(unittest.TestCase):
    def run_probe(self, mode: str) -> subprocess.CompletedProcess[str]:
        with fixture(mode) as url:
            return subprocess.run(
                [sys.executable, str(SCRIPT), "--name", mode, url],
                text=True,
                capture_output=True,
                check=False,
            )

    def test_stateless_json_server_passes(self) -> None:
        result = self.run_probe("stateless")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("[PASS] stateless: 1 tools", result.stdout)

    def test_stateful_server_reuses_session(self) -> None:
        result = self.run_probe("stateful")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("[PASS] stateful: 1 tools", result.stdout)

    def test_sse_server_passes(self) -> None:
        result = self.run_probe("sse")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("[PASS] sse: 1 tools", result.stdout)

    def test_http_error_fails(self) -> None:
        self.assertNotEqual(self.run_probe("http500").returncode, 0)

    def test_invalid_json_fails(self) -> None:
        self.assertNotEqual(self.run_probe("invalid_json").returncode, 0)

    def test_missing_session_fails(self) -> None:
        self.assertNotEqual(self.run_probe("missing_session").returncode, 0)

    def test_empty_tool_list_fails(self) -> None:
        self.assertNotEqual(self.run_probe("empty_tools").returncode, 0)


if __name__ == "__main__":
    unittest.main()
