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


# ─── Weather & Observing Conditions ─────────────────────────────────────────

class ObservingConditions(BaseModel):
    """Computed observing conditions from weather data."""
    rating: str  # excellent, good, fair, poor, unknown
    transparency_score: int  # 0-100
    seeing_estimate: str  # excellent, good, fair, poor, unknown
    dew_risk: str  # high, moderate, low, minimal, unknown
    recommendations: list[str] = []


class CurrentWeather(BaseModel):
    """Current weather and observing conditions."""
    timestamp: Optional[str] = None
    is_night: Optional[bool] = None
    conditions: str = ""
    weather_code: Optional[int] = None
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    dew_point_c: Optional[float] = None
    cloud_cover_percent: Optional[float] = None
    visibility_m: Optional[float] = None
    precipitation_mm: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    wind_gusts_kmh: Optional[float] = None
    pressure_hpa: Optional[float] = None
    observing: Optional[ObservingConditions] = None


class HourlyForecast(BaseModel):
    """Single hour of weather forecast."""
    time: str
    cloud_cover_percent: Optional[float] = None
    visibility_m: Optional[float] = None
    precipitation_mm: Optional[float] = None
    precipitation_probability: Optional[float] = None
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    weather_code: Optional[int] = None
    conditions: str = ""
    is_night: Optional[bool] = None
    suitable_for_observing: Optional[bool] = None


class WeatherResponse(BaseModel):
    """Full weather and observing conditions response."""
    current: CurrentWeather
    forecast: list[HourlyForecast] = []
    source: str = "open-meteo"
    source_url: str = "https://open-meteo.com"
    attribution: str = ""
    error: Optional[str] = None
