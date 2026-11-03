"""
Background worker for scheduled astronomy data refresh.

Jobs:
- Daily sky summary generation (daily at 00:05 UTC)
- Ephemeris health check (hourly)
- ISS TLE refresh (daily at 06:00 UTC)
- Calculation run tracking
"""

import json
import logging
import os
import time
from datetime import datetime, timezone

import requests
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

# ─── OpenTelemetry Setup ──────────────────────────────────────────────────────

def _setup_otel():
    """Configure OpenTelemetry tracing for the worker."""
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

        resource = Resource.create({
            "service.name": os.environ.get("OTEL_SERVICE_NAME", "glasswing-sky-worker"),
            "deployment.environment": os.environ.get(
                "OTEL_RESOURCE_ATTRIBUTES", "deployment.environment=glasswing"
            ).split(",")[0].split("=")[1] if "=" in os.environ.get("OTEL_RESOURCE_ATTRIBUTES", "") else "glasswing",
        })

        provider = TracerProvider(resource=resource)
        otlp_endpoint = os.environ.get(
            "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
            os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
        )
        processor = BatchSpanProcessor(
            OTLPSpanExporter(endpoint=otlp_endpoint),
        )
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)

        # Auto-instrument requests and SQLAlchemy
        RequestsInstrumentor().instrument()
        SQLAlchemyInstrumentor().instrument(enable_commenter=True, commenter_options={})

        logger.info("OpenTelemetry initialized for %s", resource.attributes.get("service.name"))
    except ImportError:
        logger.warning("OpenTelemetry packages not installed; tracing disabled")
    except Exception as e:
        logger.warning("OpenTelemetry setup failed: %s", e)


# ─── Configuration ────────────────────────────────────────────────────────────

API_BASE_URL = os.environ.get("SKY_API_URL", "http://glasswing-sky-api:8000")
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg://sky:sky@glasswing-sky-postgres:5432/sky",
)

db_engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)


# ─── Job: Daily Sky Summary ───────────────────────────────────────────────────

def job_daily_sky_summary():
    """Generate daily sky summary for the default location and persist to DB."""
    logger.info("Running daily sky summary job...")
    run_id = None
    try:
        # Track the calculation run
        run_id = _create_calculation_run("daily_sky_summary", "running")

        # Fetch daily sky data from the API
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        resp = requests.get(
            f"{API_BASE_URL}/api/v1/sky/daily",
            params={"date": today},
            timeout=60,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"API returned {resp.status_code}: {resp.text[:200]}")

        daily_json = resp.json()
        daily_data = daily_json.get("data", {})

        # Also fetch weather for the snapshot
        weather_resp = requests.get(
            f"{API_BASE_URL}/api/v1/weather",
            params={"forecast_hours": 24},
            timeout=30,
        )
        weather_data = {}
        if weather_resp.status_code == 200:
            weather_data = weather_resp.json().get("data", {})

        # Persist to daily_sky_snapshots table
        _persist_sky_snapshot(today, daily_data, weather_data)

        # Update calculation run as completed
        _complete_calculation_run(run_id, "completed")

        logger.info("Daily sky summary job completed for %s", today)
    except Exception as e:
        logger.error("Daily sky summary job failed: %s", e)
        if run_id is not None:
            _complete_calculation_run(run_id, "failed", error=str(e))


def _persist_sky_snapshot(date_str: str, daily_data: dict, weather_data: dict):
    """Write a DailySkySnapshot row for the default location."""
    try:
        session = SessionLocal()
        # Get the default location ID
        loc = session.execute(
            text("SELECT id FROM locations WHERE is_default = true LIMIT 1")
        ).fetchone()
        if not loc:
            # Fallback: get the first location
            loc = session.execute(
                text("SELECT id FROM locations LIMIT 1")
            ).fetchone()
        if not loc:
            logger.warning("No locations in DB; skipping snapshot persistence")
            session.close()
            return

        location_id = loc[0]

        # Build snapshot payload from API response
        snapshot_data = {
            "location_id": location_id,
            "date_utc": datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc),
            "solar_data": daily_data.get("solar", {}),
            "lunar_data": daily_data.get("lunar", {}),
            "planet_data": daily_data.get("planets", {}),
            "milkyway_data": daily_data.get("milkyway", {}),
            "weather_data": weather_data,
            "engine_version": daily_data.get("metadata", {}).get("engine_version"),
            "ephemeris_name": daily_data.get("metadata", {}).get("ephemeris"),
        }

        # Use INSERT ... ON CONFLICT to upsert (unique on location_id + date_utc)
        session.execute(
            text("""
                INSERT INTO daily_sky_snapshots
                    (location_id, date_utc, solar_data, lunar_data, planet_data,
                     milkyway_data, weather_data, engine_version, ephemeris_name)
                VALUES
                    (:loc_id, :date_utc, :solar, :lunar, :planets,
                     :milkyway, :weather, :engine_ver, :eph_name)
                ON CONFLICT (location_id, date_utc)
                DO UPDATE SET
                    solar_data = EXCLUDED.solar_data,
                    lunar_data = EXCLUDED.lunar_data,
                    planet_data = EXCLUDED.planet_data,
                    milkyway_data = EXCLUDED.milkyway_data,
                    weather_data = EXCLUDED.weather_data,
                    engine_version = EXCLUDED.engine_version,
                    ephemeris_name = EXCLUDED.ephemeris_name,
                    calculated_at = NOW()
            """),
            params={
                "loc_id": snapshot_data["location_id"],
                "date_utc": snapshot_data["date_utc"],
                "solar": json.dumps(snapshot_data["solar_data"]) if snapshot_data["solar_data"] else None,
                "lunar": json.dumps(snapshot_data["lunar_data"]) if snapshot_data["lunar_data"] else None,
                "planets": json.dumps(snapshot_data["planet_data"]) if snapshot_data["planet_data"] else None,
                "milkyway": json.dumps(snapshot_data["milkyway_data"]) if snapshot_data["milkyway_data"] else None,
                "weather": json.dumps(snapshot_data["weather_data"]) if snapshot_data["weather_data"] else None,
                "engine_ver": snapshot_data["engine_version"],
                "eph_name": snapshot_data["ephemeris_name"],
            },
        )
        session.commit()
        session.close()
        logger.info("Persisted daily sky snapshot for location %s on %s", location_id, date_str)
    except Exception as e:
        logger.error("Failed to persist sky snapshot: %s", e)


# ─── Job: Ephemeris Health Check ──────────────────────────────────────────────

def job_ephemeris_health_check():
    """Check ephemeris data integrity and API responsiveness."""
    logger.info("Running ephemeris health check...")
    issues = []

    # 1. Check ephemeris directory
    ephemeris_dir = os.environ.get("SKY_EPHEMERIS_DATA_DIR", "/app/data/ephemeris")
    if os.path.isdir(ephemeris_dir):
        files = os.listdir(ephemeris_dir)
        logger.info("Ephemeris directory contains %d files", len(files))
        if len(files) == 0:
            issues.append("Ephemeris directory is empty")
    else:
        issues.append(f"Ephemeris directory not found: {ephemeris_dir}")
        logger.warning("Ephemeris directory not found: %s", ephemeris_dir)

    # 2. Check API health endpoint
    try:
        resp = requests.get(f"{API_BASE_URL}/health/live", timeout=10)
        if resp.status_code == 200:
            health = resp.json()
            ep_status = health.get("data", {}).get("ephemeris", "unknown")
            logger.info("API health: ephemeris=%s", ep_status)
            if ep_status != "available":
                issues.append(f"Ephemeris status from API: {ep_status}")
        else:
            issues.append(f"API health check returned {resp.status_code}")
    except Exception as e:
        issues.append(f"API health check failed: {e}")

    # 3. Check DB connectivity
    try:
        session = SessionLocal()
        session.execute(text("SELECT 1"))
        session.close()
    except Exception as e:
        issues.append(f"Database check failed: {e}")

    if issues:
        logger.warning("Ephemeris health check found %d issues: %s", len(issues), "; ".join(issues))
    else:
        logger.info("Ephemeris health check passed")


# ─── Job: ISS TLE Refresh ────────────────────────────────────────────────────

def job_iss_tle_refresh():
    """Refresh ISS TLE data by calling the API ISS endpoint to trigger a fresh fetch."""
    logger.info("Running ISS TLE refresh job...")
    run_id = None
    try:
        run_id = _create_calculation_run("iss_tle_refresh", "running")

        # Call the ISS endpoint on the API; this triggers _fetch_iss_tle() internally
        # which fetches from CelesTrak and updates the in-process cache.
        resp = requests.get(
            f"{API_BASE_URL}/api/v1/sky/iss",
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"API ISS endpoint returned {resp.status_code}: {resp.text[:200]}")

        iss_data = resp.json().get("data", {})
        logger.info(
            "ISS TLE refresh successful - altitude: %s°, above horizon: %s",
            iss_data.get("current_position", {}).get("altitude_deg"),
            iss_data.get("current_position", {}).get("is_above_horizon"),
        )

        _complete_calculation_run(run_id, "completed")
        logger.info("ISS TLE refresh job completed")
    except Exception as e:
        logger.error("ISS TLE refresh job failed: %s", e)
        if run_id is not None:
            _complete_calculation_run(run_id, "failed", error=str(e))


# ─── Calculation Run Tracking Helpers ─────────────────────────────────────────

def _create_calculation_run(job_type: str, status: str) -> int | None:
    """Insert a CalculationRun row and return its ID."""
    try:
        session = SessionLocal()
        result = session.execute(
            text("""
                INSERT INTO calculation_runs (job_type, status, started_at)
                VALUES (:job_type, :status, NOW())
                RETURNING id
            """),
            params={"job_type": job_type, "status": status},
        )
        run_id = result.scalar()
        session.commit()
        session.close()
        logger.info("Created calculation run %s for job %s", run_id, job_type)
        return run_id
    except Exception as e:
        logger.error("Failed to create calculation run: %s", e)
        return None


def _complete_calculation_run(run_id: int, status: str, error: str = None):
    """Update a CalculationRun row with completion status and duration."""
    try:
        session = SessionLocal()
        params = {"run_id": run_id, "status": status, "completed_at": datetime.now(timezone.utc)}
        if error:
            params["error_message"] = error

        # Get started_at to compute duration
        started = session.execute(
            text("SELECT started_at FROM calculation_runs WHERE id = :run_id"),
            {"run_id": run_id},
        ).fetchone()

        if started and started[0]:
            duration = (datetime.now(timezone.utc) - started[0]).total_seconds()
            params["duration_seconds"] = round(duration, 2)

        session.execute(
            text("""
                UPDATE calculation_runs
                SET status = :status, completed_at = :completed_at
                """ + (", error_message = :error_message" if error else "") + """
                """ + (", duration_seconds = :duration_seconds" if started and started[0] else "") + """
                WHERE id = :run_id
            """),
            params,
        )
        session.commit()
        session.close()
        logger.info("Calculation run %s completed with status %s", run_id, status)
    except Exception as e:
        logger.error("Failed to update calculation run %s: %s", run_id, e)


# ─── Scheduler ────────────────────────────────────────────────────────────────

def main():
    """Main worker loop with APScheduler."""
    logger.info("Skytoday worker starting with APScheduler")

    # Initialize OpenTelemetry
    _setup_otel()

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

    # Run a quick initial health check on startup
    logger.info("Running initial health check on startup...")
    job_ephemeris_health_check()

    logger.info("Scheduler configured with %d jobs", len(scheduler.get_jobs()))

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Worker shutting down")


if __name__ == "__main__":
    main()
