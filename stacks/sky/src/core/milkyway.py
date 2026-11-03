"""
Milky Way / Galactic Center visibility service.

Provides rigorous, Skyfield-based calculations for:
- Galactic Center (Sagittarius A*) topocentric altitude and azimuth
- Galactic Center rise / set times for a local date
- Weighted visibility rating with transparent scoring factors
- Best viewing window detection for a given date
- Seasonal visibility assessment

The galactic center coordinates are those of Sagittarius A* (J2000):
  RA  17h 45m 40.04s  →  266.4051°
  Dec -29° 00' 28.1"  → -29.0078°
"""

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from skyfield.almanac import find_discrete, find_risings, find_settings
from skyfield.api import Star

logger = logging.getLogger(__name__)

# ─── Galactic Center (Sagittarius A*) J2000 coordinates ─────────────────
GALACTIC_CENTER_RA_DEG = 266.4051       # degrees
GALACTIC_CENTER_DEC_DEG = -29.0078      # degrees
GALACTIC_CENTER_RA_HOURS = GALACTIC_CENTER_RA_DEG / 15.0  # 17.76034 hours

# ─── Scoring weights (must sum to 1.0) ──────────────────────────────────
WEIGHT_GC_ALTITUDE = 0.40
WEIGHT_DARKNESS = 0.30
WEIGHT_MOON = 0.20
WEIGHT_SEASONAL = 0.10

# ─── Altitude scoring thresholds ────────────────────────────────────────
ALT_EXCELLENT = 60.0   # 100 % score above this
ALT_MINIMUM = 15.0     # 0 % score below this

# ─── Moon interference thresholds ───────────────────────────────────────
MOON_ALT_POOR = 50.0       # degrees — moon above this is bad
MOON_ILLUM_BAD = 80.0      # percent — moon brighter than this is bad
MOON_ILLUM_GOOD = 10.0     # percent — moon dimmer than this is fine

# ─── Seasonal scoring (Northern-hemisphere centric) ────────────────────
# Month → base seasonal score (0-100).  Peak in summer, trough in winter.
SEASONAL_SCORES = {
    6: 100, 7: 100, 8: 100, 9: 90,   # summer / early autumn
    5: 80,  4: 70, 10: 60,           # shoulder months
    3: 40, 11: 30,                   # early spring / late autumn
    12: 15, 1: 10,  2: 10,          # winter — GC rises during daylight
}

# ─── Rating bands ───────────────────────────────────────────────────────
RATING_BANDS = [
    (80, "Excellent"),
    (60, "Good"),
    (40, "Fair"),
    (20, "Poor"),
    (0,  "Not Observable"),
]

# ─── Nightly scan resolution (minutes) ──────────────────────────────────
SAMPLE_INTERVAL_MIN = 15


# ────────────────────────────────────────────────────────────────────────
# Helper utilities
# ────────────────────────────────────────────────────────────────────────


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    """Clamp a value to [lo, hi]."""
    return max(lo, min(hi, value))


def _altitude_score(alt_deg: float) -> float:
    """Score 0-100 based on galactic center altitude.

    Linear ramp from ALT_MINIMUM (0) to ALT_EXCELLENT (100).
    """
    if alt_deg <= ALT_MINIMUM:
        return 0.0
    if alt_deg >= ALT_EXCELLENT:
        return 100.0
    return ((alt_deg - ALT_MINIMUM) / (ALT_EXCELLENT - ALT_MINIMUM)) * 100.0


def _darkness_score(sun_alt_deg: float) -> float:
    """Score 0-100 based on solar altitude (astronomical darkness).

    Sun below -18° → 100.  Sun above horizon → 0.  Linear ramp between.
    """
    if sun_alt_deg <= -18.0:
        return 100.0
    if sun_alt_deg >= 0.0:
        return 0.0
    # Linear interpolation between 0° and -18°
    return ((-sun_alt_deg) / 18.0) * 100.0


def _darkness_label(sun_alt_deg: float) -> str:
    """Human-readable darkness label."""
    if sun_alt_deg <= -18.0:
        return "astronomical_night"
    if sun_alt_deg <= -12.0:
        return "nautical_twilight"
    if sun_alt_deg <= -6.0:
        return "civil_twilight"
    return "daylight"


def _moon_interference_score(moon_alt_deg: float, moon_illum_pct: float) -> float:
    """Score 0-100 for moon interference (higher = less interference).

    100 if moon below horizon or <10 % illuminated.
    0 if moon >50° altitude and >80 % illuminated.
    """
    # Moon below horizon → no interference
    if moon_alt_deg < 0.0:
        return 100.0
    # Moon dim enough → minimal interference
    if moon_illum_pct <= MOON_ILLUM_GOOD:
        return 100.0

    # Both high altitude and bright → worst case
    if moon_alt_deg >= MOON_ALT_POOR and moon_illum_pct >= MOON_ILLUM_BAD:
        return 0.0

    # Partial penalty: blend altitude and illumination factors
    alt_factor = max(0.0, 1.0 - moon_alt_deg / MOON_ALT_POOR)
    illum_factor = max(0.0, 1.0 - moon_illum_pct / MOON_ILLUM_BAD)
    return ((alt_factor + illum_factor) / 2.0) * 100.0


def _moon_interference_label(moon_alt_deg: float, moon_illum_pct: float) -> str:
    """Human-readable moon interference label."""
    if moon_alt_deg < 0.0 or moon_illum_pct <= MOON_ILLUM_GOOD:
        return "none"
    if moon_alt_deg >= MOON_ALT_POOR and moon_illum_pct >= MOON_ILLUM_BAD:
        return "severe"
    if moon_alt_deg >= 30.0 and moon_illum_pct >= 50.0:
        return "moderate"
    return "low"


def _seasonal_score(month: int, latitude: float) -> float:
    """Score 0-100 based on month and latitude.

    For southern latitudes the seasonal curve is inverted (shift 6 months).
    Near the equator the seasonal variation is muted.
    """
    base = SEASONAL_SCORES.get(month, 50)

    # Invert for southern hemisphere
    if latitude < -10:
        shifted_month = (month + 6 - 1) % 12 + 1
        base = SEASONAL_SCORES.get(shifted_month, 50)
    elif latitude < 0:
        # Tropical southern: slight shift
        shifted_month = (month + 3 - 1) % 12 + 1
        base = (base + SEASONAL_SCORES.get(shifted_month, 50)) / 2.0

    # Near equator: reduce seasonal variation (blend toward 70)
    if abs(latitude) < 15:
        base = (base + 70.0) / 2.0

    return _clamp(base)


def _seasonal_label(month: int, latitude: float) -> str:
    """Human-readable seasonal label."""
    score = _seasonal_score(month, latitude)
    if score >= 90:
        return "peak_season"
    if score >= 70:
        return "favorable"
    if score >= 40:
        return "moderate"
    if score >= 20:
        return "challenging"
    return "poor"


def _composite_rating(score: float) -> str:
    """Map a 0-100 composite score to a rating label."""
    for threshold, label in RATING_BANDS:
        if score >= threshold:
            return label
    return "Not Observable"


# ────────────────────────────────────────────────────────────────────────
# MilkyWayService
# ────────────────────────────────────────────────────────────────────────


class MilkyWayService:
    """Rigorous Milky Way / Galactic Center visibility calculations.

    All position computations use Skyfield topocentric vectors rather than
    approximate spherical-astronomy formulas.
    """

    def __init__(self, ephemeris):
        """Initialise with a loaded Skyfield ephemeris.

        The ephemeris must contain at least ``sun``, ``moon``, and ``earth``.
        """
        self.eph = ephemeris
        self.sun = ephemeris["sun"]
        self.moon = ephemeris["moon"]
        self.earth = ephemeris["earth"]

        # Pre-create a Star object for the galactic center (Sgr A*).
        # Skyfield Star objects use J2000 equatorial coordinates and handle
        # precession/nutation internally when observed at a given time.
        self._gc_star = Star(
            ra_hours=GALACTIC_CENTER_RA_HOURS,
            dec_degrees=GALACTIC_CENTER_DEC_DEG,
        )

    # ── Observer helper ────────────────────────────────────────────────

    def _get_observer(self, latitude: float, longitude: float, elevation: float = 0.0):
        """Create a topocentric observer."""
        from skyfield.api import Topos

        return self.earth + Topos(
            latitude_degrees=latitude,
            longitude_degrees=longitude,
            elevation_m=elevation,
        )

    # ── Galactic Center Position ───────────────────────────────────────

    def get_galactic_center_position(
        self, ts, dt: datetime, lat: float, lon: float, elevation: float = 0.0
    ) -> dict:
        """Get GC altitude, azimuth at a specific time.

        Parameters
        ----------
        ts : skyfield.Timescale
            The timescale object.
        dt : datetime
            UTC datetime to evaluate.
        lat, lon : float
            Observer latitude and longitude in degrees.
        elevation : float
            Observer elevation in metres (default 0).

        Returns
        -------
        dict with keys: altitude_deg, azimuth_deg, is_above_horizon,
        ra_deg, dec_deg, distance_light_seconds.
        """
        t = ts.from_datetime(dt)
        observer = self._get_observer(lat, lon, elevation)

        # Observe the galactic center star from the topocentric location
        gc_obs = observer.at(t).observe(self._gc_star)
        gc_apparent = gc_obs.apparent()
        alt_deg, az_deg, distance_ls = gc_apparent.altaz()

        return {
            "altitude_deg": round(float(alt_deg.degrees), 2),
            "azimuth_deg": round(float(az_deg.degrees), 2),
            "is_above_horizon": bool(alt_deg.degrees > 0.0),
            "ra_deg": round(GALACTIC_CENTER_RA_DEG, 4),
            "dec_deg": round(GALACTIC_CENTER_DEC_DEG, 4),
        }

    # ── Galactic Center Rise / Set ─────────────────────────────────────

    def get_galactic_center_riseset(
        self, ts, dt_date: datetime, lat: float, lon: float, elevation: float = 0.0
    ) -> dict:
        """Get GC rise/set times for a local date.

        Parameters
        ----------
        ts : skyfield.Timescale
        dt_date : datetime
            Any datetime on the local date of interest (UTC).
        lat, lon : float
        elevation : float

        Returns
        -------
        dict with keys: rise, set, is_circumpolar, is_never_above_horizon.
        Times are ISO-8601 UTC strings or None.
        """
        day_start = dt_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        observer = self._get_observer(lat, lon, elevation)
        t_start = ts.from_datetime(day_start)
        t_end = ts.from_datetime(day_end)

        rise_time = None
        set_time = None
        is_circumpolar = False
        is_never_above = False

        try:
            risings, _ = find_risings(observer, self._gc_star, t_start, t_end)
            if len(risings) == 0:
                # Either never rises or always above horizon
                # Check altitude at midnight to distinguish
                midnight = day_start + timedelta(hours=12)
                gc_pos = self.get_galactic_center_position(
                    ts, midnight, lat, lon, elevation
                )
                if gc_pos["altitude_deg"] > 0:
                    is_circumpolar = True
                else:
                    is_never_above = True
            elif len(risings) > 1:
                # Rises more than once in 24 h is unusual; take the first
                rise_time = risings[0].utc_datetime().isoformat()
            else:
                rise_time = risings[0].utc_datetime().isoformat()
        except Exception as e:
            logger.debug("GC rise calculation failed: %s", e)

        try:
            settings, _ = find_settings(observer, self._gc_star, t_start, t_end)
            if len(settings) == 0:
                if not is_circumpolar and not is_never_above:
                    # No set and no rise → check if circumpolar
                    midnight = day_start + timedelta(hours=12)
                    gc_pos = self.get_galactic_center_position(
                        ts, midnight, lat, lon, elevation
                    )
                    if gc_pos["altitude_deg"] > 0:
                        is_circumpolar = True
                    else:
                        is_never_above = True
            elif len(settings) > 1:
                set_time = settings[0].utc_datetime().isoformat()
            else:
                set_time = settings[0].utc_datetime().isoformat()
        except Exception as e:
            logger.debug("GC set calculation failed: %s", e)

        return {
            "rise": rise_time,
            "set": set_time,
            "is_circumpolar": bool(is_circumpolar),
            "is_never_above_horizon": bool(is_never_above),
        }

    # ── Visibility Rating ──────────────────────────────────────────────

    def get_visibility_rating(
        self, ts, dt: datetime, lat: float, lon: float, elevation: float = 0.0
    ) -> dict:
        """Get the full visibility rating with individual factors.

        Parameters
        ----------
        ts : skyfield.Timescale
        dt : datetime
            UTC datetime to evaluate.
        lat, lon : float
        elevation : float

        Returns
        -------
        dict with rating, score, factors, galactic_center, sun, moon.
        """
        # --- Galactic Center position ---
        gc_pos = self.get_galactic_center_position(ts, dt, lat, lon, elevation)
        gc_alt = gc_pos["altitude_deg"]

        # --- Sun position (darkness) ---
        t = ts.from_datetime(dt)
        observer = self._get_observer(lat, lon, elevation)
        sun_obs = observer.at(t).observe(self.sun).apparent()
        sun_alt_deg = sun_obs.altaz()[0].degrees

        # --- Moon position & illumination ---
        moon_obs = observer.at(t).observe(self.moon)
        # Compute illumination from phase angle (Skyfield 1.55+ uses phase_angle, not phase_fraction)
        moon_phase_angle = moon_obs.phase_angle(self.sun).degrees
        moon_illum_pct = (1.0 + math.cos(math.radians(moon_phase_angle))) / 2.0 * 100.0
        moon_alt_deg = moon_obs.apparent().altaz()[0].degrees

        # Angular separation between Moon and Galactic Center
        gc_obs = observer.at(t).observe(self._gc_star)
        sep_deg = gc_obs.separation_from(moon_obs).degrees

        # --- Compute individual factor scores ---
        gc_alt_score = _altitude_score(gc_alt)
        darkness_s = _darkness_score(sun_alt_deg)
        moon_score = _moon_interference_score(moon_alt_deg, moon_illum_pct)
        seasonal_s = _seasonal_score(dt.month, lat)

        # --- Composite score ---
        composite = (
            gc_alt_score * WEIGHT_GC_ALTITUDE
            + darkness_s * WEIGHT_DARKNESS
            + moon_score * WEIGHT_MOON
            + seasonal_s * WEIGHT_SEASONAL
        )
        composite = _clamp(composite)

        return {
            "rating": _composite_rating(composite),
            "score": round(float(composite), 1),
            "factors": {
                "gc_altitude": {
                    "value": round(float(gc_alt), 1),
                    "score": round(float(gc_alt_score), 1),
                    "weight": WEIGHT_GC_ALTITUDE,
                },
                "darkness": {
                    "value": _darkness_label(sun_alt_deg),
                    "score": round(float(darkness_s), 1),
                    "weight": WEIGHT_DARKNESS,
                },
                "moon_interference": {
                    "value": _moon_interference_label(moon_alt_deg, moon_illum_pct),
                    "score": round(float(moon_score), 1),
                    "weight": WEIGHT_MOON,
                },
                "seasonal": {
                    "value": _seasonal_label(dt.month, lat),
                    "score": round(float(seasonal_s), 1),
                    "weight": WEIGHT_SEASONAL,
                },
            },
            "galactic_center": {
                "altitude_deg": round(float(gc_alt), 1),
                "azimuth_deg": round(float(gc_pos["azimuth_deg"]), 1),
                "is_above_horizon": bool(gc_pos["is_above_horizon"]),
                "min_altitude_threshold": ALT_MINIMUM,
            },
            "sun": {
                "altitude_deg": round(float(sun_alt_deg), 1),
                "is_astronomical_night": bool(sun_alt_deg <= -18.0),
            },
            "moon": {
                "altitude_deg": round(float(moon_alt_deg), 1),
                "illumination_percent": round(float(moon_illum_pct), 1),
                "angular_separation_from_gc_deg": round(float(sep_deg), 1),
            },
        }

    # ── Best Viewing Window ────────────────────────────────────────────

    def get_best_viewing_window(
        self, ts, dt_date: datetime, lat: float, lon: float, elevation: float = 0.0
    ) -> dict:
        """Find the best time window for observing the Galactic Center.

        Scans the night in SAMPLE_INTERVAL_MIN steps and returns the
        timestamp with the highest composite visibility score, along with
        a recommended viewing window of ±2 hours around it.

        Parameters
        ----------
        ts : skyfield.Timescale
        dt_date : datetime
            Any datetime on the local date of interest (UTC).
        lat, lon : float
        elevation : float

        Returns
        -------
        dict with best_time, best_score, best_rating, window_start,
        window_end, and a sample of hourly ratings.
        """
        day_start = dt_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        best_score = -1.0
        best_dt = None
        best_rating = "Not Observable"

        # Collect hourly snapshots for the summary
        hourly_samples = []

        current = day_start
        while current < day_end:
            rating_info = self.get_visibility_rating(
                ts, current, lat, lon, elevation
            )
            score = rating_info["score"]

            if score > best_score:
                best_score = score
                best_dt = current
                best_rating = rating_info["rating"]

            # Record an hourly sample (every hour on the hour)
            if current.minute == 0 and current.second == 0:
                hourly_samples.append({
                    "time": current.isoformat(),
                    "score": round(float(score), 1),
                    "rating": rating_info["rating"],
                    "gc_altitude": round(float(rating_info["galactic_center"]["altitude_deg"]), 1),
                })

            current += timedelta(minutes=SAMPLE_INTERVAL_MIN)

        if best_dt is None:
            best_dt = day_start + timedelta(hours=12)

        window_start = (best_dt - timedelta(hours=2)).isoformat()
        window_end = (best_dt + timedelta(hours=2)).isoformat()

        # Get rise/set for context
        riseset = self.get_galactic_center_riseset(ts, dt_date, lat, lon, elevation)

        return {
            "best_time": best_dt.isoformat(),
            "best_score": round(float(best_score), 1),
            "best_rating": best_rating,
            "window_start": window_start,
            "window_end": window_end,
            "galactic_center_rise": riseset["rise"],
            "galactic_center_set": riseset["set"],
            "hourly_samples": hourly_samples,
        }

    # ── Seasonal Visibility ────────────────────────────────────────────

    def get_seasonal_visibility(self, month: int, latitude: float) -> dict:
        """Get seasonal visibility info for a month and latitude.

        This is a lightweight, no-ephemeris call that assesses how
        favourable a given month is for Milky Way observation at the
        specified latitude.

        Parameters
        ----------
        month : int
            1-12.
        latitude : float
            Observer latitude in degrees.

        Returns
        -------
        dict with seasonal_score, seasonal_label, gc_max_altitude_estimate,
        recommendation, and optimal_months.
        """
        score = _seasonal_score(month, latitude)
        label = _seasonal_label(month, latitude)

        # Estimate the maximum altitude the GC can reach at transit
        # (when it crosses the meridian) for this latitude.
        #   alt_max = 90 - |lat - dec|  (simplified, ignoring refraction)
        gc_max_alt = 90.0 - abs(latitude - GALACTIC_CENTER_DEC_DEG)

        # Determine recommendation
        if score >= 90 and gc_max_alt > 30:
            recommendation = (
                "Prime Milky Way season. The galactic center is high in the "
                "sky during nighttime hours. Excellent conditions for "
                "observation and photography."
            )
        elif score >= 70 and gc_max_alt > 20:
            recommendation = (
                "Good conditions for Milky Way observation. The galactic "
                "center is well-placed in the evening sky."
            )
        elif score >= 40:
            recommendation = (
                "Moderate visibility. The galactic center is observable but "
                "may be lower on the horizon. Look for clear, dark skies."
            )
        elif gc_max_alt <= 15:
            recommendation = (
                "The galactic center does not rise sufficiently above the "
                "horizon at this latitude. Milky Way core observation is "
                "not feasible."
            )
        else:
            recommendation = (
                "Poor season for Milky Way observation. The galactic center "
                "rises during daylight or is very low on the horizon. "
                "Consider waiting for summer months."
            )

        # Optimal months depend on hemisphere
        if latitude >= 0:
            optimal = ["June", "July", "August", "September"]
        else:
            optimal = ["December", "January", "February", "March"]

        return {
            "month": month,
            "latitude": float(latitude),
            "seasonal_score": round(float(score), 1),
            "seasonal_label": label,
            "gc_max_altitude_estimate_deg": round(float(gc_max_alt), 1),
            "recommendation": recommendation,
            "optimal_months": optimal,
        }
