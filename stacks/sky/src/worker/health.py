"""
Worker health check.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_last_heartbeat = None


def heartbeat():
    """Record a heartbeat timestamp."""
    global _last_heartbeat
    _last_heartbeat = datetime.now(timezone.utc)
    return _last_heartbeat


def get_health() -> dict:
    """Return worker health status."""
    return {
        "status": "healthy",
        "last_heartbeat": _last_heartbeat.isoformat() if _last_heartbeat else None,
    }
