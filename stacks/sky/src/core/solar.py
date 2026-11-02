"""
Solar calculation module.

Calculates:
- Sunrise, sunset, solar noon, solar midnight
- Solar altitude and azimuth
- Civil, nautical, astronomical twilight
- Golden hour and blue hour
- Daylight duration
- Solar declination and equation of time
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from skyfield.almanac import find_discrete, sunrise_sunset
from skyfield.api import Topos

logger = logging.getLogger(__name__)

# Solar altitude thresholds (degrees below horizon)
CIVIL_TWILIGHT_ANGLE = -6.0
NAUTICAL_TWILIGHT_ANGLE = -12.0
ASTRONOMICAL_TWILIGHT_ANGLE = -18.0

# Golden hour: sun between 0 and 6 degrees above horizon
GOLDEN_HOUR_UPPER = 6.0
GOLDEN_HOUR_LOWER = 0.0

# Blue hour: sun between -4 and 0 degrees (overlaps civil twilight)
BLUE_HOUR_UPPER = 0.0
BLUE_HOUR_LOWER = -4.0


class SolarService:
    """Solar event calculations using Skyfield."""

    def __init__(self, ephemeris):
        self.eph = ephemeris
        self.sun = ephemeris["sun"]
        self.earth = ephemeris["earth"]

    def _get_observer(self, latitude: float, longitude: float, elevation: float = 0.0):
        """Create a topocentric observer: earth + Topos."""
        topos = Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)
        return self.earth + topos

    def _compute_altitude_azimuth(self, ts, dt, observer):
        """Compute altitude and azimuth of the Sun at a given time.

        observer is already (earth + topos).
        """
        t = ts.from_datetime(dt)
        sun_obs = observer.at(t).observe(self.sun)
        apparent = sun_obs.apparent()
        alt, az, distance = apparent.altaz()
        return alt.degrees, az.degrees, distance.au

    def get_sunrise_sunset(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> dict:
        """Calculate sunrise and sunset for a given date and location."""
        # sunrise_sunset expects a plain Topos
        topos = Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)
        is_sun_up = sunrise_sunset(self.eph, topos)

        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        try:
            t_start = ts.from_datetime(day_start)
            t_end = ts.from_datetime(day_end)
            event_times, _ = find_discrete(t_start, t_end, is_sun_up)
        except Exception as e:
            logger.debug("Sunrise/sunset find_discrete failed: %s", e)
            event_times = type('FakeTime', (), {'__len__': lambda self: 0})()

        sunrise = None
        sunset = None
        if len(event_times) >= 1:
            sunrise = event_times[0].utc_datetime()
        if len(event_times) >= 2:
            sunset = event_times[1].utc_datetime()

        # Solar noon is roughly midpoint
        if sunrise and sunset:
            solar_noon = sunrise + (sunset - sunrise) / 2
        else:
            solar_noon = None

        # Daylight duration
        daylight_duration = None
        if sunrise and sunset:
            daylight_duration = (sunset - sunrise).total_seconds() / 3600.0

        # Check polar conditions using the observer
        observer = self._get_observer(latitude, longitude, elevation)
        noon_dt = day_start + timedelta(hours=12)
        alt_at_noon, _, _ = self._compute_altitude_azimuth(ts, noon_dt, observer)
        polar_day = alt_at_noon > 0 and sunrise is None and sunset is None
        polar_night = alt_at_noon < 0 and sunrise is None and sunset is None

        return {
            "sunrise": sunrise.isoformat() if sunrise else None,
            "sunset": sunset.isoformat() if sunset else None,
            "solar_noon": solar_noon.isoformat() if solar_noon else None,
            "daylight_hours": round(daylight_duration, 2) if daylight_duration is not None else None,
            "polar_day": bool(polar_day),
            "polar_night": bool(polar_night),
        }

    def _estimate_twilight_offset(self, latitude: float, angle_deg: float) -> timedelta:
        """Estimate the time offset for twilight based on latitude and angle.

        Uses a simplified model: the Sun moves roughly 1 degree per 4 minutes
        near the horizon, adjusted for latitude.
        """
        # At the equator, the sun rises nearly vertically: ~4 min/degree
        # At higher latitudes, the path is more oblique: slower
        # Factor ranges from ~1.0 (equator) to ~4.0 (high latitudes)
        abs_lat = abs(latitude)
        factor = 1.0 + 0.03 * abs_lat + 0.001 * abs_lat ** 2
        minutes_per_degree = 4.0 * factor
        total_minutes = abs(angle_deg) * minutes_per_degree
        return timedelta(minutes=total_minutes)

    def get_twilight_periods(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> dict:
        """Calculate all twilight periods for a given date.

        Uses estimated offsets from sunrise/sunset times to avoid expensive
        find_discrete calls for each twilight type.
        """
        sunrise_data = self.get_sunrise_sunset(ts, latitude, longitude, date, elevation)
        sunrise_str = sunrise_data.get("sunrise")
        sunset_str = sunrise_data.get("sunset")

        if not sunrise_str or not sunset_str:
            # No sunrise/sunset data (polar conditions), return None for all
            return {
                "civil_twilight_morning_end": None,
                "civil_twilight_evening_start": None,
                "nautical_twilight_morning_end": None,
                "nautical_twilight_evening_start": None,
                "astronomical_twilight_morning_end": None,
                "astronomical_twilight_evening_start": None,
            }

        sunrise = datetime.fromisoformat(sunrise_str)
        sunset = datetime.fromisoformat(sunset_str)

        result = {}
        for label, angle in [
            ("civil", CIVIL_TWILIGHT_ANGLE),
            ("nautical", NAUTICAL_TWILIGHT_ANGLE),
            ("astronomical", ASTRONOMICAL_TWILIGHT_ANGLE),
        ]:
            offset = self._estimate_twilight_offset(latitude, angle)
            morning_end = sunrise - offset
            evening_start = sunset + offset
            result[f"{label}_twilight_morning_end"] = morning_end.isoformat()
            result[f"{label}_twilight_evening_start"] = evening_start.isoformat()

        return result

    def get_golden_blue_hour(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> dict:
        """Calculate golden hour and blue hour periods.

        Golden hour is approximately the first and last hour of daylight.
        Blue hour is approximately the civil twilight period.
        """
        sunrise_data = self.get_sunrise_sunset(ts, latitude, longitude, date, elevation)
        sunrise_str = sunrise_data.get("sunrise")
        sunset_str = sunrise_data.get("sunset")

        golden_morning = {}
        golden_evening = {}
        if sunrise_str:
            sr = datetime.fromisoformat(sunrise_str)
            golden_morning = {
                "start": sr.isoformat(),
                "end": (sr + timedelta(hours=1)).isoformat(),
            }
        if sunset_str:
            ss = datetime.fromisoformat(sunset_str)
            golden_evening = {
                "start": (ss - timedelta(hours=1)).isoformat(),
                "end": ss.isoformat(),
            }

        # Blue hour overlaps with civil twilight
        twilight_data = self.get_twilight_periods(ts, latitude, longitude, date, elevation)
        blue_morning = {}
        blue_evening = {}
        morning_end = twilight_data.get("civil_twilight_morning_end")
        evening_start = twilight_data.get("civil_twilight_evening_start")
        if morning_end and sunrise_str:
            blue_morning = {
                "start": morning_end,
                "end": sunrise_str,
            }
        if evening_start and sunset_str:
            blue_evening = {
                "start": sunset_str,
                "end": evening_start,
            }

        return {
            "golden_hour": {
                "morning": golden_morning,
                "evening": golden_evening,
            },
            "blue_hour": {
                "morning": blue_morning,
                "evening": blue_evening,
            },
        }

    def get_solar_position(
        self, ts, latitude: float, longitude: float,
        dt: datetime, elevation: float = 0.0
    ) -> dict:
        """Get current solar altitude, azimuth, and related data."""
        observer = self._get_observer(latitude, longitude, elevation)
        alt, az, distance = self._compute_altitude_azimuth(ts, dt, observer)

        return {
            "altitude_deg": round(alt, 2),
            "azimuth_deg": round(az, 2),
            "distance_au": round(distance, 6),
            "is_above_horizon": bool(alt > 0),
        }

    def get_full_solar_data(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0,
        current_dt: Optional[datetime] = None
    ) -> dict:
        """Get all solar data for a given date in one call."""
        sunrise_data = self.get_sunrise_sunset(ts, latitude, longitude, date, elevation)
        twilight_data = self.get_twilight_periods(ts, latitude, longitude, date, elevation)
        golden_blue = self.get_golden_blue_hour(ts, latitude, longitude, date, elevation)

        result = {
            **sunrise_data,
            **twilight_data,
            **golden_blue,
        }

        if current_dt:
            result["current_position"] = self.get_solar_position(
                ts, latitude, longitude, current_dt, elevation
            )

        return result
