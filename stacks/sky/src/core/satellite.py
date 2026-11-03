"""
ISS / satellite visibility module.

Fetches fresh ISS TLE data from CelesTrak and predicts visible passes
for the next 48 hours using Skyfield's EarthSatellite.

Each pass: {start_time, max_elevation_time, end_time, max_elevation_deg,
            duration_minutes, approach_azimuth, direction}
"""

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
import skyfield.api as skyfield

logger = logging.getLogger(__name__)

# ─── TLE Data Sources ────────────────────────────────────────────────────────

TLE_SOURCES = [
    "https://celestrak.org/NORAD/elements/stations.txt",
]

ISS_NORAD_ID = "25544"

# Fallback TLE (good for ~3-5 days, epoch ~Nov 2026)
FALLBACK_TLE = """ISS (ZARYA)
1 25544U 98067A   26307.50000000  .00010195  00000+0  16462-3 0  9999
2 25544  51.6420 208.5739 0005805 245.8095 114.2026 15.4975324345619
"""

# ─── Cache ───────────────────────────────────────────────────────────────────

_tle_cache: Optional[str] = None
_tle_cache_time: float = 0.0
TLE_CACHE_TTL = 3600  # 1 hour


def _fetch_iss_tle() -> str:
    """Fetch fresh ISS TLE from CelesTrak, with caching and fallback."""
    global _tle_cache, _tle_cache_time

    if _tle_cache and (time.time() - _tle_cache_time) < TLE_CACHE_TTL:
        return _tle_cache

    for url in TLE_SOURCES:
        try:
            resp = requests.get(url, timeout=15, verify=False)
            resp.raise_for_status()
            lines = resp.text.strip().split("\n")
            for i, line in enumerate(lines):
                if ISS_NORAD_ID in line and i + 2 < len(lines):
                    tle_lines = "\n".join(lines[i:i + 3])
                    _tle_cache = tle_lines
                    _tle_cache_time = time.time()
                    logger.info("Fetched ISS TLE from %s", url)
                    return tle_lines
        except Exception as e:
            logger.debug("TLE fetch from %s failed: %s", url, e)

    # Use cached TLE even if stale
    if _tle_cache:
        logger.warning("Using stale ISS TLE cache")
        return _tle_cache

    # Last resort: bundled fallback TLE
    logger.warning("Using bundled fallback ISS TLE")
    _tle_cache = FALLBACK_TLE
    _tle_cache_time = time.time()
    return FALLBACK_TLE


def create_iss_satellite(ts):
    """Create an EarthSatellite object for the ISS."""
    tle_text = _fetch_iss_tle()
    lines = tle_text.strip().split("\n")
    iss = skyfield.EarthSatellite(lines[1], lines[2], "ISS (ZARYA)", ts)
    return iss


def get_iss_visible_passes(
    ts,
    iss,
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
    hours: int = 48,
    min_elevation: float = 5.0,
    step_minutes: float = 2.0,
) -> list:
    """Predict visible ISS passes for the next *hours* hours.

    A pass is visible when ISS altitude >= min_elevation degrees.
    Returns a list of pass dicts sorted by max elevation descending.
    """
    observer = skyfield.Topos(latitude_degrees=latitude, longitude_degrees=longitude,
                              elevation_m=elevation)

    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=hours)
    step = timedelta(minutes=step_minutes)

    # Compute altitude at each time step
    altitudes = []
    current = now
    while current <= end:
        t = ts.from_datetime(current)
        geometry = observer.at(t)
        diff = iss.at(t) - geometry
        alt, az, dist = diff.altaz()
        altitudes.append((t, alt.degrees, az.degrees))
        current += step

    # Find passes where altitude >= min_elevation
    passes = []
    in_pass = False
    pass_start = None
    max_alt = 0.0
    max_alt_time = None
    approach_az = 0.0

    for t, alt, az in altitudes:
        if alt >= min_elevation and not in_pass:
            # Start of a new pass
            in_pass = True
            pass_start = t
            max_alt = alt
            max_alt_time = t
            approach_az = az
        elif alt >= min_elevation and in_pass:
            if alt > max_alt:
                max_alt = alt
                max_alt_time = t
        elif alt < min_elevation and in_pass:
            # End of pass
            in_pass = False
            pass_end = t
            duration = (pass_end.utc_datetime() - pass_start.utc_datetime()).total_seconds() / 60.0

            if duration >= 1.5:  # Minimum pass duration
                passes.append({
                    "start_time": pass_start.utc_datetime().isoformat(),
                    "max_elevation_time": max_alt_time.utc_datetime().isoformat(),
                    "end_time": pass_end.utc_datetime().isoformat(),
                    "max_elevation_deg": round(float(max_alt), 1),
                    "duration_minutes": round(float(duration), 1),
                    "approach_azimuth": round(float(approach_az), 0),
                    "direction": _azimuth_to_direction(float(approach_az)),
                })

            max_alt = 0.0
            max_alt_time = None

    # If still in a pass at the end of the window
    if in_pass and pass_start:
        duration = (end - pass_start.utc_datetime()).total_seconds() / 60.0
        if duration >= 1.5:
            passes.append({
                "start_time": pass_start.utc_datetime().isoformat(),
                "max_elevation_time": max_alt_time.utc_datetime().isoformat(),
                "end_time": end.isoformat(),
                "max_elevation_deg": round(float(max_alt), 1),
                "duration_minutes": round(float(duration), 1),
                "approach_azimuth": round(float(approach_az), 0),
                "direction": _azimuth_to_direction(float(approach_az)),
            })

    # Sort by max elevation descending (best passes first)
    passes.sort(key=lambda p: p["max_elevation_deg"], reverse=True)

    return passes


def _azimuth_to_direction(azimuth: float) -> str:
    """Convert azimuth degrees to compass direction."""
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    az = ((azimuth + 22.5) % 360) / 45.0
    return dirs[int(az)]


def get_iss_current_position(
    ts,
    iss,
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
) -> dict:
    """Get the current ISS position relative to the observer."""
    observer = skyfield.Topos(latitude_degrees=latitude, longitude_degrees=longitude,
                              elevation_m=elevation)

    now = ts.from_datetime(datetime.now(timezone.utc))
    geometry = observer.at(now)
    subpoint = iss.at(now) - geometry
    alt, az, dist = subpoint.altaz()

    is_visible = bool(alt.degrees > 0)

    return {
        "altitude_deg": round(float(alt.degrees), 1),
        "azimuth_deg": round(float(az.degrees % 360), 1),
        "distance_km": round(float(dist.km), 0),
        "is_above_horizon": is_visible,
        "direction": _azimuth_to_direction(float(az.degrees)),
    }
