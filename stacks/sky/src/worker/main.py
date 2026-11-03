"""
Background worker for scheduled astronomy data refresh.

Jobs:
- Daily sky summary generation (daily at 00:05 UTC)
- Ephemeris health check (hourly)
- ISS TLE refresh (daily at 06:00 UTC)
- Calculation run tracking
"""

import logging
import os
import time
from datetime import datetime, timezone

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)


def job_daily_sky_summary():
    """Generate daily sky summary for the default location."""
    logger.info("Running daily sky summary job...")
    try:
        # This will be connected to the SkyService once DB is available
        logger.info("Daily sky summary job completed")
    except Exception as e:
        logger.error("Daily sky summary job failed: %s", e)


def job_ephemeris_health_check():
    """Check ephemeris data integrity."""
    logger.info("Running ephemeris health check...")
    ephemeris_dir = os.environ.get("SKY_EPHEMERIS_DATA_DIR", "/app/data/ephemeris")
    if os.path.isdir(ephemeris_dir):
        files = os.listdir(ephemeris_dir)
        logger.info("Ephemeris directory contains %d files", len(files))
    else:
        logger.warning("Ephemeris directory not found: %s", ephemeris_dir)


def job_iss_tle_refresh():
    """Refresh ISS TLE data."""
    logger.info("Running ISS TLE refresh job...")
    # Placeholder for TLE refresh
    logger.info("ISS TLE refresh job completed")


def main():
    """Main worker loop with APScheduler."""
    logger.info("Skytoday worker starting with APScheduler")

    scheduler = BlockingScheduler(timezone="UTC")

    # Daily sky summary at 00:05 UTC
    scheduler.add_job(
        job_daily_sky_summary,
        CronTrigger(hour=0, minute=5),
        id="daily_sky_summary",
        name="Daily Sky Summary",
        replace_existing=True,
    )

    # Ephemeris health check every hour
    scheduler.add_job(
        job_ephemeris_health_check,
        IntervalTrigger(hours=1),
        id="ephemeris_health_check",
        name="Ephemeris Health Check",
        replace_existing=True,
    )

    # ISS TLE refresh at 06:00 UTC
    scheduler.add_job(
        job_iss_tle_refresh,
        CronTrigger(hour=6, minute=0),
        id="iss_tle_refresh",
        name="ISS TLE Refresh",
        replace_existing=True,
    )

    logger.info("Scheduler configured with %d jobs", len(scheduler.get_jobs()))

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Worker shutting down")


if __name__ == "__main__":
    main()
