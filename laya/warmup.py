"""Download and load the English checkpoint before the HTTP server starts."""

from __future__ import annotations

from laya import Router

print("laya: loading english checkpoint", flush=True)
router = Router(device="cpu", max_loaded=1)
try:
    router.preload(["english"])
except Exception:
    router.predict(
        "warmup",
        {"ok": {"type": "noul", "instructions": "Is this a warmup request?"}},
    )
print("laya: checkpoint ready", flush=True)
