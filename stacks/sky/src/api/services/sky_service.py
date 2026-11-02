"""
SkyService — Orchestrates all astronomy calculations for the API.

Initializes the ephemeris, time system, and delegates to solar/lunar/planetary
services. Provides a unified interface for the API layer.
"""

import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import skyfield.api as skyfield

from core.coordinates import ObserverLocation
from core.ephemeris import EphemerisManager
from core.solar import SolarService
from core.lunar import LunarService
from core.planetary import PlanetaryService
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
        """Convert a UTC date to the local timezone date."""
        return utc_date.astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)

    def get_solar_data(self, date: datetime, location: ObserverLocation) -> dict:
        """Get all solar data for a date and location."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)
        current_dt = datetime.now(timezone.utc)

        return self.solar.get_full_solar_data(
            self.ts, location.latitude_deg, location.longitude_deg,
            local_date, location.elevation_m, current_dt
        )

    def get_lunar_data(self, date: datetime, location: ObserverLocation) -> dict:
        """Get all lunar data for a date and location."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        local_date = self._get_local_date(date, location.tz)
        current_dt = datetime.now(timezone.utc)

        return self.lunar.get_full_lunar_data(
            self.ts, location.latitude_deg, location.longitude_deg,
            local_date, location.elevation_m, current_dt
        )

    def get_planet_data(self, date: datetime, location: ObserverLocation) -> dict:
        """Get all planet data for a date and location."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        current_dt = datetime.now(timezone.utc)
        all_planets = self.planetary.get_all_planets(
            self.ts, location.latitude_deg, location.longitude_deg,
            current_dt, location.elevation_m
        )
        visible = self.planetary.get_visible_planets(
            self.ts, location.latitude_deg, location.longitude_deg,
            current_dt, location.elevation_m
        )

        return {
            "all": all_planets,
            "visible": visible,
        }

    def get_single_planet(self, date: datetime, location: ObserverLocation, planet_name: str) -> Optional[dict]:
        """Get data for a single planet."""
        if not self._is_ready:
            raise RuntimeError("SkyService not initialized")

        current_dt = datetime.now(timezone.utc)
        return self.planetary.get_planet_position(
            self.ts, planet_name, location.latitude_deg, location.longitude_deg,
            current_dt, location.elevation_m
        )

    def get_daily_sky(self, date: datetime, location: ObserverLocation) -> dict:
        """Get a comprehensive daily sky briefing."""
        solar = self.get_solar_data(date, location)
        lunar = self.get_lunar_data(date, location)
        planets = self.get_planet_data(date, location)

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
        }
