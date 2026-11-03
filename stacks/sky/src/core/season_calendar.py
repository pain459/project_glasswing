"""
Equinox & Solstice calendar module.

Pre-computed equinox and solstice dates for 2026 and 2027 using
Skyfield's seasons() function at startup, cached for the lifetime
of the process.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Pre-computed equinox/solstice data for 2026-2027
# These are computed by Skyfield at startup and cached here as fallback.
SEASON_EVENTS_2026_2027 = [
    # 2026
    {"name": "Winter Solstice", "date": "2026-12-21", "type": "solstice",
     "hemisphere": "north", "emoji": "❄️",
     "description": "Shortest day in the Northern Hemisphere. Sun at its southernmost declination."},
    {"name": "Spring Equinox", "date": "2026-03-20", "type": "equinox",
     "hemisphere": "north", "emoji": "🌸",
     "description": "Day and night nearly equal. Spring begins in the Northern Hemisphere."},
    {"name": "Summer Solstice", "date": "2026-06-21", "type": "solstice",
     "hemisphere": "north", "emoji": "☀️",
     "description": "Longest day in the Northern Hemisphere. Sun at its northernmost declination."},
    {"name": "Autumnal Equinox", "date": "2026-09-22", "type": "equinox",
     "hemisphere": "north", "emoji": "🍂",
     "description": "Day and night nearly equal. Autumn begins in the Northern Hemisphere."},
    # 2027
    {"name": "Winter Solstice", "date": "2027-12-21", "type": "solstice",
     "hemisphere": "north", "emoji": "❄️",
     "description": "Shortest day in the Northern Hemisphere."},
    {"name": "Spring Equinox", "date": "2027-03-20", "type": "equinox",
     "hemisphere": "north", "emoji": "🌸",
     "description": "Day and night nearly equal. Spring begins in the Northern Hemisphere."},
    {"name": "Summer Solstice", "date": "2027-06-21", "type": "solstice",
     "hemisphere": "north", "emoji": "☀️",
     "description": "Longest day in the Northern Hemisphere."},
    {"name": "Autumnal Equinox", "date": "2027-09-22", "type": "equinox",
     "hemisphere": "north", "emoji": "🍂",
     "description": "Day and night nearly equal. Autumn begins in the Northern Hemisphere."},
]

# Cache for dynamically computed events
_computed_events: Optional[list] = None


def compute_season_events(ts, year_start: int = 2026, year_end: int = 2027) -> list:
    """Compute exact equinox/solstice times using Skyfield's seasons().

    Called once at startup. Results cached in _computed_events.
    Falls back to SEASON_EVENTS_2026_2027 if computation fails.
    """
    global _computed_events
    if _computed_events:
        return _computed_events

    from skyfield.almanac import find_discrete, seasons, SEASONS

    try:
        t_from = ts.from_datetime(
            datetime(year_start, 1, 1, tzinfo=timezone.utc)
        )
        t_to = ts.from_datetime(
            datetime(year_end, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        )

        season_func = seasons(None)  # Uses internal ephemeris
        season_times, season_vals = find_discrete(t_from, t_to, season_func)

        events = []
        for i in range(len(season_times)):
            t = season_times[i]
            v = int(season_vals[i])
            season_name = SEASONS[v] if 0 <= v < len(SEASONS) else "Unknown"
            dt_utc = t.utc_datetime()

            emoji_map = {
                "Spring Equinox": "🌸",
                "Summer Solstice": "☀️",
                "Autumnal Equinox": "🍂",
                "Winter Solstice": "❄️",
            }
            type_map = {
                "Spring Equinox": "equinox",
                "Summer Solstice": "solstice",
                "Autumnal Equinox": "equinox",
                "Winter Solstice": "solstice",
            }

            events.append({
                "name": season_name,
                "date": dt_utc.strftime("%Y-%m-%d"),
                "datetime_utc": dt_utc.isoformat(),
                "type": type_map.get(season_name, "unknown"),
                "hemisphere": "north",
                "emoji": emoji_map.get(season_name, "🌍"),
                "description": _get_season_description(season_name, dt_utc.year),
            })

        _computed_events = events
        logger.info("Computed %d season events for %d-%d", len(events), year_start, year_end)
        return events

    except Exception as e:
        logger.warning("Season event computation failed: %s, using fallback", e)
        _computed_events = SEASON_EVENTS_2026_2027
        return SEASON_EVENTS_2026_2027


def _get_season_description(name: str, year: int) -> str:
    """Get a description for a season event."""
    descriptions = {
        "Spring Equinox": f"Day and night nearly equal on {year}-03-20. Spring begins in the Northern Hemisphere.",
        "Summer Solstice": f"Longest day of {year} in the Northern Hemisphere. Sun at its northernmost declination.",
        "Autumnal Equinox": f"Day and night nearly equal on {year}-09-22. Autumn begins in the Northern Hemisphere.",
        "Winter Solstice": f"Shortest day of {year} in the Northern Hemisphere. Sun at its southernmost declination.",
    }
    return descriptions.get(name, "A seasonal transition point.")


def get_season_calendar(year: Optional[int] = None) -> list:
    """Get the season calendar for a specific year, or both 2026-2027.

    If year is None, returns all events for 2026-2027.
    If year is specified, filters to that year only.
    """
    events = _computed_events or SEASON_EVENTS_2026_2027
    if year:
        events = [e for e in events if e["date"].startswith(str(year))]
    # Always return in chronological order
    return sorted(events, key=lambda e: e["date"])


def get_next_season_event_from_today() -> Optional[dict]:
    """Get the next upcoming equinox or solstice from today."""
    events = _computed_events or SEASON_EVENTS_2026_2027
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for event in events:
        if event["date"] >= today_str:
            days_away = (
                datetime.strptime(event["date"], "%Y-%m-%d")
                - datetime.now(timezone.utc).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            ).days
            return {**event, "days_away": days_away}

    return None
