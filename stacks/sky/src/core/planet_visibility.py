"""
Planet visibility commentary module.

For each planet on a given date, determines:
- Rise/set times
- Visibility window (before sunrise, after sunset, all night, etc.)
- Viewing quality comment (hard to see, good, excellent, etc.)
- Whether binoculars/telescope are needed
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Planet visibility metadata
PLANET_VISIBILITY = {
    "mercury": {
        "symbol": "☿",
        "needs_optics": False,
        "comment_base": "Very close to Sun, hard or impossible to see.",
        "good_comment": "Brief window near horizon. Look low in the sky.",
    },
    "venus": {
        "symbol": "♀",
        "needs_optics": False,
        "comment_base": "Brightest planet. Easy to spot.",
        "good_comment": "Brilliant in the sky. No equipment needed.",
    },
    "mars": {
        "symbol": "♂",
        "needs_optics": False,
        "comment_base": "Visible to naked eye. Reddish glow.",
        "good_comment": "Clear view. Use binoculars for surface detail.",
    },
    "jupiter": {
        "symbol": "♃",
        "needs_optics": False,
        "comment_base": "Bright and easy to find.",
        "good_comment": "Outstanding view. Binoculars reveal 4 moons.",
    },
    "saturn": {
        "symbol": "♄",
        "needs_optics": False,
        "comment_base": "Visible to naked eye. Steady golden light.",
        "good_comment": "Beautiful through binoculars. Rings visible in telescope.",
    },
    "uranus": {
        "symbol": "⛢",
        "needs_optics": True,
        "comment_base": "Too faint for naked eye. Bring binoculars.",
        "good_comment": "Binoculars needed. Faint blue-green disk.",
    },
    "neptune": {
        "symbol": "♆",
        "needs_optics": True,
        "comment_base": "Requires binoculars or telescope.",
        "good_comment": "Telescope recommended. Faint blue point of light.",
    },
}


def classify_planet_visibility(
    planet_name: str,
    rise_time: Optional[str],
    set_time: Optional[str],
    sunrise_time: Optional[str],
    sunset_time: Optional[str],
    altitude_at_night: float,
) -> dict:
    """Classify a planet's visibility for a given night.

    Returns a dict with:
    - viewing_window: human-readable description
    - quality: excellent / good / moderate / poor / not_visible
    - comment: what the observer should expect
    - needs_optics: whether binoculars/telescope recommended
    - date_label: which date the visibility applies to
    """
    info = PLANET_VISIBILITY.get(planet_name.lower(), {})
    needs_optics = info.get("needs_optics", False)

    # Parse times
    rise_dt = _parse_iso(rise_time)
    set_dt = _parse_iso(set_time)
    sunrise_dt = _parse_iso(sunrise_time)
    sunset_dt = _parse_iso(sunset_time)

    # Determine visibility window relative to sunset/sunrise
    window = _compute_viewing_window(rise_dt, set_dt, sunset_dt, sunrise_dt)

    # Quality based on altitude and window
    quality = _assess_quality(altitude_at_night, window, planet_name.lower())

    # Build comment
    comment = _build_comment(planet_name.lower(), window, quality, needs_optics)

    return {
        "viewing_window": window,
        "quality": quality,
        "comment": comment,
        "needs_optics": needs_optics,
        "symbol": info.get("symbol", "●"),
    }


def _parse_iso(iso_str: Optional[str]) -> Optional[datetime]:
    """Parse an ISO datetime string."""
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(iso_str)
    except (ValueError, TypeError):
        return None


def _compute_viewing_window(
    rise_dt: Optional[datetime],
    set_dt: Optional[datetime],
    sunset_dt: Optional[datetime],
    sunrise_dt: Optional[datetime],
) -> str:
    """Determine the viewing window description."""
    if not rise_dt and not set_dt:
        return "Not rising or setting (circumpolar or below horizon all day)"

    has_rise = rise_dt is not None
    has_set = set_dt is not None
    has_sunset = sunset_dt is not None
    has_sunrise = sunrise_dt is not None

    # If planet rises after sunset and sets before sunrise → best visibility
    if has_rise and has_set and has_sunset and has_sunrise:
        rises_after_sunset = rise_dt > sunset_dt
        sets_before_sunrise = set_dt < sunrise_dt

        if rises_after_sunset and sets_before_sunrise:
            return "After sunset and before sunrise. Best viewing."
        if rises_after_sunset:
            return "After sunset and most of the night."
        if sets_before_sunrise:
            return "Most of the night until sunrise."

    # If always above horizon
    if not has_rise and not has_set:
        return "Above horizon all day (may be washed out by Sun)"

    # General rise/set description
    if has_rise and has_set:
        return "Rises and sets during the night."

    return "Partial visibility."


def _assess_quality(
    altitude_at_night: float,
    window: str,
    planet_name: str,
) -> str:
    """Assess viewing quality based on altitude and window."""
    if altitude_at_night < 0:
        return "not_visible"

    # Inner planets are always harder
    if planet_name in ("mercury",):
        if altitude_at_night < 10:
            return "poor"
        return "moderate"

    # Outer faint planets need altitude
    if planet_name in ("uranus", "neptune"):
        if altitude_at_night > 45:
            return "good"
        if altitude_at_night > 20:
            return "moderate"
        return "poor"

    # Bright planets
    if altitude_at_night > 60:
        return "excellent"
    if altitude_at_night > 30:
        return "good"
    if altitude_at_night > 10:
        return "moderate"

    return "poor"


def _build_comment(
    planet_name: str,
    window: str,
    quality: str,
    needs_optics: bool,
) -> str:
    """Build a human-readable visibility comment."""
    info = PLANET_VISIBILITY.get(planet_name, {})

    if quality == "not_visible":
        return info.get("comment_base", "Below horizon.")

    # Start with the window description
    parts = []

    if "Best viewing" in window:
        parts.append("Viewable all night long.")
    elif "After sunset" in window:
        parts.append("View after sunset.")
    elif "until sunrise" in window:
        parts.append("View before sunrise.")
    elif "Rises and sets" in window:
        parts.append("View during the night.")
    else:
        parts.append("Limited viewing window.")

    # Add quality modifier
    if quality == "excellent":
        parts.append("High in the sky, great conditions.")
    elif quality == "good":
        parts.append("Well placed for viewing.")
    elif quality == "moderate":
        parts.append("Low on the horizon.")

    # Add optics note
    if needs_optics:
        parts.append("Use binoculars.")

    return " ".join(parts)


def get_planet_tonight_summary(
    ts,
    planetary_service,
    solar_service,
    latitude: float,
    longitude: float,
    elevation: float,
    date: datetime,
) -> list:
    """Get visibility summary for all planets for the given date.

    Returns a list of dicts, one per planet, with rise/set times,
    viewing window, quality, and commentary.
    """
    from core.planetary import PLANET_NAMES

    local_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
    night_dt = date.replace(hour=21, minute=0, second=0, microsecond=0)

    # Get sunrise/sunset for context
    sunrise_time = None
    sunset_time = None
    try:
        solar_data = solar_service.get_full_solar_data(
            ts, latitude, longitude, local_date, elevation,
            date.replace(hour=12, minute=0, second=0, microsecond=0)
        )
        sunrise_time = solar_data.get("sunrise")
        sunset_time = solar_data.get("sunset")
    except Exception:
        pass

    results = []
    for planet in PLANET_NAMES:
        # Get position at night
        pos = planetary_service.get_planet_position(
            ts, planet, latitude, longitude, night_dt, elevation
        )
        if not pos:
            continue

        # Get rise/set times
        rise_set = planetary_service.get_planet_rise_set(
            ts, planet, latitude, longitude, local_date, elevation
        )

        # Classify visibility
        vis = classify_planet_visibility(
            planet,
            rise_set.get("rise"),
            rise_set.get("set"),
            sunrise_time,
            sunset_time,
            pos["altitude_deg"],
        )

        results.append({
            "name": pos["name"],
            "symbol": vis["symbol"],
            "rise": rise_set.get("rise"),
            "set": rise_set.get("set"),
            "altitude_deg": round(pos["altitude_deg"], 1),
            "is_above_horizon": pos["is_above_horizon"],
            "viewing_window": vis["viewing_window"],
            "quality": vis["quality"],
            "comment": vis["comment"],
            "needs_optics": vis["needs_optics"],
        })

    return results
