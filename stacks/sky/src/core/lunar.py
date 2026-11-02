"""
Lunar calculation module.

Calculates:
- Moonrise, moonset, lunar transit
- Moon altitude and azimuth
- Lunar phase angle, illuminated fraction, lunar age
- New Moon, First Quarter, Full Moon, Last Quarter
- Lunar distance and angular diameter
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

from skyfield.almanac import find_risings, find_settings, moon_phase, MOON_PHASES
from skyfield.api import Topos

logger = logging.getLogger(__name__)

# Moon phase names
PHASE_NAMES = {
    0: "New Moon",
    1: "Waxing Crescent",
    2: "First Quarter",
    3: "Waxing Gibbous",
    4: "Full Moon",
    5: "Waning Gibbous",
    6: "Last Quarter",
    7: "Waning Crescent",
}


class LunarService:
    """Lunar event calculations using Skyfield."""

    def __init__(self, ephemeris):
        self.eph = ephemeris
        self.moon = ephemeris["moon"]
        self.sun = ephemeris["sun"]
        self.earth = ephemeris["earth"]

    def _get_observer(self, latitude: float, longitude: float, elevation: float = 0.0):
        """Create a topocentric observer: earth + Topos."""
        topos = Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)
        return self.earth + topos

    def get_moonrise_moonset(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> dict:
        """Calculate moonrise and moonset for a given date."""
        observer = self._get_observer(latitude, longitude, elevation)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        t_start = ts.from_datetime(day_start)
        t_end = ts.from_datetime(day_end)

        moonrise = None
        moonset = None

        try:
            risings, _ = find_risings(observer, self.moon, t_start, t_end)
            if risings and len(risings) > 0:
                moonrise = risings[0].utc_datetime()
        except Exception:
            moonrise = None

        try:
            settings, _ = find_settings(observer, self.moon, t_start, t_end)
            if settings and len(settings) > 0:
                moonset = settings[0].utc_datetime()
        except Exception:
            moonset = None

        return {
            "moonrise": moonrise.isoformat() if moonrise else None,
            "moonset": moonset.isoformat() if moonset else None,
        }

    def get_moon_phase(self, ts, dt: datetime) -> dict:
        """Get the current moon phase information."""
        t = ts.from_datetime(dt)

        # Use Skyfield's moon_phase function
        phase_angle = moon_phase(self.eph, t)
        phase_angle_deg = phase_angle.degrees

        # Illuminated fraction from phase angle
        illuminated_fraction = (1 + math.cos(math.radians(phase_angle_deg))) / 2

        # Phase fraction 0-1 (0 = new moon, 0.5 = full moon)
        phase_fraction = (phase_angle_deg % 360) / 360.0

        # Determine phase name
        phase_index = int(phase_fraction * 8) % 8
        phase_name = PHASE_NAMES.get(phase_index, "Unknown")

        return {
            "phase_fraction": round(phase_fraction, 4),
            "phase_name": phase_name,
            "illuminated_fraction": round(illuminated_fraction, 4),
            "illumination_percent": round(illuminated_fraction * 100, 1),
            "phase_angle_deg": round(phase_angle_deg, 2),
        }

    def get_moon_position(
        self, ts, latitude: float, longitude: float,
        dt: datetime, elevation: float = 0.0
    ) -> dict:
        """Get current moon altitude, azimuth, and distance."""
        observer = self._get_observer(latitude, longitude, elevation)
        t = ts.from_datetime(dt)

        moon_obs = observer.at(t).observe(self.moon)
        apparent = moon_obs.apparent()
        alt, az, distance = apparent.altaz()

        return {
            "altitude_deg": round(alt.degrees, 2),
            "azimuth_deg": round(az.degrees, 2),
            "distance_km": round(distance.km, 1),
            "is_above_horizon": bool(alt.degrees > 0),
        }

    def get_upcoming_phases(
        self, ts, from_dt: datetime, count: int = 4
    ) -> list:
        """Get upcoming moon phase dates using find_discrete with moon_phases."""
        from skyfield.almanac import moon_phases, find_discrete

        phases = []
        t_from = ts.from_datetime(from_dt)

        # Look for next 30 days
        t_to = ts.from_datetime(from_dt + timedelta(days=30))

        try:
            # moon_phases returns a function suitable for find_discrete
            phase_func = moon_phases(self.eph)
            phase_func.step_days = 1.0 / 4.0  # Sample 6x per day
            phase_times = find_discrete(t_from, t_to, phase_func)
            for i, pt in enumerate(phase_times):
                if i >= count:
                    break
                phase_val = phase_func(pt)
                phase_label = MOON_PHASES.get(int(phase_val), "Unknown")
                phases.append({
                    "phase": phase_label,
                    "datetime_utc": pt.utc_datetime().isoformat(),
                    "phase_value": round(phase_val / 4.0, 4),
                })
        except Exception as e:
            logger.debug("Could not find upcoming phases: %s", e)

        return phases[:count]

    def get_full_lunar_data(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0,
        current_dt: Optional[datetime] = None
    ) -> dict:
        """Get all lunar data for a given date in one call."""
        moonrise_data = self.get_moonrise_moonset(ts, latitude, longitude, date, elevation)

        ref_dt = current_dt or date.replace(hour=12, minute=0, second=0)
        phase_data = self.get_moon_phase(ts, ref_dt)

        result = {
            **moonrise_data,
            **phase_data,
        }

        if current_dt:
            result["current_position"] = self.get_moon_position(
                ts, latitude, longitude, current_dt, elevation
            )

        return result
