"""
SkyService — Orchestrates all astronomy calculations for the API.

Initializes the ephemeris, time system, and delegates to solar/lunar/planetary
services. Provides a unified interface for the API layer.

KEY DESIGN: When a date is requested, ALL calculations (phase, position,
visibility) are performed for that date at noon local time. There is no
separate "current_dt" — the requested date IS the observation time.
"""

import logging
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import skyfield.api as skyfield

from core.coordinates import ObserverLocation
from core.ephemeris import EphemerisManager
from core.solar import SolarService
from core.lunar import LunarService
from core.planetary import PlanetaryService
from core.events import EventsService
from core.satellite import create_iss_satellite, get_iss_visible_passes, get_iss_current_position
from core.planet_visibility import get_planet_tonight_summary
from core.season_calendar import compute_season_events, get_season_calendar, get_next_season_event_from_today
from core.sky_stories import generate_sky_story
from api.models.schemas import SystemStatusResponse

logger = logging.getLogger(__name__)


class SkyService:
    """Main astronomy service that coordinates all calculations."""

    def __init__(self, ephemeris_data_dir: str = "/app/data/ephemeris"):
        self.ephemeris_mgr = EphemerisManager(data_dir=ephemeris_data_dir)
        self.ts = None
        self.solar = None
        self.lunar = None
        self.planetary = None
        self.events = None
        self.iss = None
        self._start_time = None
        self._is_ready = False

    def initialize(self, kernel_name: str = "de440s"):
        """Load the ephemeris and initialize all sub-services."""
        self._start_time = time.time()
        logger.info("Initializing SkyService with kernel %s", kernel_name)

        # Load ephemeris
        kernel_path = self.ephemeris_mgr.ensure_kernel(kernel_name)
        self.ts = skyfield.load.timescale()

        # Load the kernel into the ephemeris manager
        self.ephemeris_mgr.load_kernel(kernel_path)

        # Initialize sub-services
        self.solar = SolarService(self.ephemeris_mgr.loaded_kernel)
        self.lunar = LunarService(self.ephemeris_mgr.loaded_kernel)
        self.planetary = PlanetaryService(self.ephemeris_mgr.loaded_kernel)
        self.events = EventsService(self.ephemeris_mgr.loaded_kernel)

        # Initialize ISS satellite tracking
        try:
            self.iss = create_iss_satellite(self.ts)
            logger.info("ISS satellite tracking initialized")
        except Exception as e:
            logger.warning("ISS satellite tracking failed: %s", e)
            self.iss = None

        self._is_ready = True
        logger.info("SkyService initialized successfully")

    @property
    def is_ready(self) -> bool:
        return self._is_ready

    def get_system_status(self) -> SystemStatusResponse:
        """Return system status for the /system/status endpoint."""
        import skyfield
        return SystemStatusResponse(
            engine="skyfield",
            engine_version=getattr(skyfield, "__version__", "unknown"),
            ephemeris=self.ephemeris_mgr.kernel_info["name"] if self.ephemeris_mgr.kernel_info else None,
            ephemeris_coverage={
                "start": self.ephemeris_mgr.kernel_info["coverage_start"],
                "end": self.ephemeris_mgr.kernel_info["coverage_end"],
            } if self.ephemeris_mgr.kernel_info else None,
            status="healthy" if self._is_ready else "initializing",
            uptime_seconds=round(time.time() - self._start_time, 1) if self._start_time else None,
        )

    def _get_local_date(self, utc_date: datetime, tz) -> datetime:
        """Convert a UTC date to the local timezone date at midnight."""
        return utc_date.astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)

    def _get_observation_time(self, utc_date: datetime, tz) -> datetime:
        """Get the observation datetime for a requested date (noon local time).

        This is the single source of truth for "when are we observing the sky?"
        All phase, position, and visibility calculations use this time.
        """
        local = utc_date.astimezone(tz)
        return local.replace(hour=12, minute=0, second=0, microsecond=0)

    def get_solar_data(self, date: datetime, location: ObserverLocation) -> dict:
        """Get all solar data for a date and location."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)
        obs_dt = self._get_observation_time(date, location.tz)

        return self.solar.get_full_solar_data(
            self.ts, location.latitude_deg, location.longitude_deg,
            local_date, location.elevation_m, obs_dt
        )

    def get_lunar_data(self, date: datetime, location: ObserverLocation) -> dict:
        """Get all lunar data for a date and location."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)
        obs_dt = self._get_observation_time(date, location.tz)

        lunar = self.lunar.get_full_lunar_data(
            self.ts, location.latitude_deg, location.longitude_deg,
            local_date, location.elevation_m, obs_dt
        )

        # Add upcoming moon phases for this date
        lunar["upcoming_phases"] = self.lunar.get_upcoming_phases(
            self.ts, local_date, count=4
        )

        # Add upcoming moon nodes
        lunar["upcoming_nodes"] = self.lunar.get_moon_nodes_info(
            self.ts, local_date, count=2
        )

        return lunar

    def get_planet_data(self, date: datetime, location: ObserverLocation) -> dict:
        """Get all planet data for a date and location."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)
        obs_dt = self._get_observation_time(date, location.tz)

        # Get planets with rise/set and culmination events
        all_planets = self.planetary.get_all_planets_with_events(
            self.ts, location.latitude_deg, location.longitude_deg,
            local_date, location.elevation_m
        )
        visible = self.planetary.get_visible_planets(
            self.ts, location.latitude_deg, location.longitude_deg,
            obs_dt, location.elevation_m
        )

        return {
            "all": all_planets,
            "visible": visible,
        }

    def get_single_planet(self, date: datetime, location: ObserverLocation, planet_name: str) -> Optional[dict]:
        """Get data for a single planet."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        obs_dt = self._get_observation_time(date, location.tz)
        return self.planetary.get_planet_position(
            self.ts, planet_name, location.latitude_deg, location.longitude_deg,
            obs_dt, location.elevation_m
        )

    def get_sky_events(self, date: datetime, location: ObserverLocation) -> dict:
        """Get sky events for a date and location."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)
        return self.events.get_sky_events(
            self.ts,
            local_date,
            location.latitude_deg,
            location.longitude_deg,
            location.elevation_m,
        )

    def get_daily_sky(self, date: datetime, location: ObserverLocation) -> dict:
        """Get a comprehensive daily sky briefing."""
        solar = self.get_solar_data(date, location)
        lunar = self.get_lunar_data(date, location)
        planets = self.get_planet_data(date, location)
        sky_events = self.get_sky_events(date, location)

        return {
            "date": date.strftime("%Y-%m-%d"),
            "location": {
                "name": location.name,
                "latitude": location.latitude_deg,
                "longitude": location.longitude_deg,
                "timezone": location.timezone,
            },
            "solar": solar,
            "lunar": lunar,
            "planets": planets["all"],
            "visible_planets": planets["visible"],
            "sky_events": sky_events,
        }

    def get_altitude_arcs(self, date: datetime, location: ObserverLocation) -> dict:
        """Get hourly altitude arcs for sun and moon across the day."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)

        solar_arc = self.solar.get_altitude_arc(
            self.ts, location.latitude_deg, location.longitude_deg,
            local_date, location.elevation_m
        )
        lunar_arc = self.lunar.get_altitude_arc(
            self.ts, location.latitude_deg, location.longitude_deg,
            local_date, location.elevation_m
        )

        return {
            "solar": solar_arc,
            "lunar": lunar_arc,
        }

    def get_upcoming_events(self, days: int = 28) -> list:
        """Get upcoming astronomical events for the next *days* days."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        loc = ObserverLocation(
            name="Hyderabad",
            latitude_deg=17.3850,
            longitude_deg=78.4867,
            elevation_m=542.0,
            timezone="Asia/Kolkata",
        )
        from_date = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        return self.events.get_upcoming_events(
            self.ts, from_date,
            loc.latitude_deg, loc.longitude_deg,
            loc.elevation_m, days
        )

    def get_iss_data(self, location: Optional[ObserverLocation] = None) -> dict:
        """Get current ISS position and upcoming visible passes."""
        if not self._is_ready or self.iss is None:
            return {"status": "unavailable", "passes": [], "current_position": None}

        if location is None:
            location = ObserverLocation(
                name="Hyderabad",
                latitude_deg=17.3850,
                longitude_deg=78.4867,
                elevation_m=542.0,
                timezone="Asia/Kolkata",
            )

        current = get_iss_current_position(
            self.ts, self.iss,
            location.latitude_deg, location.longitude_deg,
            location.elevation_m,
        )
        passes = get_iss_visible_passes(
            self.ts, self.iss,
            location.latitude_deg, location.longitude_deg,
            location.elevation_m,
            hours=48,
        )

        return {
            "status": "available",
            "current_position": current,
            "passes": passes[:10],  # Top 10 passes by elevation
            "total_passes": len(passes),
        }

    def get_planet_tonight(self, date: datetime, location: ObserverLocation) -> dict:
        """Get planet visibility commentary for tonight."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)

        planets = get_planet_tonight_summary(
            self.ts,
            self.planetary,
            self.solar,
            location.latitude_deg,
            location.longitude_deg,
            location.elevation_m,
            local_date,
        )

        return {
            "date": local_date.strftime("%Y-%m-%d"),
            "location": location.name,
            "planets": planets,
        }

    def get_season_calendar(self, year: Optional[int] = None) -> list:
        """Get equinox/solstice calendar."""
        return get_season_calendar(year)

    def get_sky_story(self, date: datetime, location: ObserverLocation) -> dict:
        """Generate a kid-friendly sky story for the given date."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)
        obs_dt = self._get_observation_time(date, location.tz)

        # Get lunar data for moon phase
        lunar = self.lunar.get_full_lunar_data(
            self.ts, location.latitude_deg, location.longitude_deg,
            local_date, location.elevation_m, obs_dt
        )

        # Get visible planets
        visible_planets = self.planetary.get_visible_planets(
            self.ts, location.latitude_deg, location.longitude_deg,
            obs_dt, location.elevation_m
        )

        # Get active meteor showers
        active_showers = self.events.get_active_meteor_showers(local_date)

        # Get season
        season = self.events._get_season(local_date)

        # Get moon distance label
        moon_dist = self.events.get_moon_distance_info(self.ts, obs_dt)

        # Generate story
        story = generate_sky_story(
            date=obs_dt,
            moon_phase=lunar.get("phase_name", "New Moon"),
            moon_illumination=lunar.get("illumination_percent", 0),
            visible_planets=visible_planets,
            season=season,
            moon_distance_label=moon_dist.get("distance_label", "normal"),
            active_showers=active_showers,
            is_moon_above_horizon=lunar.get("current_position", {}).get("is_above_horizon", False),
        )

        return story
