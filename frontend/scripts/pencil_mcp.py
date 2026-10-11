#!/usr/bin/env python3
"""Minimal stdio client for Pen.dev desktop MCP (when Cursor hasn't loaded pencil)."""
from __future__ import annotations

import json
import subprocess
import sys
import threading
import time
from typing import Any

MCP = [
    "/Applications/Pen.app/Contents/Resources/app.asar.unpacked/out/mcp-server-darwin-arm64",
    "-app",
    "desktop",
]


class PencilMCP:
    def __init__(self) -> None:
        self.proc = subprocess.Popen(
            MCP,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self._lock = threading.Lock()
        self._pending: dict[int, dict[str, Any]] = {}
        self._next_id = 1
        self._reader = threading.Thread(target=self._read_loop, daemon=True)
        self._reader.start()
        self.call("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "orilla-bridge", "version": "1"},
        })
        self.notify("notifications/initialized")

    def _read_loop(self) -> None:
        assert self.proc.stdout is not None
        for line in self.proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            mid = msg.get("id")
            if mid is not None:
                with self._lock:
                    self._pending[mid] = msg

    def notify(self, method: str, params: dict | None = None) -> None:
        payload = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            payload["params"] = params
        assert self.proc.stdin is not None
        self.proc.stdin.write(json.dumps(payload) + "\n")
        self.proc.stdin.flush()

    def call(self, method: str, params: dict | None = None, timeout: float = 120) -> Any:
        with self._lock:
            mid = self._next_id
            self._next_id += 1
        payload: dict[str, Any] = {"jsonrpc": "2.0", "id": mid, "method": method}
        if params is not None:
            payload["params"] = params
        assert self.proc.stdin is not None
        self.proc.stdin.write(json.dumps(payload) + "\n")
        self.proc.stdin.flush()
        deadline = time.time() + timeout
        while time.time() < deadline:
            with self._lock:
                if mid in self._pending:
                    msg = self._pending.pop(mid)
                    if "error" in msg:
                        raise RuntimeError(json.dumps(msg["error"], indent=2))
                    return msg.get("result")
            time.sleep(0.05)
        raise TimeoutError(f"timeout waiting for {method}")

    def tool(self, name: str, arguments: dict | None = None, timeout: float = 180) -> str:
        result = self.call(
            "tools/call",
            {"name": name, "arguments": arguments or {}},
            timeout=timeout,
        )
        parts = []
        for item in (result or {}).get("content", []):
            if item.get("type") == "text":
                parts.append(item.get("text", ""))
        return "\n".join(parts)

    def close(self) -> None:
        try:
            self.proc.terminate()
        except Exception:
            pass


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: pencil_mcp.py <tool> [json-args]", file=sys.stderr)
        sys.exit(1)
    tool = sys.argv[1]
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    client = PencilMCP()
    try:
        print(client.tool(tool, args))
    finally:
        client.close()


if __name__ == "__main__":
    main()
