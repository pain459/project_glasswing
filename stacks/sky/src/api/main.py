"""
Skytoday API — FastAPI application for the Pathfinder Sky platform.

Provides REST endpoints for astronomical calculations, observations,
events, and system status.
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.models.schemas import (
    ApiResponse, HealthResponse, SystemStatusResponse,
    SolarResponse, LunarResponse, PlanetsResponse,
    DailySkyResponse, LocationCreate, LocationResponse,
)
from api.services.sky_service import SkyService
from api.services.location_service import LocationService
from core.coordinates import ObserverLocation

logger = logging.getLogger(__name__)

# ─── Database ───────────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://sky:sky@glasswing-sky-postgres:5432/sky",
)

db_engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)

# Global services (initialized on startup)
sky_service: SkyService = None
location_service: LocationService = None


def get_default_location() -> ObserverLocation:
    """Default location: Hyderabad, India."""
    return ObserverLocation(
        name="Hyderabad",
        latitude_deg=17.3850,
        longitude_deg=78.4867,
        elevation_m=542.0,
        timezone="Asia/Kolkata",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: initialize services on startup."""
    global sky_service, location_service

    logger.info("Initializing Skytoday API...")

    # ── Database ─────────────────────────────────────────────────────
    from api.models.database import Base  # noqa: F811

    try:
        Base.metadata.create_all(bind=db_engine)
        logger.info("Database tables ensured via metadata.create_all")
    except Exception as exc:
        logger.warning("Could not create tables at startup: %s", exc)

    db_session = SessionLocal()

    # Initialize the sky service (loads ephemeris, creates time system)
    sky_service = SkyService(ephemeris_data_dir="/app/data/ephemeris")
    sky_service.initialize()

    # Initialize location service with DB session
    location_service = LocationService(db=db_session)
    # Seed default location
    default_loc = get_default_location()
    location_service.ensure_default_location(default_loc)

    logger.info("Skytoday API initialized successfully")
    yield

    logger.info("Shutting down Skytoday API")


app = FastAPI(
    title="Skytoday API",
    description="Pathfinder Sky — Personal Astronomy Intelligence Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # LAN-only deployment; tighten if needed
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health endpoints ───────────────────────────────────────────────────────

@app.get("/health/live")
async def health_live() -> HealthResponse:
    """Liveness probe — always returns 200 if the process is running."""
    return HealthResponse(status="ok", service="glasswing-sky-api")


@app.get("/health/ready")
async def health_ready() -> HealthResponse:
    """Readiness probe — checks that the ephemeris is loaded."""
    if sky_service is None or not sky_service.is_ready:
        raise HTTPException(status_code=503, detail="Ephemeris not loaded")
    return HealthResponse(status="ok", service="glasswing-sky-api", ready=True)


# ─── System status ──────────────────────────────────────────────────────────

@app.get("/api/v1/system/status")
async def system_status() -> SystemStatusResponse:
    """Return system status including ephemeris and engine info."""
    if sky_service:
        return sky_service.get_system_status()
    return SystemStatusResponse(
        engine="skyfield",
        engine_version=None,
        ephemeris=None,
        status="initializing",
    )


@app.get("/api/v1/sources/status")
async def sources_status():
    """Return data source availability status."""
    return ApiResponse(
        data={
            "ephemeris": "available" if sky_service and sky_service.is_ready else "unavailable",
            "weather": "unavailable",  # Not yet implemented
            "satellites": "unavailable",  # Not yet implemented
            "catalogues": "available",
        },
        metadata={"checked_at": datetime.now(timezone.utc).isoformat()},
    )


# ─── Locations ──────────────────────────────────────────────────────────────

@app.get("/api/v1/locations")
async def list_locations():
    """List all saved observing locations."""
    locations = location_service.list_locations()
    return ApiResponse(data={"locations": locations})


@app.post("/api/v1/locations")
async def create_location(loc: LocationCreate):
    """Create a new observing location."""
    saved = location_service.create_location(loc)
    return ApiResponse(data={"location": saved}, status="created")


@app.get("/api/v1/locations/{location_id}")
async def get_location(location_id: int):
    """Get a specific observing location."""
    loc = location_service.get_location(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return ApiResponse(data={"location": loc})


# ─── Solar data ─────────────────────────────────────────────────────────────

@app.get("/api/v1/sun")
async def get_sun_data(
    date: str = Query("today", description="Date in YYYY-MM-DD format or 'today'"),
    location_id: int = Query(None, description="Location ID"),
    latitude: float = Query(None, description="Override latitude"),
    longitude: float = Query(None, description="Override longitude"),
    timezone: str = Query(None, description="Override timezone (IANA)"),
):
    """Get solar data for a given date and location."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    target_date = _resolve_date(date)

    solar_data = sky_service.get_solar_data(target_date, loc)
    return ApiResponse(
        data=solar_data,
        metadata=_calc_metadata(target_date, loc),
    )


# ─── Lunar data ─────────────────────────────────────────────────────────────

@app.get("/api/v1/moon")
async def get_moon_data(
    date: str = Query("today", description="Date in YYYY-MM-DD format or 'today'"),
    location_id: int = Query(None, description="Location ID"),
    latitude: float = Query(None, description="Override latitude"),
    longitude: float = Query(None, description="Override longitude"),
    timezone: str = Query(None, description="Override timezone (IANA)"),
):
    """Get lunar data for a given date and location."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    target_date = _resolve_date(date)

    lunar_data = sky_service.get_lunar_data(target_date, loc)
    return ApiResponse(
        data=lunar_data,
        metadata=_calc_metadata(target_date, loc),
    )


# ─── Planets ────────────────────────────────────────────────────────────────

@app.get("/api/v1/planets")
async def get_planets(
    date: str = Query("today"),
    location_id: int = Query(None),
    latitude: float = Query(None),
    longitude: float = Query(None),
    timezone: str = Query(None),
):
    """Get all planet positions for a given date and location."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    target_date = _resolve_date(date)

    planets = sky_service.get_planet_data(target_date, loc)
    return ApiResponse(
        data={"planets": planets},
        metadata=_calc_metadata(target_date, loc),
    )


@app.get("/api/v1/planets/{planet}")
async def get_planet(
    planet: str,
    date: str = Query("today"),
    location_id: int = Query(None),
    latitude: float = Query(None),
    longitude: float = Query(None),
    timezone: str = Query(None),
):
    """Get a specific planet's data."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    target_date = _resolve_date(date)

    planet_data = sky_service.get_single_planet(target_date, loc, planet)
    if not planet_data:
        raise HTTPException(status_code=404, detail=f"Planet '{planet}' not found")
    return ApiResponse(data=planet_data)


# ─── Daily sky overview ─────────────────────────────────────────────────────

@app.get("/api/v1/sky/daily")
async def get_daily_sky(
    date: str = Query("today"),
    location_id: int = Query(None),
    latitude: float = Query(None),
    longitude: float = Query(None),
    timezone: str = Query(None),
):
    """Get a comprehensive daily sky briefing."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    target_date = _resolve_date(date)

    daily = sky_service.get_daily_sky(target_date, loc)
    return ApiResponse(
        data=daily,
        metadata=_calc_metadata(target_date, loc),
    )


# ─── Altitude arcs ──────────────────────────────────────────────────────────

@app.get("/api/v1/sky/arc")
async def get_altitude_arcs(
    date: str = Query("today"),
    location_id: int = Query(None),
    latitude: float = Query(None),
    longitude: float = Query(None),
    timezone: str = Query(None),
):
    """Get hourly altitude arcs for sun and moon across the day."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    target_date = _resolve_date(date)

    arcs = sky_service.get_altitude_arcs(target_date, loc)
    return ApiResponse(
        data=arcs,
        metadata=_calc_metadata(target_date, loc),
    )


# ─── Upcoming astronomical events ───────────────────────────────────────────

@app.get("/api/v1/sky/events/upcoming")
async def get_upcoming_events(
    days: int = Query(28, ge=1, le=60),
):
    """Get upcoming astronomical events for the next *days* days."""
    events = sky_service.get_upcoming_events(days)
    return ApiResponse(
        data={"events": events, "days": days},
        metadata=None,
    )


# ─── ISS Visibility ─────────────────────────────────────────────────────────

@app.get("/api/v1/sky/iss")
async def get_iss_visibility(
    location_id: int = Query(None),
    latitude: float = Query(None),
    longitude: float = Query(None),
    timezone: str = Query(None),
):
    """Get current ISS position and upcoming visible passes."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    iss_data = sky_service.get_iss_data(loc)
    return ApiResponse(
        data=iss_data,
        metadata=None,
    )


# ─── Planet Visibility Tonight ──────────────────────────────────────────────

@app.get("/api/v1/sky/planets/tonight")
async def get_planet_tonight(
    date: str = Query("today"),
    location_id: int = Query(None),
    latitude: float = Query(None),
    longitude: float = Query(None),
    timezone: str = Query(None),
):
    """Get planet visibility commentary for tonight."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    target_date = _resolve_date(date)
    planet_data = sky_service.get_planet_tonight(target_date, loc)
    return ApiResponse(
        data=planet_data,
        metadata=_calc_metadata(target_date, loc),
    )


# ─── Season Calendar (Equinoxes & Solstices) ────────────────────────────────

@app.get("/api/v1/sky/calendar/seasons")
async def get_season_calendar(
    year: int = Query(None, ge=2026, le=2027),
):
    """Get equinox/solstice calendar for 2026-2027."""
    events = sky_service.get_season_calendar(year)
    return ApiResponse(
        data={"events": events, "year": year},
        metadata=None,
    )


# ─── Sky Stories (for kids) ────────────────────────────────────────────────

@app.get("/api/v1/sky/story")
async def get_sky_story(
    date: str = Query("today"),
    location_id: int = Query(None),
    latitude: float = Query(None),
    longitude: float = Query(None),
    timezone: str = Query(None),
):
    """Get a kid-friendly sky story for the given date."""
    loc = _resolve_location(location_id, latitude, longitude, timezone)
    target_date = _resolve_date(date)
    story = sky_service.get_sky_story(target_date, loc)
    return ApiResponse(
        data=story,
        metadata=_calc_metadata(target_date, loc),
    )


@app.get("/api/v1/sky/conjunctions")
async def get_planetary_conjunctions(
    days: int = Query(30, ge=1, le=365),
):
    """Get upcoming planetary conjunctions."""
    conjunctions = sky_service.get_planetary_conjunctions(days=days)
    return ApiResponse(
        data=conjunctions,
    )


@app.get("/api/v1/sky/eclipses")
async def get_upcoming_eclipses(
    days: int = Query(180, ge=1, le=730),
):
    """Get upcoming solar and lunar eclipses."""
    eclipses = sky_service.get_upcoming_eclipses(days=days)
    return ApiResponse(
        data=eclipses,
    )


@app.get("/api/v1/sky/stars")
async def get_visible_stars(
    date: str = Query("today"),
    location_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    timezone_str: Optional[str] = Query("Asia/Kolkata"),
):
    """Get bright stars currently visible."""
    target_date = _resolve_date(date)
    loc = _resolve_location(location_id, latitude, longitude, timezone_str)
    stars = sky_service.get_visible_stars(target_date, loc)
    return ApiResponse(
        data=stars,
        metadata=_calc_metadata(target_date, loc),
    )


@app.get("/api/v1/sky/messier")
async def get_visible_messier(
    date: str = Query("today"),
    location_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    timezone_str: Optional[str] = Query("Asia/Kolkata"),
):
    """Get Messier objects currently visible."""
    target_date = _resolve_date(date)
    loc = _resolve_location(location_id, latitude, longitude, timezone_str)
    messier = sky_service.get_visible_messier(target_date, loc)
    return ApiResponse(
        data=messier,
        metadata=_calc_metadata(target_date, loc),
    )


@app.get("/api/v1/sky/oppositions")
async def get_planetary_oppositions(
    days: int = Query(180, ge=1, le=730),
):
    """Get upcoming planetary oppositions."""
    oppositions = sky_service.get_oppositions(days=days)
    return ApiResponse(
        data=oppositions,
    )


@app.get("/api/v1/sky/zodiac")
async def get_zodiac_info(
    date: str = Query("today"),
    location_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    timezone_str: Optional[str] = Query("Asia/Kolkata"),
):
    """Get zodiac sign for Sun, Moon, and planets."""
    target_date = _resolve_date(date)
    loc = _resolve_location(location_id, latitude, longitude, timezone_str)
    zodiac = sky_service.get_zodiac_info(target_date, loc)
    return ApiResponse(
        data=zodiac,
        metadata=_calc_metadata(target_date, loc),
    )


@app.get("/api/v1/sky/moon/standstill")
async def get_moon_standstill(
    date: str = Query("today"),
):
    """Get moon standstill cycle info."""
    target_date = _resolve_date(date)
    standstill = sky_service.get_moon_standstill(target_date)
    return ApiResponse(
        data=standstill,
    )


# ─── Milky Way Visibility ───────────────────────────────────────────────

@app.get("/api/v1/sky/milkyway")
async def get_milkyway_visibility(
    date: str = Query("today"),
    location_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    timezone_str: Optional[str] = Query("Asia/Kolkata"),
):
    """Get Milky Way visibility rating and optimal viewing window."""
    target_date = _resolve_date(date)
    loc = _resolve_location(location_id, latitude, longitude, timezone_str)
    milkyway = sky_service.get_milkyway_visibility(target_date, loc)
    return ApiResponse(
        data=milkyway,
        metadata=_calc_metadata(target_date, loc),
    )


# ─── Observation Planning ───────────────────────────────────────────────

@app.get("/api/v1/sky/tonight")
async def get_observable_tonight(
    date: str = Query("today"),
    location_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    timezone_str: Optional[str] = Query("Asia/Kolkata"),
):
    """Get ranked list of observable targets for tonight."""
    target_date = _resolve_date(date)
    loc = _resolve_location(location_id, latitude, longitude, timezone_str)
    observable = sky_service.get_observable_tonight(target_date, loc)
    return ApiResponse(
        data=observable,
        metadata=_calc_metadata(target_date, loc),
    )


# ─── Panchang (Vedic Calendar) ─────────────────────────────────────────────

@app.get("/api/v1/sky/panchang")
async def get_panchang(
    date: str = Query("today"),
    days: int = Query(1, ge=1, le=60),
    location_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    timezone_str: Optional[str] = Query("Asia/Kolkata"),
):
    """Get Vedic Panchang for a single date or a range of dates."""
    target_date = _resolve_date(date)
    loc = _resolve_location(location_id, latitude, longitude, timezone_str)
    if days == 1:
        data = sky_service.get_panchang(target_date, loc)
    else:
        data = sky_service.get_panchang_range(target_date, days, loc)
    return ApiResponse(
        data=data,
        metadata=_calc_metadata(target_date, loc),
    )


@app.get("/api/v1/sky/panchang/enriched")
async def get_panchang_enriched(
    date: str = Query("today"),
    location_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    timezone_str: Optional[str] = Query("Asia/Kolkata"),
):
    """Get enriched Panchang data combining Skytoday computations with
    Panchangam feed data.

    Returns our computed Panchang plus any additional data from the
    Panchangam service (festivals, Ekadashi names, hora, tarabalam, etc.).
    """
    import asyncio
    import requests as req_lib

    target_date = _resolve_date(date)
    loc = _resolve_location(location_id, latitude, longitude, timezone_str)

    # Get our computed Panchang
    panchang_data = sky_service.get_panchang(target_date, loc)

    # Get solar data for additional context
    solar_data = sky_service.get_solar_data(target_date, loc)
    lunar_data = sky_service.get_lunar_data(target_date, loc)

    # Try to fetch Panchangam feed data
    panchangam_data = None
    city = _get_city_for_location(loc)
    date_str = target_date.strftime("%Y-%m-%d")

    try:
        # Run blocking requests in a thread pool to avoid blocking the event loop
        panchangam_data = await asyncio.to_thread(
            _fetch_panchangam_feed_sync, city, date_str
        )
    except Exception as e:
        logger.debug("Panchangam feed fetch failed: %s", e)

    # Merge data
    enriched = {
        "skytoday": panchang_data,
        "solar": {
            "sunrise": solar_data.get("sunrise"),
            "sunset": solar_data.get("sunset"),
            "solar_noon": solar_data.get("solar_noon"),
            "civil_twilight_begin": solar_data.get("civil_twilight_begin"),
            "civil_twilight_end": solar_data.get("civil_twilight_end"),
            "nautical_twilight_begin": solar_data.get("nautical_twilight_begin"),
            "nautical_twilight_end": solar_data.get("nautical_twilight_end"),
            "astronomical_twilight_begin": solar_data.get("astronomical_twilight_begin"),
            "astronomical_twilight_end": solar_data.get("astronomical_twilight_end"),
        },
        "lunar": {
            "moonrise": lunar_data.get("moonrise"),
            "moonset": lunar_data.get("moonset"),
            "phase_name": lunar_data.get("phase_name"),
            "illumination_percent": lunar_data.get("illumination_percent"),
        },
        "panchangam": panchangam_data,
        "panchangam_available": panchangam_data is not None,
    }

    return ApiResponse(
        data=enriched,
        metadata=_calc_metadata(target_date, loc),
    )


def _get_city_for_location(loc: ObserverLocation) -> str:
    """Map an ObserverLocation to a Panchangam feed city name."""
    city_map = {
        "Hyderabad": "Hyderabad",
        "Vijayawada": "Vijayawada",
        "Visakhapatnam": "Visakhapatnam",
        "Tirupati": "Tirupati",
        "Bengaluru": "Bengaluru",
        "Chennai": "Chennai",
        "Mumbai": "Mumbai",
        "Delhi": "Delhi",
        "Kolkata": "Kolkata",
        "Pune": "Pune",
        "Ahmedabad": "Ahmedabad",
        "Jaipur": "Jaipur",
        "Lucknow": "Lucknow",
        "Kochi": "Kochi",
        "Goa": "Goa",
    }
    # Try exact match first
    if loc.name in city_map:
        return city_map[loc.name]
    # Try partial match
    for key, val in city_map.items():
        if key.lower() in loc.name.lower() or loc.name.lower() in key.lower():
            return val
    # Default to Hyderabad for India, otherwise try latitude/longitude match
    if 15 < loc.latitude_deg < 25 and 70 < loc.longitude_deg < 90:
        return "Hyderabad"
    return "Hyderabad"  # Default


def _fetch_panchangam_feed_sync(city: str, date_str: str) -> Optional[dict]:
    """Fetch Panchangam feed data for a city and date (synchronous).

    Tries the local Panchangam container first, then the remote server.
    Returns the day's data if found, None otherwise.
    """
    import requests as req_lib

    feed_filename = f"{city}.json"
    local_url = f"http://glasswing-panchangam:80/feeds/{feed_filename}"
    remote_url = f"https://panchangam.astrochaganti.com/feeds/{feed_filename}"

    for url in [local_url, remote_url]:
        try:
            resp = req_lib.get(url, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                # Find the specific date
                if data.get("days"):
                    for day in data["days"]:
                        if day.get("date") == date_str:
                            return day
                    # If date not found, return the first day as fallback
                    if data["days"]:
                        return data["days"][0]
                return data
        except Exception:
            continue

    return None


# ─── Helper functions ───────────────────────────────────────────────────────

def _resolve_location(location_id, latitude, longitude, timezone_str):
    """Resolve location from ID or coordinates."""
    default = get_default_location()
    if location_id:
        loc = location_service.get_location(location_id)
        if loc:
            loc_copy = {k: v for k, v in loc.items() if k != "id"}
            return ObserverLocation(**loc_copy)
    if latitude is not None and longitude is not None:
        return ObserverLocation(
            name="Custom",
            latitude_deg=latitude,
            longitude_deg=longitude,
            timezone=timezone_str or "UTC",
        )
    return default


def _resolve_date(date_str: str) -> datetime:
    """Parse a date string into a datetime."""
    if date_str == "today":
        return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")


def _calc_metadata(target_date: datetime, loc: ObserverLocation) -> dict:
    """Calculate response metadata."""
    return {
        "date": target_date.strftime("%Y-%m-%d"),
        "location": {
            "name": loc.name,
            "latitude": loc.latitude_deg,
            "longitude": loc.longitude_deg,
            "timezone": loc.timezone,
        },
        "engine": "skyfield",
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "source_status": "available" if sky_service and sky_service.is_ready else "unavailable",
    }


if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=False)
