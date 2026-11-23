"""Always-on ComfyUI dispatcher.

The Homepage tile and the browser stay pointed at :3042. This service owns that
port permanently and forwards to ComfyUI on the internal Docker network.

Opening the UI or submitting work wakes ComfyUI on demand:

  * GET  / or /index.html        -> wake (the app is being opened)
  * any POST/PUT/PATCH/DELETE    -> wake (prompt, upload, interrupt, ...)
  * WebSocket upgrade (/ws)      -> wake (progress stream)
  * GET  /health                 -> gate-only, never wakes
  * other GETs (/queue, /history, /view, ...) -> passive, never wake

Wake order matters on the single 4090: sleep the resident vLLM model first,
then start the ComfyUI container, then wait for its health endpoint. The reverse
direction (coding takes the GPU back) is handled by scripts/gpu-mode.sh via
stacks/vllm/switch-model.sh.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from pathlib import Path

import aiohttp
from aiohttp import web, WSMsgType

LOG = logging.getLogger("comfyui-gate")

VLLM_HOST_IP = os.environ.get("GLASSWING_HOST_IP", "192.168.68.62")
VLLM_REGISTRY = Path(os.environ.get("VLLM_REGISTRY", "/app/model-registry.yaml"))
BACKEND_BASE = os.environ.get("COMFYUI_BACKEND", "http://glasswing-comfyui:8188").rstrip("/")
WS_BASE = os.environ.get("COMFYUI_WS_BACKEND", BACKEND_BASE.replace("http://", "ws://").replace("https://", "wss://")).rstrip("/")
COMFYUI_CONTAINER = os.environ.get("COMFYUI_CONTAINER", "glasswing-comfyui")
DOCKER_SOCKET = os.environ.get("DOCKER_SOCKET", "/var/run/docker.sock")
WAKE_TIMEOUT = int(os.environ.get("COMFYUI_WAKE_TIMEOUT", "90"))

HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
}

WAKE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
WAKE_GET_PATHS = {"/", "/index.html"}

_wake_lock = asyncio.Lock()


# --------------------------------------------------------------------------- #
# Registry parsing
# --------------------------------------------------------------------------- #

def parse_registry() -> list[tuple[str, str, int]]:
    """Return [(model, container, port)] from model-registry.yaml."""
    entries: list[tuple[str, str, int]] = []
    model = ""
    container = ""
    port: int | None = None

    def flush() -> None:
        if model and container and port:
            entries.append((model, container, port))

    for raw in VLLM_REGISTRY.read_text(encoding="utf-8").splitlines():
        key = re.match(r"^  ([A-Za-z0-9._-]+):\s*$", raw)
        if key:
            flush()
            model, container, port = key.group(1), "", None
            continue
        if not model:
            continue
        found_container = re.match(r"^\s{4}container:\s*(\S+)\s*$", raw)
        if found_container:
            container = found_container.group(1)
            continue
        found_port = re.match(r"^\s{4}port:\s*(\d+)\s*$", raw)
        if found_port:
            port = int(found_port.group(1))
    flush()
    return entries


# --------------------------------------------------------------------------- #
# Wake sequence
# --------------------------------------------------------------------------- #

async def backend_healthy(session: aiohttp.ClientSession) -> bool:
    try:
        async with session.get(f"{BACKEND_BASE}/system_stats", timeout=aiohttp.ClientTimeout(total=2)) as resp:
            return resp.status == 200
    except (aiohttp.ClientError, asyncio.TimeoutError):
        return False


async def container_status(docker: aiohttp.ClientSession, name: str) -> str:
    """Docker state word for a container: running, restarting, exited, missing..."""
    try:
        async with docker.get(
            f"http://docker/containers/{name}/json",
            timeout=aiohttp.ClientTimeout(total=5),
        ) as resp:
            if resp.status == 404:
                return "missing"
            if resp.status >= 400:
                return "unknown"
            info = await resp.json()
    except (aiohttp.ClientError, asyncio.TimeoutError, OSError):
        return "unknown"
    return info.get("State", {}).get("Status", "unknown")


async def stop_container(docker: aiohttp.ClientSession, name: str, reason: str) -> None:
    """Stop a vLLM container so ComfyUI can be certain the VRAM is released."""
    LOG.warning("stopping vLLM container %s (%s)", name, reason)
    try:
        async with docker.post(
            f"http://docker/containers/{name}/stop",
            params={"t": "20"},
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status not in (204, 304):
                LOG.warning("docker stop %s returned HTTP %s", name, resp.status)
    except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as exc:
        LOG.warning("could not stop vLLM container %s: %s", name, exc)


async def sleep_vllm(session: aiohttp.ClientSession, docker: aiohttp.ClientSession) -> None:
    """Release the GPU for ComfyUI.

    Healthy models are Level-1 slept. A container that is running but cannot
    confirm a clean sleep - unresponsive, restarting, or with a failing /sleep -
    is stopped instead, because it may still be holding VRAM.
    """
    for model, container, port in parse_registry():
        status = await container_status(docker, container)
        if status == "restarting":
            await stop_container(docker, container, "restarting and may hold VRAM")
            continue
        if status in ("exited", "created", "dead", "paused", "missing"):
            continue
        # Anything else (running, or Docker state unknown) is probed directly:
        # a reachable model must still be slept even if the Docker API is slow.

        url = f"http://{VLLM_HOST_IP}:{port}"
        sleeping: bool | None = None
        try:
            async with session.get(f"{url}/is_sleeping", timeout=aiohttp.ClientTimeout(total=3)) as resp:
                state = await resp.json(content_type=None)
            sleeping = state.get("is_sleeping")
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError, ValueError) as exc:
            LOG.warning("could not query /is_sleeping for %s: %s", model, exc)

        if sleeping is True:
            continue
        if sleeping is None:
            await stop_container(docker, container, "unresponsive; cannot confirm sleep")
            continue

        LOG.info("sleeping vLLM model %s on port %s", model, port)
        try:
            async with session.post(f"{url}/sleep", timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status >= 400:
                    LOG.warning("/sleep for %s returned HTTP %s", model, resp.status)
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as exc:
            LOG.warning("/sleep for %s failed: %s", model, exc)

        # /sleep is synchronous, but confirm before touching ComfyUI.
        settled = False
        for _ in range(10):
            try:
                async with session.get(f"{url}/is_sleeping", timeout=aiohttp.ClientTimeout(total=3)) as resp:
                    state = await resp.json(content_type=None)
                if state.get("is_sleeping") is True:
                    settled = True
                    break
            except (aiohttp.ClientError, asyncio.TimeoutError, OSError, ValueError):
                pass
            await asyncio.sleep(1)
        if not settled:
            await stop_container(docker, container, "sleep did not settle")


async def start_comfyui(docker: aiohttp.ClientSession) -> None:
    """Start an existing (stopped) ComfyUI container through the Docker API."""
    base = "http://docker/containers"
    try:
        async with docker.get(f"{base}/{COMFYUI_CONTAINER}/json", timeout=aiohttp.ClientTimeout(total=5)) as resp:
            if resp.status == 404:
                raise RuntimeError(f"ComfyUI container '{COMFYUI_CONTAINER}' does not exist; run 'make gpu-comfyui' once")
            if resp.status >= 400:
                raise RuntimeError(f"Docker API returned HTTP {resp.status} for {COMFYUI_CONTAINER}")
            info = await resp.json()
    except aiohttp.ClientError as exc:
        raise RuntimeError(f"cannot reach Docker socket {DOCKER_SOCKET}: {exc}") from exc

    if info.get("State", {}).get("Status") == "running":
        return

    LOG.info("starting container %s", COMFYUI_CONTAINER)
    async with docker.post(f"{base}/{COMFYUI_CONTAINER}/start", timeout=aiohttp.ClientTimeout(total=20)) as resp:
        if resp.status not in (204, 304):
            body = await resp.text()
            raise RuntimeError(f"failed to start {COMFYUI_CONTAINER}: HTTP {resp.status}: {body[:300]}")


async def wait_for_backend(session: aiohttp.ClientSession) -> bool:
    deadline = time.monotonic() + WAKE_TIMEOUT
    while time.monotonic() < deadline:
        if await backend_healthy(session):
            return True
        await asyncio.sleep(1)
    return False


async def ensure_backend() -> bool:
    """Sleep vLLM, start ComfyUI, wait until it serves. Returns success."""
    async with _wake_lock:
        async with aiohttp.ClientSession() as session:
            async with aiohttp.ClientSession(
                connector=aiohttp.UnixConnector(path=DOCKER_SOCKET)
            ) as docker:
                # Always free the GPU first. ComfyUI may already be running
                # while some other path woke a vLLM model.
                LOG.info("wake requested: freeing GPU")
                await sleep_vllm(session, docker)
                if await backend_healthy(session):
                    return True
                try:
                    await start_comfyui(docker)
                except (RuntimeError, aiohttp.ClientError) as exc:
                    LOG.error("cannot start ComfyUI: %s", exc)
                    return False
                if not await wait_for_backend(session):
                    LOG.error("ComfyUI did not become healthy within %ss", WAKE_TIMEOUT)
                    return False
                LOG.info("ComfyUI is ready")
                return True


# --------------------------------------------------------------------------- #
# Proxying
# --------------------------------------------------------------------------- #

def needs_wake(request: web.Request) -> bool:
    if request.path == "/health":
        return False
    if request.method in WAKE_METHODS:
        return True
    if request.method == "GET" and request.path in WAKE_GET_PATHS:
        return True
    if request.headers.get("Upgrade", "").lower() == "websocket":
        return True
    return False


async def proxy_http(request: web.Request) -> web.StreamResponse:
    url = f"{BACKEND_BASE}{request.rel_url}"
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}
    body = await request.read()
    timeout = aiohttp.ClientTimeout(total=0, sock_read=300)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.request(request.method, url, headers=headers, data=body, allow_redirects=False) as upstream:
                resp_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP}
                resp = web.StreamResponse(status=upstream.status, headers=resp_headers)
                await resp.prepare(request)
                async for chunk in upstream.content.iter_chunked(64 * 1024):
                    await resp.write(chunk)
                await resp.write_eof()
                return resp
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        raise web.HTTPBadGateway(text=f"ComfyUI backend unavailable: {exc}") from exc


async def proxy_ws(request: web.Request) -> web.WebSocketResponse:
    downstream = web.WebSocketResponse(heartbeat=None)
    await downstream.prepare(request)
    url = f"{WS_BASE}{request.rel_url}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(url, heartbeat=None) as upstream:
                async def from_browser() -> None:
                    async for msg in downstream:
                        if msg.type == WSMsgType.TEXT:
                            await upstream.send_str(msg.data)
                        elif msg.type == WSMsgType.BINARY:
                            await upstream.send_bytes(msg.data)
                        elif msg.type == WSMsgType.CLOSE:
                            await upstream.close()
                            return
                        elif msg.type == WSMsgType.ERROR:
                            return

                async def from_comfy() -> None:
                    async for msg in upstream:
                        if msg.type == WSMsgType.TEXT:
                            await downstream.send_str(msg.data)
                        elif msg.type == WSMsgType.BINARY:
                            await downstream.send_bytes(msg.data)
                        elif msg.type in (WSMsgType.CLOSE, WSMsgType.CLOSED, WSMsgType.ERROR):
                            await downstream.close()
                            return

                await asyncio.gather(from_browser(), from_comfy(), return_exceptions=True)
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        LOG.warning("WebSocket proxy error: %s", exc)
        await downstream.close()
    return downstream


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #

async def health(request: web.Request) -> web.Response:
    async with aiohttp.ClientSession() as session:
        up = await backend_healthy(session)
    return web.json_response({
        "status": "ok",
        "service": "glasswing-comfyui-gate",
        "comfyui": "running" if up else "stopped",
    })


async def dispatch(request: web.Request) -> web.StreamResponse:
    if needs_wake(request):
        if not await ensure_backend():
            raise web.HTTPServiceUnavailable(
                text="ComfyUI could not be woken. Check that vLLM is reachable and that the ComfyUI container exists."
            )
    else:
        # Passive polls must not start a container; report a clear 503 instead.
        async with aiohttp.ClientSession() as session:
            if not await backend_healthy(session):
                raise web.HTTPServiceUnavailable(text="ComfyUI is stopped; open / to wake it.")
    if request.headers.get("Upgrade", "").lower() == "websocket":
        return await proxy_ws(request)
    return await proxy_http(request)


def make_app() -> web.Application:
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    app = web.Application(client_max_size=512 * 1024 * 1024)
    app.router.add_get("/health", health)
    app.router.add_route("*", "/{tail:.*}", dispatch)
    return app


if __name__ == "__main__":
    web.run_app(make_app(), host="0.0.0.0", port=int(os.environ.get("PORT", "80")))
