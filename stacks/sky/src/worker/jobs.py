"""
Scheduled job definitions for the Skytoday worker.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def register_jobs(scheduler):
    """Register all scheduled jobs with the scheduler."""
    # Jobs are registered in main.py for now
    # This module exists for future extensibility
    pass
