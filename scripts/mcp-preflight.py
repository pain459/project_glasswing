#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.error
import urllib.request
from typing import Any


PROTOCOL_VERSION = "2025-11-25"


class ProbeError(RuntimeError):
    pass


def _decode(body: bytes, content_type: str) -> dict[str, Any] | None:
    if not body.strip():
        return None
    text = body.decode("utf-8")
    if "text/event-stream" in content_type or any(
        line.startswith("data:") for line in text.splitlines()
    ):
        messages = []
        for line in text.splitlines():
            if line.startswith("data:"):
                messages.append(json.loads(line.removeprefix("data:").strip()))
        if not messages:
            raise ProbeError("SSE response contained no data event")
        return messages[-1]
    value = json.loads(text)
    if not isinstance(value, dict):
        raise ProbeError("JSON-RPC response was not an object")
    return value


def _post(
    url: str,
    payload: dict[str, Any],
    session: str | None,
    timeout: float,
) -> tuple[dict[str, Any] | None, str | None]:
    headers = {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
    }
    if session:
        headers["Mcp-Session-Id"] = session
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            next_session = response.headers.get("Mcp-Session-Id") or session
            return _decode(response.read(), response.headers.get_content_type()), next_session
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
        raise ProbeError(str(error)) from error
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ProbeError(f"invalid response payload: {error}") from error


def _result(response: dict[str, Any] | None, request_id: int) -> dict[str, Any]:
    if response is None:
        raise ProbeError(f"request {request_id} returned an empty response")
    if response.get("id") != request_id:
        raise ProbeError(f"request {request_id} returned mismatched id {response.get('id')}")
    if "error" in response:
        raise ProbeError(f"request {request_id} returned {response['error']}")
    result = response.get("result")
    if not isinstance(result, dict):
        raise ProbeError(f"request {request_id} returned no result object")
    return result


def probe(url: str, name: str, timeout: float = 10.0) -> int:
    try:
        initialized, session = _post(
            url,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {},
                    "clientInfo": {"name": "glasswing-preflight", "version": "1"},
                },
            },
            None,
            timeout,
        )
        init_result = _result(initialized, 1)
        if not init_result.get("protocolVersion"):
            raise ProbeError("initialize returned no protocolVersion")

        _post(
            url,
            {"jsonrpc": "2.0", "method": "notifications/initialized"},
            session,
            timeout,
        )
        listed, _ = _post(
            url,
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            session,
            timeout,
        )
        tools = _result(listed, 2).get("tools")
        if not isinstance(tools, list) or not tools:
            raise ProbeError("tools/list returned no tools")
    except ProbeError as error:
        print(f"[FAIL] {name}: {error}", file=sys.stderr)
        return 1
    print(f"[PASS] {name}: {len(tools)} tools")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--timeout", type=float, default=10.0)
    parser.add_argument("url")
    args = parser.parse_args()
    return probe(args.url, args.name, args.timeout)


if __name__ == "__main__":
    raise SystemExit(main())
