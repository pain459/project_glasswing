"""
Lunar calculation module.

Calculates:
- Moonrise, moonset, lunar transit
- Moon altitude and azimuth
- Lunar phase angle, illuminated fraction, lunar age
- New Moon, First Quarter, Full Moon, Last Quarter
- Lunar distance and angular diameter
- Lunar culmination (meridian transit)
- Moon nodes (ascending/descending)
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

from skyfield.almanac import (
    find_discrete, find_risings, find_settings,
    meridian_transits, moon_nodes, moon_phase, MOON_NODES, MOON_PHASES
)
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

        # Illuminated fraction from phase angle.
        # Phase angle 0° = New Moon (dark), 180° = Full Moon (bright).
        # Formula: k = (1 + cos(phase_angle)) / 2 gives 1.0 at 0° which is WRONG.
        # Correct: k = (1 - cos(phase_angle)) / 2 gives 0.0 at 0° (New Moon).
        illuminated_fraction = (1 - math.cos(math.radians(phase_angle_deg))) / 2

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

        # Airmass
        airmass = None
        alt_deg = alt.degrees
        if alt_deg > 5.0:
            import math
            z = math.radians(90.0 - alt_deg)
            airmass = round(1.0 / (math.cos(z) + 0.50572 * math.pow(96.079 - alt_deg, -1.6)), 2)

        return {
            "altitude_deg": round(alt.degrees, 2),
            "azimuth_deg": round(az.degrees, 2),
            "distance_km": round(distance.km, 1),
            "is_above_horizon": bool(alt.degrees > 0),
            "airmass": airmass,
        }

    def get_upcoming_phases(
        self, ts, from_dt: datetime, count: int = 4
    ) -> list:
        """Get upcoming moon phase dates using find_discrete with moon_phases.

        find_discrete returns (times_array, values_array) where each index
        corresponds to a different phase. times_array[i] is the Time when
        phase values_array[i] occurs.
        """
        from skyfield.almanac import moon_phases, find_discrete

        phases = []
        t_from = ts.from_datetime(from_dt)

        # Look for next 30 days
        t_to = ts.from_datetime(from_dt + timedelta(days=30))

        try:
            phase_func = moon_phases(self.eph)
            phase_func.step_days = 1.0 / 4.0  # Sample 6x per day
            result = find_discrete(t_from, t_to, phase_func)
            times_arr, values_arr = result
            for i in range(len(times_arr)):
                if i >= count:
                    break
                t = times_arr[i]
                v = int(values_arr[i])
                phase_label = MOON_PHASES[v] if 0 <= v < len(MOON_PHASES) else "Unknown"
                phases.append({
                    "phase": phase_label,
                    "datetime_utc": t.utc_datetime().isoformat(),
                })
        except Exception as e:
            logger.debug("Could not find upcoming phases: %s", e)

        return phases[:count]

    def get_lunar_culmination(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> Optional[str]:
        """Get the lunar culmination (meridian transit) time for a date."""
        topos = Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        try:
            t_start = ts.from_datetime(day_start)
            t_end = ts.from_datetime(day_end)
            transit_func = meridian_transits(self.eph, self.moon, topos)
            transits, _ = find_discrete(t_start, t_end, transit_func)
            if len(transits) > 0:
                return transits[0].utc_datetime().isoformat()
        except Exception as e:
            logger.debug("Lunar culmination failed: %s", e)

        return None

    def get_moon_nodes_info(self, ts, from_dt: datetime, count: int = 2) -> list:
        """Get upcoming moon node crossings (ascending/descending)."""
        nodes = []
        t_from = ts.from_datetime(from_dt)
        t_to = ts.from_datetime(from_dt + timedelta(days=60))

        try:
            node_func = moon_nodes(self.eph)
            node_times, node_values = find_discrete(t_from, t_to, node_func)
            for i in range(len(node_times)):
                if i >= count:
                    break
                v = int(node_values[i])
                node_type = MOON_NODES[v] if 0 <= v < len(MOON_NODES) else "Unknown"
                nodes.append({
                    "type": node_type,
                    "datetime_utc": node_times[i].utc_datetime().isoformat(),
                })
        except Exception as e:
            logger.debug("Could not find moon nodes: %s", e)

        return nodes

    def get_moon_elongation(self, ts, dt: datetime) -> float:
        """Get the angular separation between Moon and Sun in degrees."""
        try:
            t = ts.from_datetime(dt)
            earth = self.eph["earth"]
            sun = self.eph["sun"]
            moon_vec = earth.at(t).observe(self.moon)
            sun_vec = earth.at(t).observe(sun)
            elongation = moon_vec.separation_from(sun_vec)
            return round(elongation.degrees, 1)
        except Exception:
            return 0.0

    def get_full_lunar_data(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0,
        current_dt: Optional[datetime] = None
    ) -> dict:
        """Get all lunar data for a given date in one call."""
        # Moonrise/moonset with azimuth
        moonrise_data = self.get_moonrise_moonset_with_azimuth(
            ts, latitude, longitude, date, elevation
        )

        ref_dt = current_dt or date.replace(hour=12, minute=0, second=0)
        phase_data = self.get_moon_phase(ts, ref_dt)

        result = {
            **moonrise_data,
            **phase_data,
        }

        # Add lunar culmination
        culmination = self.get_lunar_culmination(ts, latitude, longitude, date, elevation)
        if culmination:
            result["lunar_culmination"] = culmination

        # Add moon elongation from Sun
        result["elongation_deg"] = self.get_moon_elongation(ts, ref_dt)

        # Add lunar age
        result["lunar_age"] = self.get_lunar_age(ts, ref_dt)

        # Add moon luminance / sky brightness impact
        result["moon_luminance"] = self.get_moon_luminance(ts, ref_dt)

        # Add perigee/apogee info
        result["perigee_apogee"] = self.get_perigee_apogee_info(ts, ref_dt)

        if current_dt:
            result["current_position"] = self.get_moon_position(
                ts, latitude, longitude, current_dt, elevation
            )

        return result

    def get_altitude_arc(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0,
        interval_hours: int = 1
    ) -> list:
        """Return hourly moon altitude for the entire day.

        Each entry: {"hour": int, "altitude": float, "azimuth": float, "distance_km": float}
        """
        observer = self._get_observer(latitude, longitude, elevation)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        points = []
        for h in range(0, 24, interval_hours):
            dt = day_start + timedelta(hours=h)
            t = ts.from_datetime(dt)
            moon_obs = observer.at(t).observe(self.moon)
            apparent = moon_obs.apparent()
            alt, az, distance = apparent.altaz()
            points.append({
                "hour": h,
                "altitude": round(alt.degrees, 1),
                "azimuth": round(az.degrees, 1),
                "distance_km": round(distance.km, 0),
            })
        return points

    # ─── Lunar Age ──────────────────────────────────────────────────────

    def get_lunar_age(self, ts, dt: datetime) -> dict:
        """Calculate the lunar age in days since the most recent New Moon.

        Returns:
            {
                "age_days": float,          # days since last New Moon
                "cycle_days": float,        # total synodic month length (~29.53)
                "age_percent": float,       # 0.0–1.0 progress through cycle
                "days_to_new_moon": float,  # days until next New Moon
            }
        """
        try:
            from skyfield.almanac import moon_phases, find_discrete

            t = ts.from_datetime(dt)

            # Search back 32 days and forward 32 days for New Moon boundaries
            t_back = ts.from_datetime(dt - timedelta(days=32))
            t_fwd = ts.from_datetime(dt + timedelta(days=32))

            phase_func = moon_phases(self.eph)
            phase_func.step_days = 0.5
            times_arr, values_arr = find_discrete(t_back, t_fwd, phase_func)

            # Collect UTC datetimes for each phase event
            all_utc_dts = times_arr.utc_datetime()
            # all_utc_dts may be a single datetime or an array; normalize to list
            if not hasattr(all_utc_dts, '__iter__') or isinstance(all_utc_dts, str):
                all_utc_dts = [all_utc_dts]
            else:
                all_utc_dts = list(all_utc_dts)

            # MOON_PHASES: 0=New, 1=First Quarter, 2=Full, 3=Last Quarter
            new_moon_dts = []
            for i, v in enumerate(values_arr):
                if int(v) == 0 and i < len(all_utc_dts):  # New Moon
                    new_moon_dts.append(all_utc_dts[i])

            if len(new_moon_dts) < 2:
                # Fallback: estimate from phase angle
                phase_angle_deg = moon_phase(self.eph, t).degrees
                age_days = (phase_angle_deg % 360) / 360.0 * 29.53059
                return {
                    "age_days": round(age_days, 1),
                    "cycle_days": 29.53,
                    "age_percent": round(age_days / 29.53, 4),
                    "days_to_new_moon": round(29.53 - age_days, 1),
                }

            # Find the New Moon just before and just after dt
            last_new = None
            next_new = None
            for nm_dt in new_moon_dts:
                if nm_dt <= dt:
                    last_new = nm_dt
                elif nm_dt > dt and next_new is None:
                    next_new = nm_dt
                    break

            if last_new and next_new:
                cycle_length = (next_new - last_new).total_seconds() / 86400.0
                age = (dt - last_new).total_seconds() / 86400.0
                remaining = (next_new - dt).total_seconds() / 86400.0
            elif last_new:
                cycle_length = 29.53059
                age = (dt - last_new).total_seconds() / 86400.0
                remaining = cycle_length - age
            else:
                cycle_length = 29.53059
                age = cycle_length * 0.5
                remaining = cycle_length - age

            return {
                "age_days": round(age, 1),
                "cycle_days": round(cycle_length, 2),
                "age_percent": round(age / cycle_length, 4),
                "days_to_new_moon": round(remaining, 1),
            }
        except Exception as e:
            logger.debug("Lunar age calculation failed: %s", e)
            return {
                "age_days": None,
                "cycle_days": 29.53,
                "age_percent": None,
                "days_to_new_moon": None,
            }

    # ─── Moon Luminance / Sky Brightness Impact ─────────────────────────

    def get_moon_luminance(self, ts, dt: datetime) -> dict:
        """Estimate the moon's impact on night sky brightness.

        Uses illumination fraction and moon altitude to classify how much
        the moon washes out the sky. Critical for deep-sky observers.

        Returns:
            {
                "luminance_class": str,    # "excellent" | "good" | "moderate" | "bright" | "washed_out"
                "luminance_label": str,    # human-readable description
                "sky_impact": str,         # brief impact description
                "deep_sky_friendly": bool, # whether conditions suit deep-sky observing
            }
        """
        try:
            phase_angle_deg = moon_phase(self.eph, ts.from_datetime(dt)).degrees
            illuminated_fraction = (1 - math.cos(math.radians(phase_angle_deg))) / 2

            # Moon altitude at observation time
            # We need an observer; use a generic one since this is called from service
            # The service will pass latitude/longitude
            # For now, estimate based on elongation from sun
            elongation = self.get_moon_elongation(ts, dt)

            # Classification based on illumination and elongation
            # Moon is a problem when it's bright AND above the horizon at night
            # Elongation > 90° means moon is up during nighttime hours

            if illuminated_fraction < 0.1:
                luminance_class = "excellent"
                luminance_label = "Dark sky — New Moon"
                sky_impact = "Minimal moonlight interference"
                deep_sky_friendly = True
            elif illuminated_fraction < 0.3:
                if elongation < 60:
                    luminance_class = "excellent"
                    luminance_label = "Dark sky — thin crescent near Sun"
                    sky_impact = "Moon sets soon after sunset"
                    deep_sky_friendly = True
                else:
                    luminance_class = "good"
                    luminance_label = "Mostly dark — crescent moon"
                    sky_impact = "Slight moonlight, faint objects still visible"
                    deep_sky_friendly = True
            elif illuminated_fraction < 0.5:
                luminance_class = "good"
                luminance_label = "Moderate — quarter moon"
                sky_impact = "Some sky glow, most deep-sky targets accessible"
                deep_sky_friendly = True
            elif illuminated_fraction < 0.75:
                luminance_class = "moderate"
                luminance_label = "Bright — gibbous moon"
                sky_impact = "Significant sky glow, fainter targets affected"
                deep_sky_friendly = False
            elif illuminated_fraction < 0.95:
                luminance_class = "bright"
                luminance_label = "Very bright — near Full Moon"
                sky_impact = "Heavy sky glow, only bright targets visible"
                deep_sky_friendly = False
            else:
                luminance_class = "washed_out"
                luminance_label = "Full Moon — sky washed out"
                sky_impact = "Deep-sky observing not recommended"
                deep_sky_friendly = False

            return {
                "luminance_class": luminance_class,
                "luminance_label": luminance_label,
                "sky_impact": sky_impact,
                "deep_sky_friendly": deep_sky_friendly,
                "illumination_fraction": round(illuminated_fraction, 4),
            }
        except Exception as e:
            logger.debug("Moon luminance calculation failed: %s", e)
            return {
                "luminance_class": "unknown",
                "luminance_label": "Unknown",
                "sky_impact": "Could not assess",
                "deep_sky_friendly": None,
                "illumination_fraction": None,
            }

    # ─── Perigee / Apogee Tracking ──────────────────────────────────────

    def get_perigee_apogee_info(self, ts, dt: datetime) -> dict:
        """Estimate proximity to perigee/apogee and days until next.

        Scans moon distance at 3-hour intervals over ±15 days to find local
        minima (perigee) and maxima (apogee) near the given date.

        Returns:
            {
                "current_distance_km": float,
                "nearest_point": str,       # "perigee" | "apogee"
                "days_to_nearest": float,   # days until next perigee or apogee
                "perigee_distance_km": float,  # distance at nearest perigee
                "apogee_distance_km": float,   # distance at nearest apogee
            }
        """
        try:
            t = ts.from_datetime(dt)
            moon_vec = self.earth.at(t).observe(self.moon)
            current_distance = moon_vec.distance().km

            # Scan ±15 days at 3-hour intervals (enough to catch the extremum)
            distances = []
            for offset_hours in range(-360, 361, 3):
                scan_dt = dt + timedelta(hours=offset_hours)
                scan_t = ts.from_datetime(scan_dt)
                scan_vec = self.earth.at(scan_t).observe(self.moon)
                distances.append((offset_hours, scan_vec.distance().km))

            # Find the nearest perigee (local minimum) and apogee (local maximum)
            # after dt (offset >= 0)
            perigee_days = None
            perigee_dist = None
            apogee_days = None
            apogee_dist = None

            for i in range(2, len(distances) - 2):
                offset_h, dist = distances[i]
                if offset_h < 0:
                    continue
                prev_dist = distances[i - 1][1]
                next_dist = distances[i + 1][1]
                prev2_dist = distances[i - 2][1]
                next2_dist = distances[i + 2][1]

                # Local minimum = perigee
                if (dist < prev_dist and dist < next_dist
                        and dist <= prev2_dist and dist <= next2_dist):
                    if perigee_days is None:
                        perigee_days = offset_h / 24.0
                        perigee_dist = dist
                    # Don't break — we need both perigee and apogee

                # Local maximum = apogee
                if (dist > prev_dist and dist > next_dist
                        and dist >= prev2_dist and dist >= next2_dist):
                    if apogee_days is None:
                        apogee_days = offset_h / 24.0
                        apogee_dist = dist

                # If we found both, stop scanning
                if perigee_days is not None and apogee_days is not None:
                    break

            # Determine which is nearer
            if perigee_days is not None and apogee_days is not None:
                if perigee_days < apogee_days:
                    nearest_point = "perigee"
                    days_to_nearest = perigee_days
                else:
                    nearest_point = "apogee"
                    days_to_nearest = apogee_days
            elif perigee_days is not None:
                nearest_point = "perigee"
                days_to_nearest = perigee_days
            elif apogee_days is not None:
                nearest_point = "apogee"
                days_to_nearest = apogee_days
            else:
                nearest_point = "unknown"
                days_to_nearest = None

            return {
                "current_distance_km": round(current_distance, 0),
                "nearest_point": nearest_point,
                "days_to_nearest": round(days_to_nearest, 1) if days_to_nearest is not None else None,
                "perigee_distance_km": round(perigee_dist, 0) if perigee_dist is not None else None,
                "apogee_distance_km": round(apogee_dist, 0) if apogee_dist is not None else None,
            }
        except Exception as e:
            logger.debug("Perigee/apogee calculation failed: %s", e)
            return {
                "current_distance_km": None,
                "nearest_point": "unknown",
                "days_to_nearest": None,
                "perigee_distance_km": None,
                "apogee_distance_km": None,
            }

    # ─── Moonrise / Moonset Azimuth ─────────────────────────────────────

    def get_moonrise_moonset_with_azimuth(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> dict:
        """Calculate moonrise/moonset with azimuth at rise/set.

        Extends get_moonrise_moonset with the azimuth direction at each event.
        Azimuth is computed by observing the moon at the rise/set time.
        """
        observer = self._get_observer(latitude, longitude, elevation)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        t_start = ts.from_datetime(day_start)
        t_end = ts.from_datetime(day_end)

        result = {"moonrise": None, "moonset": None,
                  "moonrise_azimuth": None, "moonset_azimuth": None,
                  "moonrise_direction": None, "moonset_direction": None}

        try:
            risings, _ = find_risings(observer, self.moon, t_start, t_end)
            if risings and len(risings) > 0:
                rise_t = risings[0]
                result["moonrise"] = rise_t.utc_datetime().isoformat()
                # Compute azimuth at rise time
                moon_obs = observer.at(rise_t).observe(self.moon)
                apparent = moon_obs.apparent()
                _, az, _ = apparent.altaz()
                az_deg = az.degrees % 360
                result["moonrise_azimuth"] = round(az_deg, 1)
                result["moonrise_direction"] = _azimuth_to_compass(az_deg)
        except Exception:
            pass

        try:
            settings, _ = find_settings(observer, self.moon, t_start, t_end)
            if settings and len(settings) > 0:
                set_t = settings[0]
                result["moonset"] = set_t.utc_datetime().isoformat()
                # Compute azimuth at set time
                moon_obs = observer.at(set_t).observe(self.moon)
                apparent = moon_obs.apparent()
                _, az, _ = apparent.altaz()
                az_deg = az.degrees % 360
                result["moonset_azimuth"] = round(az_deg, 1)
                result["moonset_direction"] = _azimuth_to_compass(az_deg)
        except Exception:
            pass

        return result


def _azimuth_to_compass(azimuth: float) -> str:
    """Convert azimuth degrees to compass direction with abbreviation."""
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = int(((azimuth + 11.25) % 360) / 22.5) % 16
    return dirs[idx]
