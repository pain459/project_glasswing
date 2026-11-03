"""
Weather service for Pathfinder Sky.

Fetches real-time and forecast weather data from Open-Meteo (free, no API key)
and computes astronomy observing conditions from it.

Open-Meteo: https://open-meteo.com
License: CC BY 4.0 (attribution required)
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ─── Open-Meteo configuration ───────────────────────────────────────────────

OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"

# Variables relevant to astronomy observing conditions
WEATHER_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "apparent_temperature",
    "precipitation",
    "precipitation_probability",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "visibility",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "weather_code",
    "pressure_msl",
    "is_day",
]

# WMO weather interpretation codes mapped to observing relevance
# https://open-meteo.com/en/docs
WMO_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    97: "Heavy thunderstorm",
    99: "Thunderstorm with heavy hail",
}

# Codes that are bad for observing (precipitation, fog, thunderstorm)
BAD_OBSERVING_CODES = {45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
                       71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 97, 99}


# ─── HTTP client ────────────────────────────────────────────────────────────

def fetch_weather(latitude: float, longitude: float,
                  forecast_days: int = 3,
                  timezone: str = "auto") -> Optional[dict]:
    """Fetch current and forecast weather from Open-Meteo.

    Args:
        latitude: WGS84 latitude.
        longitude: WGS84 longitude.
        forecast_days: Number of forecast days (1-16).
        timezone: IANA timezone or "auto".

    Returns:
        Parsed JSON response dict, or None on failure.
    """
    params: dict = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join(WEATHER_VARIABLES),
        "hourly": ",".join(WEATHER_VARIABLES),
        "forecast_days": forecast_days,
        "timezone": timezone,
    }

    try:
        resp = requests.get(OPEN_METEO_BASE, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.warning("Open-Meteo request failed: %s", exc)
        return None


def fetch_current_weather(latitude: float, longitude: float,
                          timezone: str = "auto") -> Optional[dict]:
    """Fetch only current conditions (lightweight call).

    Returns:
        Parsed JSON response dict, or None on failure.
    """
    params: dict = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join(WEATHER_VARIABLES),
        "timezone": timezone,
    }

    try:
        resp = requests.get(OPEN_METEO_BASE, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.warning("Open-Meteo current request failed: %s", exc)
        return None


# ─── Observing conditions computation ───────────────────────────────────────

def compute_observing_conditions(raw: dict) -> dict:
    """Compute observing conditions from raw Open-Meteo current data.

    Evaluates:
    - Cloud cover percentage → sky transparency
    - Visibility in meters → atmospheric clarity
    - Humidity & dew point → mirror dew risk
    - Precipitation → active weather
    - Wind speed → mount stability
    - Weather code → overall condition

    Returns a structured dict with ratings and recommendations.
    """
    current = raw.get("current", {})
    if not current:
        return _empty_conditions()

    cloud_cover = current.get("cloud_cover", -1)
    visibility = current.get("visibility", -1)
    humidity = current.get("relative_humidity_2m", -1)
    dew_point = current.get("dew_point_2m", -1)
    temperature = current.get("temperature_2m", -1)
    precipitation = current.get("precipitation", 0)
    wind_speed = current.get("wind_speed_10m", 0)
    wind_gusts = current.get("wind_gusts_10m", 0)
    weather_code = current.get("weather_code", 0)
    pressure = current.get("pressure_msl", -1)
    is_day = current.get("is_day", -1)

    # ── Sky transparency score (0-100) ──
    transparency = _compute_transparency(cloud_cover, visibility, weather_code)

    # ── Overall observing rating ──
    rating = _compute_overall_rating(transparency, humidity, wind_speed,
                                     precipitation, weather_code)

    # ── Dew risk ──
    dew_risk = _compute_dew_risk(humidity, temperature, dew_point)

    # ── Seeing estimate (based on wind & pressure stability proxy) ──
    seeing = _estimate_seeing(wind_speed, wind_gusts, pressure)

    # ── Recommendations ──
    recommendations = _generate_recommendations(rating, transparency,
                                                 dew_risk, seeing,
                                                 precipitation, weather_code)

    return {
        "timestamp": current.get("time"),
        "is_night": is_day == 0,
        "conditions": WMO_CODES.get(weather_code, f"Code {weather_code}"),
        "weather_code": weather_code,
        "temperature_c": temperature,
        "humidity_percent": humidity,
        "dew_point_c": dew_point,
        "cloud_cover_percent": cloud_cover,
        "visibility_m": visibility,
        "precipitation_mm": precipitation,
        "wind_speed_kmh": wind_speed,
        "wind_gusts_kmh": wind_gusts,
        "pressure_hpa": pressure,
        "observing": {
            "rating": rating,
            "transparency_score": transparency,
            "seeing_estimate": seeing,
            "dew_risk": dew_risk,
            "recommendations": recommendations,
        },
    }


def compute_hourly_forecast(raw: dict, hours: int = 24) -> list:
    """Compute observing conditions for each hour in the forecast window.

    Returns a list of hourly observing condition summaries.
    """
    hourly = raw.get("hourly", {})
    if not hourly:
        return []

    times = hourly.get("time", [])
    results = []

    for i in range(min(hours, len(times))):
        hour_data = {
            "time": times[i],
            "cloud_cover_percent": hourly.get("cloud_cover", [None])[i],
            "visibility_m": hourly.get("visibility", [None])[i],
            "precipitation_mm": hourly.get("precipitation", [None])[i],
            "precipitation_probability": hourly.get("precipitation_probability", [None])[i],
            "temperature_c": hourly.get("temperature_2m", [None])[i],
            "humidity_percent": hourly.get("relative_humidity_2m", [None])[i],
            "wind_speed_kmh": hourly.get("wind_speed_10m", [None])[i],
            "weather_code": hourly.get("weather_code", [None])[i],
            "conditions": WMO_CODES.get(
                hourly.get("weather_code", [None])[i], "Unknown"
            ),
            "is_night": hourly.get("is_day", [None])[i] == 0,
        }

        # Quick observing suitability for this hour
        cloud = hour_data["cloud_cover_percent"] or 100
        precip = hour_data["precipitation_mm"] or 0
        wx_code = hour_data["weather_code"] or 3

        if cloud < 30 and precip == 0 and wx_code not in BAD_OBSERVING_CODES:
            hour_data["suitable_for_observing"] = True
        elif cloud < 60 and precip == 0:
            hour_data["suitable_for_observing"] = "partial"
        else:
            hour_data["suitable_for_observing"] = False

        results.append(hour_data)

    return results


# ─── Internal scoring functions ─────────────────────────────────────────────

def _compute_transparency(cloud_cover: float, visibility: float,
                          weather_code: int) -> float:
    """Compute sky transparency score 0-100.

    Heavily weighted on cloud cover, with visibility and weather code as
    secondary factors.
    """
    if cloud_cover < 0:
        return 50  # Unknown, assume moderate

    # Base score from cloud cover (inverted: 0% cloud = 100 score)
    score = float(max(0, 100 - cloud_cover))

    # Penalize for poor visibility
    if visibility > 0 and visibility < 1000:
        score = int(score * 0.3)  # Severe penalty
    elif visibility > 0 and visibility < 5000:
        score = int(score * 0.6)

    # Penalize for bad weather codes
    if weather_code in BAD_OBSERVING_CODES:
        score = int(score * 0.2)

    return min(100, max(0, score))


def _compute_overall_rating(transparency: int, humidity: float,
                             wind_speed: float, precipitation: float,
                             weather_code: int) -> str:
    """Return an overall observing rating string."""
    if precipitation > 0 or weather_code in BAD_OBSERVING_CODES:
        return "poor"

    if transparency >= 80 and humidity < 70 and wind_speed < 20:
        return "excellent"
    if transparency >= 60 and humidity < 80 and wind_speed < 30:
        return "good"
    if transparency >= 40:
        return "fair"

    return "poor"


def _compute_dew_risk(humidity: float, temperature: float,
                      dew_point: float) -> str:
    """Estimate dew risk for telescope mirrors."""
    if humidity < 0 or temperature < 0:
        return "unknown"

    # Dew point spread: how close ambient temp is to dew point
    if dew_point > 0 and temperature > 0:
        spread = temperature - dew_point
        if spread <= 2:
            return "high"
        if spread <= 5:
            return "moderate"
        if spread <= 10:
            return "low"
        return "minimal"

    # Fallback based on humidity alone
    if humidity >= 85:
        return "high"
    if humidity >= 70:
        return "moderate"
    if humidity >= 50:
        return "low"
    return "minimal"


def _estimate_seeing(wind_speed: float, wind_gusts: float,
                     pressure: float) -> str:
    """Rough seeing estimate based on wind and pressure."""
    if wind_speed < 0:
        return "unknown"

    # High wind = poor seeing (atmospheric turbulence)
    if wind_gusts > 50:
        return "poor"
    if wind_speed > 30:
        return "fair"
    if wind_speed > 15:
        return "good"
    return "excellent"


def _generate_recommendations(rating: str, transparency: int,
                               dew_risk: str, seeing: str,
                               precipitation: float,
                               weather_code: int) -> list:
    """Generate actionable recommendations for the observer."""
    recs = []

    if precipitation > 0 or weather_code in BAD_OBSERVING_CODES:
        recs.append("Active precipitation or adverse weather — keep equipment indoors.")
        return recs

    if transparency < 40:
        recs.append("Heavy cloud cover — observing not recommended.")
    elif transparency < 60:
        recs.append("Partial cloud cover — some observing possible during breaks.")

    if dew_risk == "high":
        recs.append("High dew risk — use heated eyepieces/mirrors or reduce exposure.")
    elif dew_risk == "moderate":
        recs.append("Moderate dew risk — monitor equipment, have dew heaters ready.")

    if seeing == "poor":
        recs.append("Poor seeing expected — avoid high-magnification targets.")
    elif seeing == "excellent":
        recs.append("Excellent seeing conditions — good for planetary/lunar detail.")

    if rating == "excellent":
        recs.insert(0, "Conditions are excellent — ideal for deep-sky and planetary observing.")

    return recs


def _empty_conditions() -> dict:
    """Return a safe default when no weather data is available."""
    return {
        "timestamp": None,
        "is_night": None,
        "conditions": "Unknown",
        "weather_code": None,
        "temperature_c": None,
        "humidity_percent": None,
        "dew_point_c": None,
        "cloud_cover_percent": None,
        "visibility_m": None,
        "precipitation_mm": None,
        "wind_speed_kmh": None,
        "wind_gusts_kmh": None,
        "pressure_hpa": None,
        "observing": {
            "rating": "unknown",
            "transparency_score": 50,
            "seeing_estimate": "unknown",
            "dew_risk": "unknown",
            "recommendations": ["Weather data unavailable — check network connectivity."],
        },
    }


# ─── Convenience wrapper ────────────────────────────────────────────────────

def get_observing_conditions(latitude: float, longitude: float,
                             timezone: str = "auto",
                             forecast_hours: int = 24) -> dict:
    """One-call wrapper: fetch weather and compute observing conditions.

    Returns a dict with:
    - current: current observing conditions
    - forecast: list of hourly forecasts
    - source: data source attribution
    """
    raw = fetch_weather(latitude, longitude, forecast_days=3, timezone=timezone)

    if raw is None:
        return {
            "current": _empty_conditions(),
            "forecast": [],
            "source": "open-meteo",
            "source_url": "https://open-meteo.com",
            "error": "Failed to fetch weather data",
        }

    return {
        "current": compute_observing_conditions(raw),
        "forecast": compute_hourly_forecast(raw, hours=forecast_hours),
        "source": "open-meteo",
        "source_url": "https://open-meteo.com",
        "attribution": "Weather data from Open-Meteo (CC BY 4.0)",
    }
