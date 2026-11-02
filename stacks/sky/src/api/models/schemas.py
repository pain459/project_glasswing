"""
Pydantic schemas for the Skytoday API.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# ─── Common schemas ─────────────────────────────────────────────────────────

class LocationInfo(BaseModel):
    name: str
    latitude: float
    longitude: float
    timezone: str = "UTC"


class CalculationMetadata(BaseModel):
    date: str
    location: LocationInfo
    engine: str = "skyfield"
    engine_version: Optional[str] = None
    ephemeris: Optional[str] = None
    calculated_at: Optional[str] = None
    precision: Optional[str] = None
    source_status: str = "available"


class ApiResponse(BaseModel):
    """Standard API response wrapper."""
    data: Any
    metadata: Optional[CalculationMetadata] = None
    status: str = "ok"


# ─── Health ─────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    service: str
    ready: bool = False


# ─── System status ──────────────────────────────────────────────────────────

class SystemStatusResponse(BaseModel):
    engine: str
    engine_version: Optional[str]
    ephemeris: Optional[str]
    ephemeris_coverage: Optional[dict] = None
    status: str = "healthy"
    uptime_seconds: Optional[float] = None


# ─── Solar ──────────────────────────────────────────────────────────────────

class SolarResponse(BaseModel):
    sunrise: Optional[str]
    sunset: Optional[str]
    solar_noon: Optional[str]
    daylight_hours: Optional[float]
    civil_twilight_morning_end: Optional[str]
    civil_twilight_evening_start: Optional[str]
    nautical_twilight_morning_end: Optional[str]
    nautical_twilight_evening_start: Optional[str]
    astronomical_twilight_morning_end: Optional[str]
    astronomical_twilight_evening_start: Optional[str]
    polar_day: bool = False
    polar_night: bool = False


# ─── Lunar ──────────────────────────────────────────────────────────────────

class LunarResponse(BaseModel):
    moonrise: Optional[str]
    moonset: Optional[str]
    phase_name: str
    phase_fraction: float
    illuminated_fraction: float
    illumination_percent: float


# ─── Planets ────────────────────────────────────────────────────────────────

class PlanetPosition(BaseModel):
    name: str
    ra_hours: Optional[float]
    dec_deg: Optional[float]
    altitude_deg: float
    azimuth_deg: float
    distance_au: Optional[float]
    is_above_horizon: bool


class PlanetsResponse(BaseModel):
    planets: list[PlanetPosition]
    visible_planets: list[PlanetPosition] = []


# ─── Daily sky ──────────────────────────────────────────────────────────────

class DailySkyResponse(BaseModel):
    date: str
    location: LocationInfo
    solar: dict
    lunar: dict
    planets: list
    visible_planets: list


# ─── Location management ────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str
    latitude_deg: float = Field(..., ge=-90, le=90)
    longitude_deg: float = Field(..., ge=-180, le=180)
    elevation_m: float = 0.0
    timezone: str = "UTC"


class LocationResponse(BaseModel):
    id: int
    name: str
    latitude_deg: float
    longitude_deg: float
    elevation_m: float
    timezone: str
