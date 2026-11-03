"""
Observation planning module.

Evaluates all observable targets (planets, bright stars, Messier objects)
and ranks them by observability for a given date and location.

The service does not duplicate calculations from PlanetaryService,
SolarService, LunarService, StarService, or MessierService — it delegates
to them and applies a transparent, weighted scoring model.
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ── Scoring weights (must sum to 1.0) ──────────────────────────────────
WEIGHT_MAX_ALTITUDE = 0.35
WEIGHT_DARKNESS_TIME = 0.25
WEIGHT_BRIGHTNESS = 0.20
WEIGHT_MOON_SEP = 0.15
WEIGHT_EQUIPMENT = 0.05

# ── Equipment thresholds (V-magnitude) ─────────────────────────────────
EQUIP_NAKED_EYE = 4.0
EQUIP_BINOCULAR = 7.0
EQUIP_SMALL_TELESCOPE = 10.0

# ── Altitude scoring thresholds ────────────────────────────────────────
ALT_EXCELLENT = 60.0  # 100 % score above this
ALT_MINIMUM = 5.0     # 0 % score below this

# ── Sampling resolution for nightly altitude scans (minutes) ────────────
SAMPLE_INTERVAL_MIN = 15

# ── Moon-separation scoring thresholds (degrees) ───────────────────────
MOON_SEP_EXCELLENT = 90.0   # 100 % score above this
MOON_SEP_POOR = 15.0        # 0 % score below this


# ───────────────────────────────────────────────────────────────────────
# Helper utilities
# ───────────────────────────────────────────────────────────────────────


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp a value to [lo, hi]."""
    return max(lo, min(hi, value))


def _altitude_score(alt_deg: float) -> float:
    """Score 0-1 based on maximum altitude tonight.

    Linear ramp from ALT_MINIMUM (0) to ALT_EXCELLENT (1).
    """
    if alt_deg <= ALT_MINIMUM:
        return 0.0
    if alt_deg >= ALT_EXCELLENT:
        return 1.0
    return (alt_deg - ALT_MINIMUM) / (ALT_EXCELLENT - ALT_MINIMUM)


def _magnitude_score(mag: float) -> float:
    """Score 0-1 based on apparent magnitude (brighter = better).

    Uses a sigmoid-like curve centred around mag 4 (naked-eye limit).
    mag -2 → ~0.97, mag 4 → 0.5, mag 12 → ~0.02
    """
    # Shift so that mag 4 is the midpoint
    return 1.0 / (1.0 + math.exp(0.5 * (mag - 4.0)))


def _moon_separation_score(sep_deg: float) -> float:
    """Score 0-1 based on angular separation from the Moon.

    Larger separation = less moonlight interference = better.
    """
    if sep_deg >= MOON_SEP_EXCELLENT:
        return 1.0
    if sep_deg <= MOON_SEP_POOR:
        return 0.0
    return (sep_deg - MOON_SEP_POOR) / (MOON_SEP_EXCELLENT - MOON_SEP_POOR)


def _equipment_score(mag: float) -> float:
    """Score 0-1 based on equipment required (naked-eye = best)."""
    if mag < EQUIP_NAKED_EYE:
        return 1.0
    if mag < EQUIP_BINOCULAR:
        return 0.75
    if mag < EQUIP_SMALL_TELESCOPE:
        return 0.5
    return 0.25


def _classify_equipment(mag: float) -> str:
    if mag < EQUIP_NAKED_EYE:
        return "naked_eye"
    if mag < EQUIP_BINOCULAR:
        return "binocular"
    if mag < EQUIP_SMALL_TELESCOPE:
        return "small_telescope"
    return "telescope"


def _azimuth_to_direction(az_deg: float) -> str:
    """Convert azimuth to a cardinal/inter-cardinal direction."""
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    # Each sector spans 22.5°. Sector 0 (N) covers 348.75°–11.25°.
    idx = int(((az_deg % 360) + 11.25) / 22.5) % 16
    return dirs[idx]


def _format_time(dt: datetime) -> str:
    """Format a datetime as HH:MM in 24-hour format."""
    return dt.strftime("%H:%M")


def _format_time_range(start: datetime, end: datetime) -> str:
    """Format a time range, handling midnight crossover."""
    return f"{_format_time(start)}-{_format_time(end)}"


# ───────────────────────────────────────────────────────────────────────
# Core service
# ───────────────────────────────────────────────────────────────────────


class ObservationService:
    """Rank observable targets for a given date and location.

    Delegates all astronomical calculations to the specialised services
    (PlanetaryService, SolarService, LunarService, StarService,
    MessierService) and applies a weighted scoring model.
    """

    def __init__(
        self,
        ephemeris,
        planetary_service,
        solar_service,
        lunar_service,
        star_service=None,
        messier_service=None,
    ):
        self.eph = ephemeris
        self.planetary = planetary_service
        self.solar = solar_service
        self.lunar = lunar_service
        self.star = star_service
        self.messier = messier_service

    # ── Public entry point ────────────────────────────────────────────

    def get_observable_tonight(
        self,
        ts,
        date: datetime,
        lat: float,
        lon: float,
        elevation: float = 0.0,
    ) -> dict:
        """Get a ranked list of observable targets for tonight.

        Args:
            ts: Skyfield TimeScale instance.
            date: Civil date (local or UTC — midnight is used as anchor).
            lat: Observer latitude in degrees.
            lon: Observer longitude in degrees.
            elevation: Observer elevation in metres.

        Returns:
            Dict with date, location, summary, ranked targets, and
            observing conditions.
        """
        local_date = date.replace(hour=0, minute=0, second=0, microsecond=0)

        # ── 1. Night-time window ──────────────────────────────────────
        night = self._get_night_window(ts, local_date, lat, lon, elevation)
        if night is None:
            return self._empty_result(date, lat, lon)

        astro_night_start, astro_night_end = night

        # ── 2. Moon conditions ────────────────────────────────────────
        midnight = local_date + timedelta(hours=12)
        moon_phase_info = self.lunar.get_moon_phase(ts, midnight)
        moon_illumination = moon_phase_info.get("illumination_percent", 0.0)

        # ── 3. Score planets ──────────────────────────────────────────
        targets = []
        for planet_data in self._score_all_planets(
            ts, local_date, lat, lon, elevation, astro_night_start, astro_night_end
        ):
            targets.append(planet_data)

        # ── 4. Score stars (if service available) ─────────────────────
        if self.star is not None:
            for star_data in self._score_all_stars(
                ts, local_date, lat, lon, elevation, astro_night_start, astro_night_end
            ):
                targets.append(star_data)

        # ── 5. Score Messier objects (if service available) ───────────
        if self.messier is not None:
            for m_data in self._score_all_messier(
                ts, local_date, lat, lon, elevation, astro_night_start, astro_night_end
            ):
                targets.append(m_data)

        # ── 6. Sort by score descending ───────────────────────────────
        targets.sort(key=lambda t: t["score"], reverse=True)

        # ── 7. Build summary counts ───────────────────────────────────
        naked_eye = sum(1 for t in targets if t["equipment"] == "naked_eye")
        binocular = sum(1 for t in targets if t["equipment"] == "binocular")
        telescope = sum(
            1 for t in targets
            if t["equipment"] in ("small_telescope", "telescope")
        )

        # ── 8. Estimate best observing window ─────────────────────────
        best_window = self._estimate_best_window(
            targets, astro_night_start, astro_night_end
        )

        # ── 9. Darkness hours ─────────────────────────────────────────
        darkness_hours = round(
            (astro_night_end - astro_night_start).total_seconds() / 3600.0, 1
        )
        # Handle overnight wrap
        if darkness_hours < 0:
            darkness_hours += 24.0

        return {
            "date": local_date.strftime("%Y-%m-%d"),
            "location": {"lat": lat, "lon": lon},
            "summary": {
                "total_targets": len(targets),
                "naked_eye": naked_eye,
                "binocular": binocular,
                "telescope": telescope,
                "best_window": best_window,
            },
            "targets": targets,
            "conditions": {
                "moon_phase": moon_phase_info.get("phase_name", "Unknown"),
                "moon_illumination": moon_illumination,
                "darkness_hours": darkness_hours,
                "astronomical_night": {
                    "start": _format_time(astro_night_start),
                    "end": _format_time(astro_night_end),
                },
            },
        }

    # ── Night window helpers ──────────────────────────────────────────

    def _get_night_window(
        self, ts, date: datetime, lat: float, lon: float, elevation: float
    ) -> Optional[tuple]:
        """Return (astro_night_start, astro_night_end) datetimes or None.

        Uses astronomical twilight boundaries (sun <= -18°).
        """
        solar_data = self.solar.get_sunrise_sunset(ts, lat, lon, date, elevation)
        twilight_data = self.solar.get_twilight_periods(
            ts, lat, lon, date, elevation
        )

        astro_evening = twilight_data.get("astronomical_twilight_evening_start")
        astro_morning = twilight_data.get("astronomical_twilight_morning_end")

        if not astro_evening or not astro_morning:
            return None

        start = datetime.fromisoformat(astro_evening)
        end = datetime.fromisoformat(astro_morning)

        # If end is on the next day, add a day so the interval is positive
        if end <= start:
            end += timedelta(days=1)

        return (start, end)

    # ── Planet scoring ────────────────────────────────────────────────

    def _score_all_planets(
        self, ts, date: datetime, lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> list:
        """Score every planet and return a list of result dicts."""
        from core.planetary import PLANET_NAMES

        results = []
        for planet in PLANET_NAMES:
            try:
                scored = self._score_planet(
                    ts, date, planet, lat, lon, elevation,
                    night_start, night_end,
                )
                if scored is not None:
                    results.append(scored)
            except Exception as exc:
                logger.debug("Scoring planet %s failed: %s", planet, exc)
        return results

    def _score_planet(
        self, ts, date: datetime, planet_name: str,
        lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> Optional[dict]:
        """Score a single planet's observability."""
        # Get position at midnight for a reference snapshot
        ref_dt = date.replace(hour=0, minute=0, second=0) + timedelta(hours=12)
        pos = self.planetary.get_planet_position(
            ts, planet_name, lat, lon, ref_dt, elevation
        )
        if pos is None:
            return None

        mag = pos.get("magnitude")
        if mag is None:
            return None

        # ── Scan altitude throughout the night ────────────────────────
        max_alt, best_time, hours_above = self._scan_night_altitude(
            ts, planet_name, lat, lon, elevation, night_start, night_end
        )

        if max_alt < ALT_MINIMUM:
            return None  # Never gets high enough

        # ── Moon separation at best time ──────────────────────────────
        moon_sep = self._moon_separation_at_time(
            ts, planet_name, best_time, lat, lon, elevation
        )

        # ── Compute component scores ──────────────────────────────────
        s_alt = _altitude_score(max_alt)
        s_dark = _clamp(hours_above / 12.0)  # 12 h = perfect
        s_mag = _magnitude_score(mag)
        s_moon = _moon_separation_score(moon_sep)
        s_equip = _equipment_score(mag)

        # ── Weighted total ────────────────────────────────────────────
        total = (
            WEIGHT_MAX_ALTITUDE * s_alt
            + WEIGHT_DARKNESS_TIME * s_dark
            + WEIGHT_BRIGHTNESS * s_mag
            + WEIGHT_MOON_SEP * s_moon
            + WEIGHT_EQUIPMENT * s_equip
        )
        score = round(total * 100, 1)

        # ── Direction from azimuth at best time ───────────────────────
        best_pos = self.planetary.get_planet_position(
            ts, planet_name, lat, lon, best_time, elevation
        )
        direction = _azimuth_to_direction(
            best_pos["azimuth_deg"] if best_pos else 180.0
        )

        # ── Best time window (±1 h around best_time) clipped to night ─
        window_start = max(best_time - timedelta(hours=1), night_start)
        window_end = min(best_time + timedelta(hours=1), night_end)

        # ── Reason string ─────────────────────────────────────────────
        reason = self._build_reason(
            max_alt, hours_above, mag, moon_sep, planet_name
        )

        return {
            "name": pos["name"],
            "category": "planet",
            "score": score,
            "magnitude": round(mag, 2),
            "max_altitude_deg": round(max_alt, 1),
            "best_time": _format_time_range(window_start, window_end),
            "direction": direction,
            "moon_separation_deg": round(moon_sep, 1),
            "equipment": _classify_equipment(mag),
            "reason": reason,
        }

    # ── Star scoring ──────────────────────────────────────────────────

    def _score_all_stars(
        self, ts, date: datetime, lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> list:
        """Score bright stars and return result dicts.

        Only scores stars up to magnitude 6 to keep the list manageable.
        """
        # Sample stars visible at midnight
        ref_dt = date.replace(hour=0, minute=0, second=0) + timedelta(hours=12)
        visible = self.star.get_visible_stars(
            ts, ref_dt, lat, lon, elevation,
            min_altitude=5.0, max_magnitude=6.0,
        )

        results = []
        for star in visible:
            try:
                scored = self._score_star(
                    ts, date, star, lat, lon, elevation,
                    night_start, night_end,
                )
                if scored is not None:
                    results.append(scored)
            except Exception as exc:
                logger.debug("Scoring star %s failed: %s", star["name"], exc)
        return results

    def _score_star(
        self, ts, date: datetime, star_data: dict,
        lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> Optional[dict]:
        """Score a single star's observability."""
        mag = star_data["magnitude"]
        name = star_data["name"]

        # For stars we use a simpler altitude scan: sample at 30-min
        # intervals (stars move predictably, no rise/set lookup needed).
        max_alt, best_time, hours_above = self._scan_star_night(
            ts, name, lat, lon, elevation, night_start, night_end
        )

        if max_alt < ALT_MINIMUM:
            return None

        moon_sep = self._moon_separation_star(
            ts, name, best_time, lat, lon, elevation
        )

        s_alt = _altitude_score(max_alt)
        s_dark = _clamp(hours_above / 12.0)
        s_mag = _magnitude_score(mag)
        s_moon = _moon_separation_score(moon_sep)
        s_equip = _equipment_score(mag)

        total = (
            WEIGHT_MAX_ALTITUDE * s_alt
            + WEIGHT_DARKNESS_TIME * s_dark
            + WEIGHT_BRIGHTNESS * s_mag
            + WEIGHT_MOON_SEP * s_moon
            + WEIGHT_EQUIPMENT * s_equip
        )
        score = round(total * 100, 1)

        # Direction from the star data (azimuth at the reference time)
        direction = _azimuth_to_direction(star_data.get("azimuth_deg", 180.0))

        window_start = max(best_time - timedelta(hours=1), night_start)
        window_end = min(best_time + timedelta(hours=1), night_end)

        reason = self._build_reason(max_alt, hours_above, mag, moon_sep, name)

        return {
            "name": name,
            "category": "star",
            "score": score,
            "magnitude": mag,
            "max_altitude_deg": round(max_alt, 1),
            "best_time": _format_time_range(window_start, window_end),
            "direction": direction,
            "moon_separation_deg": round(moon_sep, 1),
            "equipment": _classify_equipment(mag),
            "reason": reason,
            "constellation": star_data.get("constellation"),
        }

    # ── Messier scoring ───────────────────────────────────────────────

    def _score_all_messier(
        self, ts, date: datetime, lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> list:
        """Score Messier objects and return result dicts."""
        ref_dt = date.replace(hour=0, minute=0, second=0) + timedelta(hours=12)
        visible = self.messier.get_visible_messier(
            ts, ref_dt, lat, lon, elevation,
            min_altitude=10.0, max_magnitude=10.0,
        )

        results = []
        for obj in visible:
            try:
                scored = self._score_messier(
                    ts, date, obj, lat, lon, elevation,
                    night_start, night_end,
                )
                if scored is not None:
                    results.append(scored)
            except Exception as exc:
                logger.debug(
                    "Scoring Messier %s failed: %s", obj["designation"], exc
                )
        return results

    def _score_messier(
        self, ts, date: datetime, messier_data: dict,
        lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> Optional[dict]:
        """Score a single Messier object's observability."""
        mag = messier_data["magnitude"]
        desig = messier_data["designation"]

        max_alt, best_time, hours_above = self._scan_messier_night(
            ts, desig, messier_data, lat, lon, elevation,
            night_start, night_end,
        )

        if max_alt < ALT_MINIMUM:
            return None

        moon_sep = self._moon_separation_messier(
            ts, messier_data, best_time, lat, lon, elevation
        )

        s_alt = _altitude_score(max_alt)
        s_dark = _clamp(hours_above / 12.0)
        s_mag = _magnitude_score(mag)
        s_moon = _moon_separation_score(moon_sep)
        s_equip = _equipment_score(mag)

        total = (
            WEIGHT_MAX_ALTITUDE * s_alt
            + WEIGHT_DARKNESS_TIME * s_dark
            + WEIGHT_BRIGHTNESS * s_mag
            + WEIGHT_MOON_SEP * s_moon
            + WEIGHT_EQUIPMENT * s_equip
        )
        score = round(total * 100, 1)

        direction = _azimuth_to_direction(
            messier_data.get("azimuth_deg", 180.0)
        )

        window_start = max(best_time - timedelta(hours=1), night_start)
        window_end = min(best_time + timedelta(hours=1), night_end)

        reason = self._build_reason(max_alt, hours_above, mag, moon_sep, desig)

        return {
            "name": f"{desig} ({messier_data['type']})",
            "category": "messier",
            "score": score,
            "magnitude": mag,
            "max_altitude_deg": round(max_alt, 1),
            "best_time": _format_time_range(window_start, window_end),
            "direction": direction,
            "moon_separation_deg": round(moon_sep, 1),
            "equipment": _classify_equipment(mag),
            "reason": reason,
            "constellation": messier_data.get("constellation"),
        }

    # ── Altitude scanning helpers ─────────────────────────────────────

    def _scan_night_altitude(
        self, ts, planet_name: str, lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> tuple:
        """Scan a planet's altitude throughout the night.

        Returns (max_altitude, best_time, hours_above_horizon).
        """
        max_alt = 0.0
        best_time = night_start
        above_seconds = 0.0

        dt = night_start
        while dt <= night_end:
            pos = self.planetary.get_planet_position(
                ts, planet_name, lat, lon, dt, elevation
            )
            if pos and pos["altitude_deg"] > 0:
                alt = pos["altitude_deg"]
                above_seconds += SAMPLE_INTERVAL_MIN * 60
                if alt > max_alt:
                    max_alt = alt
                    best_time = dt
            dt += timedelta(minutes=SAMPLE_INTERVAL_MIN)

        hours_above = above_seconds / 3600.0
        return (max_alt, best_time, hours_above)

    def _scan_star_night(
        self, ts, star_name: str, lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> tuple:
        """Scan a star's altitude throughout the night.

        Uses the StarService's observer pattern with a Skyfield Star object.
        Returns (max_altitude, best_time, hours_above_horizon).
        """
        from skyfield.api import Star

        # Look up catalog data
        from core.stars import UNIQUE_STARS
        catalog_entry = None
        for s in UNIQUE_STARS:
            if s[0] == star_name:
                catalog_entry = s
                break
        if catalog_entry is None:
            return (0.0, night_start, 0.0)

        _, _, ra_h, dec_d, _, _, _ = catalog_entry
        star = Star(ra_hours=ra_h, dec_degrees=dec_d)
        observer = self.star._get_observer(lat, lon, elevation)

        max_alt = 0.0
        best_time = night_start
        above_seconds = 0.0

        dt = night_start
        while dt <= night_end:
            try:
                t = ts.from_datetime(dt)
                obs = observer.at(t).observe(star)
                apparent = obs.apparent()
                alt, _, _ = apparent.altaz()
                alt_deg = alt.degrees

                if alt_deg > 0:
                    above_seconds += SAMPLE_INTERVAL_MIN * 60
                    if alt_deg > max_alt:
                        max_alt = alt_deg
                        best_time = dt
            except Exception:
                pass
            dt += timedelta(minutes=SAMPLE_INTERVAL_MIN)

        hours_above = above_seconds / 3600.0
        return (max_alt, best_time, hours_above)

    def _scan_messier_night(
        self, ts, desig: str, messier_data: dict,
        lat: float, lon: float, elevation: float,
        night_start: datetime, night_end: datetime,
    ) -> tuple:
        """Scan a Messier object's altitude throughout the night.

        Returns (max_altitude, best_time, hours_above_horizon).
        """
        from skyfield.api import Star

        # Look up catalog data
        from core.messier import MESSIER_CATALOG
        catalog_entry = None
        for m in MESSIER_CATALOG:
            if m[0] == desig:
                catalog_entry = m
                break
        if catalog_entry is None:
            return (0.0, night_start, 0.0)

        _, _, _, ra_h, dec_d, _, _ = catalog_entry
        obj = Star(ra_hours=ra_h, dec_degrees=dec_d)
        observer = self.messier._get_observer(lat, lon, elevation)

        max_alt = 0.0
        best_time = night_start
        above_seconds = 0.0

        dt = night_start
        while dt <= night_end:
            try:
                t = ts.from_datetime(dt)
                obs = observer.at(t).observe(obj)
                apparent = obs.apparent()
                alt, _, _ = apparent.altaz()
                alt_deg = alt.degrees

                if alt_deg > 0:
                    above_seconds += SAMPLE_INTERVAL_MIN * 60
                    if alt_deg > max_alt:
                        max_alt = alt_deg
                        best_time = dt
            except Exception:
                pass
            dt += timedelta(minutes=SAMPLE_INTERVAL_MIN)

        hours_above = above_seconds / 3600.0
        return (max_alt, best_time, hours_above)

    # ── Moon separation helpers ───────────────────────────────────────

    def _moon_separation_at_time(
        self, ts, planet_name: str, dt: datetime,
        lat: float, lon: float, elevation: float,
    ) -> float:
        """Angular separation (degrees) between a planet and the Moon."""
        try:
            from core.planetary import PLANET_EPHEMERIS_KEY
            eph_key = PLANET_EPHEMERIS_KEY.get(
                planet_name.lower(), planet_name.lower()
            )
            planet_body = self.eph[eph_key]
            t = ts.from_datetime(dt)
            earth = self.eph["earth"]
            moon_vec = earth.at(t).observe(self.lunar.moon)
            planet_vec = earth.at(t).observe(planet_body)
            sep = moon_vec.separation_from(planet_vec)
            return sep.degrees
        except Exception:
            return 180.0  # Default: assume far from Moon

    def _moon_separation_star(
        self, ts, star_name: str, dt: datetime,
        lat: float, lon: float, elevation: float,
    ) -> float:
        """Angular separation (degrees) between a star and the Moon."""
        try:
            from skyfield.api import Star
            from core.stars import UNIQUE_STARS

            catalog_entry = None
            for s in UNIQUE_STARS:
                if s[0] == star_name:
                    catalog_entry = s
                    break
            if catalog_entry is None:
                return 180.0

            _, _, ra_h, dec_d, _, _, _ = catalog_entry
            star = Star(ra_hours=ra_h, dec_degrees=dec_d)
            t = ts.from_datetime(dt)
            earth = self.eph["earth"]
            moon_vec = earth.at(t).observe(self.lunar.moon)
            star_vec = earth.at(t).observe(star)
            sep = moon_vec.separation_from(star_vec)
            return sep.degrees
        except Exception:
            return 180.0

    def _moon_separation_messier(
        self, ts, messier_data: dict, dt: datetime,
        lat: float, lon: float, elevation: float,
    ) -> float:
        """Angular separation (degrees) between a Messier object and the Moon."""
        try:
            from skyfield.api import Star
            from core.messier import MESSIER_CATALOG

            desig = messier_data["designation"]
            catalog_entry = None
            for m in MESSIER_CATALOG:
                if m[0] == desig:
                    catalog_entry = m
                    break
            if catalog_entry is None:
                return 180.0

            _, _, _, ra_h, dec_d, _, _ = catalog_entry
            obj = Star(ra_hours=ra_h, dec_degrees=dec_d)
            t = ts.from_datetime(dt)
            earth = self.eph["earth"]
            moon_vec = earth.at(t).observe(self.lunar.moon)
            obj_vec = earth.at(t).observe(obj)
            sep = moon_vec.separation_from(obj_vec)
            return sep.degrees
        except Exception:
            return 180.0

    # ── Reason builder ────────────────────────────────────────────────

    @staticmethod
    def _build_reason(
        max_alt: float, hours_above: float, mag: float,
        moon_sep: float, name: str,
    ) -> str:
        """Build a human-readable reason string for the score."""
        parts = []

        # Brightness
        if mag < 0:
            parts.append("Very bright")
        elif mag < 2:
            parts.append("Bright")
        elif mag < 4:
            parts.append("Moderately bright")
        elif mag < 7:
            parts.append("Faint, needs dark sky")
        else:
            parts.append("Faint, needs optics")

        # Altitude
        if max_alt > 60:
            parts.append("high in sky")
        elif max_alt > 30:
            parts.append("well placed")
        else:
            parts.append("low on horizon")

        # Time above horizon
        if hours_above > 8:
            parts.append("visible most of the night")
        elif hours_above > 4:
            parts.append("visible several hours")
        else:
            parts.append("brief window")

        # Moon
        if moon_sep > 90:
            parts.append("far from Moon")
        elif moon_sep > 45:
            parts.append("moderate moon distance")
        else:
            parts.append("near Moon, sky glow possible")

        return ", ".join(parts)

    # ── Best window estimator ─────────────────────────────────────────

    @staticmethod
    def _estimate_best_window(
        targets: list, night_start: datetime, night_end: datetime,
    ) -> dict:
        """Estimate the best observing window from scored targets.

        Uses the top-scoring targets to find the overlap of their
        best-time windows.
        """
        if not targets:
            return {"start": _format_time(night_start),
                    "end": _format_time(night_end)}

        # Take top 5 targets (or fewer)
        top = targets[:5]

        # Collect best_time midpoints
        times = []
        for t in top:
            # Parse the best_time string back to a datetime
            try:
                parts = t["best_time"].split("-")
                start_h, start_m = map(int, parts[0].split(":"))
                end_h, end_m = map(int, parts[1].split(":"))
                mid_minutes = (
                    (start_h * 60 + start_m + end_h * 60 + end_m) / 2
                )
                times.append(mid_minutes)
            except Exception:
                continue

        if not times:
            return {"start": _format_time(night_start),
                    "end": _format_time(night_end)}

        avg_minutes = sum(times) / len(times)
        avg_hour = int(avg_minutes) // 60
        avg_min = int(avg_minutes) % 60

        # Window is ±2 hours around the average best time
        from datetime import time
        center = night_start.replace(hour=avg_hour, minute=avg_min)
        window_start = center - timedelta(hours=2)
        window_end = center + timedelta(hours=2)

        # Clamp to night window
        window_start = max(window_start, night_start)
        window_end = min(window_end, night_end)

        return {
            "start": _format_time(window_start),
            "end": _format_time(window_end),
        }

    # ── Empty result fallback ─────────────────────────────────────────

    @staticmethod
    def _empty_result(date: datetime, lat: float, lon: float) -> dict:
        """Return an empty result when no astronomical night exists."""
        return {
            "date": date.strftime("%Y-%m-%d"),
            "location": {"lat": lat, "lon": lon},
            "summary": {
                "total_targets": 0,
                "naked_eye": 0,
                "binocular": 0,
                "telescope": 0,
                "best_window": {"start": "N/A", "end": "N/A"},
            },
            "targets": [],
            "conditions": {
                "moon_phase": "Unknown",
                "moon_illumination": 0.0,
                "darkness_hours": 0.0,
                "astronomical_night": {"start": "N/A", "end": "N/A"},
            },
        }
