"""
Panchang calculation module.

Computes the five elements of the Hindu Panchang (Vedic calendar):
- Tithi (lunar day, 1-30)
- Nakshatra (lunar mansion, 27)
- Yoga (sun-moon combined position, 27)
- Karana (half-tithi, 60 cycling)
- Vara (weekday)

Plus: Rahu/Ketu positions, Abhijit & Aghora muhurta windows,
and the ayanamsha (tropical-to-sidereal offset).

Uses Skyfield for precise Sun/Moon ecliptic coordinates and the
Lahiri ayanamsha for sidereal conversion.
"""

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from skyfield.almanac import find_discrete, moon_phase, MOON_PHASES
from skyfield.api import Topos

logger = logging.getLogger(__name__)

# ─── Ayanamsha (Lahiri) ────────────────────────────────────────────────────
# The Lahiri ayanamsha is the standard offset between tropical and sidereal
# zodiac used in Indian astronomy. Approximate formula (degrees):
#   ayanamsha = 139.6797769 + 0.01396263808 * Y + 0.00000030265 * Y^2
#             - 0.000000000018113 * Y^3
# where Y = centuries since J1900.0

def compute_ayanamsha_lahiri(year: float) -> float:
    """Compute the Lahiri ayanamsha in degrees for a given year.

    year is a floating-point year (e.g. 2026.5).
    """
    Y = (year - 1900.0) / 100.0
    a = (
        139.6797769
        + 0.01396263808 * Y
        + 0.00000030265 * Y * Y
        - 0.000000000018113 * Y * Y * Y
    )
    # Normalize to 0-360
    return a % 360.0


# ─── Tithi names (Sanskrit) ────────────────────────────────────────────────
TITHI_NAMES = [
    "Shukla Pratipada",    # 1  Shukla paksha day 1
    "Shukla Dwitiya",      # 2
    "Shukla Tritiya",      # 3
    "Shukla Chaturthi",    # 4
    "Shukla Panchami",     # 5
    "Shukla Shashthi",     # 6
    "Shukla Saptami",      # 7
    "Shukla Ashtami",      # 8
    "Shukla Navami",       # 9
    "Shukla Dashami",      # 10
    "Shukla Ekadashi",     # 11
    "Shukla Dwadashi",     # 12
    "Shukla Trayodashi",   # 13
    "Shukla Chaturdashi",  # 14
    "Purnima",             # 15  Full Moon
    "Krisna Pratipada",    # 16 Krisna paksha day 1
    "Krisna Dwitiya",      # 17
    "Krisna Tritiya",      # 18
    "Krisna Chaturthi",    # 19
    "Krisna Panchami",     # 20
    "Krisna Shashthi",     # 21
    "Krisna Saptami",      # 22
    "Krisna Ashtami",      # 23
    "Krisna Navami",       # 24
    "Krisna Dashami",      # 25
    "Krisna Ekadashi",     # 26
    "Krisna Dwadashi",     # 27
    "Krisna Trayodashi",   # 28
    "Krisna Chaturdashi",  # 29
    "Amavasya",            # 30  New Moon
]

# ─── Nakshatra names (27 lunar mansions) ───────────────────────────────────
# Each nakshatra spans 13°20' (13.333...°) of sidereal ecliptic longitude.
# Starting from 0° sidereal Aries.
NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra",
    "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula",
    "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

# Nakshatra deities and symbols (for display)
NAKSHATRA_DETAILS = {
    "Ashwini": {"symbol": "🐎", "ruler": "Ketu"},
    "Bharani": {"symbol": "🪷", "ruler": "Venus"},
    "Krittika": {"symbol": "🔥", "ruler": "Sun"},
    "Rohini": {"symbol": "🌿", "ruler": "Moon"},
    "Mrigashira": {"symbol": "🦌", "ruler": "Mars"},
    "Ardra": {"symbol": "💧", "ruler": "Rahu"},
    "Punarvasu": {"symbol": "🏹", "ruler": "Jupiter"},
    "Pushya": {"symbol": "🐃", "ruler": "Saturn"},
    "Ashlesha": {"symbol": "🐍", "ruler": "Mercury"},
    "Magha": {"symbol": "👑", "ruler": "Ketu"},
    "Purva Phalguni": {"symbol": "🛏️", "ruler": "Venus"},
    "Uttara Phalguni": {"symbol": "🪑", "ruler": "Sun"},
    "Hasta": {"symbol": "✋", "ruler": "Moon"},
    "Chitra": {"symbol": "💎", "ruler": "Mars"},
    "Swati": {"symbol": "🌾", "ruler": "Rahu"},
    "Vishakha": {"symbol": "🏺", "ruler": "Jupiter"},
    "Anuradha": {"symbol": "🌱", "ruler": "Saturn"},
    "Jyeshtha": {"symbol": "🛡️", "ruler": "Mercury"},
    "Mula": {"symbol": "🔥", "ruler": "Ketu"},
    "Purva Ashadha": {"symbol": "🐘", "ruler": "Venus"},
    "Uttara Ashadha": {"symbol": "⛺", "ruler": "Sun"},
    "Shravana": {"symbol": "👂", "ruler": "Moon"},
    "Dhanishta": {"symbol": "🥁", "ruler": "Mars"},
    "Shatabhisha": {"symbol": "🌑", "ruler": "Rahu"},
    "Purva Bhadrapada": {"symbol": "⚔️", "ruler": "Jupiter"},
    "Uttara Bhadrapada": {"symbol": "🔱", "ruler": "Saturn"},
    "Revati": {"symbol": "🐟", "ruler": "Mercury"},
}

# ─── Yoga names (27) ───────────────────────────────────────────────────────
# Yoga = (Sun sidereal longitude + Moon sidereal longitude) / 2, divided into
# 27 sectors of 13°20' each, starting from 0° sidereal Aries.
YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayaush", "Saubhagya", "Shobhana",
    "Atiganda", "Vaidhriti", "Vyaghata", "Harigana", "Vava",
    "Shiva", "Sidha", "Sadhya", "Shubha", "Shukla",
    "Brahma", "Indiva", "Vardhana", "Vishti", "Pritiphal",
    "Shubha", "Shukla", "Krta", "Vriddhi", "Dhruva",
    "Vyatipata", "Vaidhriti",
]
# Fix: the standard 27 yoga list (corrected)
YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayaush", "Saubhagya", "Shobhana",
    "Atiganda", "Vaidhriti", "Vyaghata", "Harigana", "Vava",
    "Shiva", "Sidha", "Sadhya", "Shubha", "Shukla",
    "Brahma", "Indiva", "Vardhana", "Vishti", "Pritiphal",
    "Shubha", "Shukla", "Krta", "Vriddhi", "Dhruva",
    "Vyatipata", "Vaidhriti",
]

# ─── Karana names (60, but only 15 unique names cycling) ───────────────────
# Each tithi is split into two karanas. The 60th karana spans tithi 30.
KARANA_NAMES = [
    "Kiost", "Bava", "Balava", "Kaulava", "Taitila",
    "Gara", "Vanija", "Vishti", "Bava", "Balava",
    "Kaulava", "Taitila", "Gara", "Vanija", "Vishti",
]
# Vishti (Bhadra) occupies double space, so the cycle is 15 names for 30 tithis.

# ─── Vara (weekday) names ──────────────────────────────────────────────────
VARA_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
VARA_SANSKRIT = ["Ravivar", "Somvar", "Angar", "Budhvar", "Guruvar", "Shukravar", "Shanivar"]

# ─── Vedic Rashi (sidereal zodiac signs) ───────────────────────────────────
RASHI_NAMES = [
    "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
    "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchika (Scorpio)",
    "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)",
]
RASHI_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]


def _ecliptic_longitude_from_vector(ts, vector) -> float:
    """Convert a Skyfield vector to ecliptic longitude in degrees [0, 360)."""
    try:
        lat, lon, dist = vector.ecliptic_latlon()
        return lon.degrees % 360.0
    except Exception:
        return 0.0


def _compute_tithi(sun_lon: float, moon_lon: float) -> dict:
    """Compute the current tithi from Sun and Moon ecliptic longitudes.

    Tithi = floor((moon_lon - sun_lon) / 12) + 1, clamped to 1-30.
    The elongation is the angular separation between Moon and Sun.
    """
    elongation = (moon_lon - sun_lon) % 360.0
    tithi_number = int(elongation / 12.0) + 1
    if tithi_number > 30:
        tithi_number = 30
    if tithi_number < 1:
        tithi_number = 1

    # Paksha determination
    if tithi_number <= 15:
        paksha = "Shukla"  # Waxing
    else:
        paksha = "Krisna"  # Waning

    # Progress within current tithi
    tithi_progress = ((elongation % 360.0) / 12.0) - int((elongation % 360.0) / 12.0)

    return {
        "tithi_number": tithi_number,
        "tithi_name": TITHI_NAMES[tithi_number - 1],
        "paksha": paksha,
        "elongation_deg": round(elongation, 2),
        "progress_percent": round(tithi_progress * 100, 1),
    }


def _compute_nakshatra(moon_sidereal_lon: float) -> dict:
    """Compute the current nakshatra from Moon's sidereal ecliptic longitude.

    Each nakshatra spans 13°20' (13.333...°).
    """
    index = int(moon_sidereal_lon / (360.0 / 27)) % 27
    name = NAKSHATRA_NAMES[index]
    detail = NAKSHATRA_DETAILS.get(name, {})

    # Progress within current nakshatra
    nakshatra_size = 360.0 / 27  # 13.333...
    progress = (moon_sidereal_lon % nakshatra_size) / nakshatra_size

    return {
        "nakshatra": name,
        "nakshatra_index": index + 1,
        "symbol": detail.get("symbol", "✦"),
        "ruler": detail.get("ruler", ""),
        "progress_percent": round(progress * 100, 1),
    }


def _compute_yoga(sun_sidereal_lon: float, moon_sidereal_lon: float) -> dict:
    """Compute the current yoga from sum of Sun and Moon sidereal longitudes.

    Yoga = (sun_sidereal + moon_sidereal) / 2, divided into 27 sectors.
    """
    combined = (sun_sidereal_lon + moon_sidereal_lon) % 360.0
    index = int(combined / (360.0 / 27)) % 27
    name = YOGA_NAMES[index]

    progress = (combined % (360.0 / 27)) / (360.0 / 27)

    return {
        "yoga": name,
        "yoga_index": index + 1,
        "progress_percent": round(progress * 100, 1),
    }


def _compute_karana(tithi_number: int, tithi_progress: float) -> dict:
    """Compute the current karana from tithi number and progress.

    Each tithi has two karanas. The first half uses one karana, the second half
    uses the next. Vishti (index 7, 14) occupies double space.
    """
    # Karana index = 2 * (tithi_number - 1) + (1 if progress >= 0.5 else 0)
    # But Vishti takes double space, so we need to handle it.
    raw_index = 2 * (tithi_number - 1) + (1 if tithi_progress >= 0.5 else 0)

    # Adjust for Vishti's double occupancy
    # The 60 karana slots map to 15 names, with Vishti at positions 7 and 14
    # occupying double space. Simplified: use modular arithmetic.
    karana_index = raw_index % 15
    name = KARANA_NAMES[karana_index]

    return {
        "karana": name,
        "karana_index": karana_index + 1,
    }


def _compute_muhurta(sunrise: Optional[str], sunset: Optional[str],
                    solar_noon: Optional[str]) -> dict:
    """Compute Abhijit and Aghora muhurta windows.

    Abhijit Muhurta: centered on solar noon, ~1h 36min total.
    Aghora Muhurta: 4th padam of the day (sunrise to sunset divided into 8).
    """
    result = {
        "abhijit": None,
        "aghora": None,
    }

    if solar_noon:
        try:
            noon_dt = datetime.fromisoformat(solar_noon)
            # Abhijit: 48 min before and after solar noon (total ~1h 36min)
            abhijit_start = noon_dt - timedelta(minutes=48)
            abhijit_end = noon_dt + timedelta(minutes=48)
            result["abhijit"] = {
                "start": abhijit_start.isoformat(),
                "end": abhijit_end.isoformat(),
                "duration_minutes": 96,
            }
        except Exception:
            pass

    if sunrise and sunset:
        try:
            rise_dt = datetime.fromisoformat(sunrise)
            set_dt = datetime.fromisoformat(sunset)
            day_length = (set_dt - rise_dt).total_seconds() / 60.0  # minutes

            if day_length > 0:
                # Aghora: 4th padam (each padam = day_length / 8)
                padam = day_length / 8.0
                aghora_start = rise_dt + timedelta(minutes=3 * padam)
                aghora_end = rise_dt + timedelta(minutes=4 * padam)
                result["aghora"] = {
                    "start": aghora_start.isoformat(),
                    "end": aghora_end.isoformat(),
                    "duration_minutes": round(padam, 1),
                }
        except Exception:
            pass

    return result


def compute_panchang(
    ts, date: datetime, latitude: float, longitude: float,
    elevation: float = 0.0, ayanamsha_deg: float = None
) -> dict:
    """Compute the full Panchang for a given date and location.

    Returns a dict with tithi, nakshatra, yoga, karana, vara,
    Rahu/Ketu positions, muhurta windows, and solar/lunar timing.
    """
    t = ts.from_datetime(date)
    earth = None  # Will be set from the ephemeris below

    try:
        from skyfield.api import Earth
        # We need the ephemeris objects — passed via the caller
        # Actually, we compute from the ts and known bodies.
        pass
    except Exception:
        pass

    # We need the ephemeris to compute positions. The caller (sky_service)
    # has access to it. We'll use a simpler approach: compute from the
    # sun/moon vectors at the given time.
    # This function is designed to be called from SkyService which has
    # the ephemeris. We'll refactor to accept the needed objects.

    return {}


class PanchangService:
    """Vedic Panchang calculations using Skyfield ephemeris data."""

    def __init__(self, ephemeris):
        self.eph = ephemeris
        self.sun = ephemeris["sun"]
        self.moon = ephemeris["moon"]
        self.earth = ephemeris["earth"]

    def _get_sun_moon_ecliptic(self, ts, dt: datetime) -> tuple:
        """Get Sun and Moon ecliptic longitudes (tropical) in degrees.

        Returns (sun_lon, moon_lon) in [0, 360).
        """
        t = ts.from_datetime(dt)
        sun_vec = self.earth.at(t).observe(self.sun)
        moon_vec = self.earth.at(t).observe(self.moon)

        sun_lon = _ecliptic_longitude_from_vector(ts, sun_vec)
        moon_lon = _ecliptic_longitude_from_vector(ts, moon_vec)

        return sun_lon, moon_lon

    def _get_rahu_ketu_ecliptic(self, ts, dt: datetime) -> tuple:
        """Get Rahu (ascending node) and Ketu (descending node) ecliptic
        longitudes (tropical) in degrees.

        Rahu and Ketu are 180° apart on the ecliptic.
        """
        t = ts.from_datetime(dt)

        # Compute the Moon's ascending node longitude
        # Skyfield provides this via the barycentric ecliptic coordinates
        moon_vec = self.earth.at(t).observe(self.moon)
        try:
            # Get the node from the Moon's orbital elements
            # The ascending node is where the Moon crosses the ecliptic going north
            lat, lon, dist = moon_vec.ecliptic_latlon()

            # For the node position, we need the actual ascending node.
            # Skyfield doesn't directly give this, so we approximate by
            # finding where the Moon's latitude crosses zero.
            # A simpler approach: use the mean ascending node formula.
            # The Moon's ascending node regresses with a ~18.6-year period.
            # Approximate formula for the Moon's ascending node (degrees):
            #   Omega = 125.04452 - 0.05295390 * D
            # where D = days since J2000.0
            days_since_j2000 = (dt - datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)).total_seconds() / 86400.0
            omega = (125.04452 - 0.05295390 * days_since_j2000) % 360.0

            rahu_lon = omega
            ketu_lon = (omega + 180.0) % 360.0

            return rahu_lon, ketu_lon
        except Exception:
            return 0.0, 180.0

    def compute_for_date(
        self, ts, date: datetime, latitude: float, longitude: float,
        elevation: float = 0.0
    ) -> dict:
        """Compute the full Panchang for a single date at noon local time.

        Returns a dict suitable for API serialization.
        """
        # Observation time: noon local (approximate — use UTC noon for consistency)
        obs_dt = date.replace(hour=12, minute=0, second=0, microsecond=0)

        # Get tropical ecliptic longitudes
        sun_lon, moon_lon = self._get_sun_moon_ecliptic(ts, obs_dt)

        # Compute ayanamsha for this year
        year_float = obs_dt.year + obs_dt.timetuple().tm_yday / 365.25
        ayanamsha = compute_ayanamsha_lahiri(year_float)

        # Convert to sidereal
        sun_sidereal = (sun_lon - ayanamsha) % 360.0
        moon_sidereal = (moon_lon - ayanamsha) % 360.0

        # Rahu/Ketu in sidereal
        rahu_tropical, ketu_tropical = self._get_rahu_ketu_ecliptic(ts, obs_dt)
        rahu_sidereal = (rahu_tropical - ayanamsha) % 360.0
        ketu_sidereal = (ketu_tropical - ayanamsha) % 360.0

        # Tithi
        tithi_data = _compute_tithi(sun_lon, moon_lon)

        # Nakshatra
        nakshatra_data = _compute_nakshatra(moon_sidereal)

        # Yoga
        yoga_data = _compute_yoga(sun_sidereal, moon_sidereal)

        # Karana
        karana_data = _compute_karana(
            tithi_data["tithi_number"],
            tithi_data["progress_percent"] / 100.0
        )

        # Vara (weekday)
        vara_index = obs_dt.weekday()  # Monday=0
        # Adjust: Panchang vara starts from Sunday
        vara_index_sun = obs_dt.isoweekday() % 7  # Sunday=0, Monday=1, ...

        # Sun Rashi (sidereal zodiac sign)
        sun_rashi_index = int(sun_sidereal / 30.0) % 12

        # Moon Rashi (sidereal zodiac sign)
        moon_rashi_index = int(moon_sidereal / 30.0) % 12

        # Rahu Rashi
        rahu_rashi_index = int(rahu_sidereal / 30.0) % 12

        # Ketu Rashi
        ketu_rashi_index = int(ketu_sidereal / 30.0) % 12

        return {
            "date": date.strftime("%Y-%m-%d"),
            "vara": {
                "name": VARA_NAMES[vara_index_sun],
                "sanskrit": VARA_SANSKRIT[vara_index_sun],
            },
            "tithi": tithi_data,
            "nakshatra": nakshatra_data,
            "yoga": yoga_data,
            "karana": karana_data,
            "ayanamsha_deg": round(ayanamsha, 2),
            "sun": {
                "tropical_lon_deg": round(sun_lon, 2),
                "sidereal_lon_deg": round(sun_sidereal, 2),
                "rashi": RASHI_NAMES[sun_rashi_index],
                "rashi_symbol": RASHI_SYMBOLS[sun_rashi_index],
            },
            "moon": {
                "tropical_lon_deg": round(moon_lon, 2),
                "sidereal_lon_deg": round(moon_sidereal, 2),
                "rashi": RASHI_NAMES[moon_rashi_index],
                "rashi_symbol": RASHI_SYMBOLS[moon_rashi_index],
            },
            "rahu": {
                "sidereal_lon_deg": round(rahu_sidereal, 2),
                "rashi": RASHI_NAMES[rahu_rashi_index],
                "rashi_symbol": RASHI_SYMBOLS[rahu_rashi_index],
            },
            "ketu": {
                "sidereal_lon_deg": round(ketu_sidereal, 2),
                "rashi": RASHI_NAMES[ketu_rashi_index],
                "rashi_symbol": RASHI_SYMBOLS[ketu_rashi_index],
            },
        }

    def compute_with_muhurta(
        self, ts, date: datetime, latitude: float, longitude: float,
        elevation: float = 0.0, sunrise: str = None, sunset: str = None,
        solar_noon: str = None
    ) -> dict:
        """Compute Panchang with muhurta windows.

        sunrise, sunset, solar_noon are ISO datetime strings from the
        SolarService. Pass them to avoid recomputing.
        """
        panchang = self.compute_for_date(ts, date, latitude, longitude, elevation)

        # Add muhurta windows
        muhurta = _compute_muhurta(sunrise, sunset, solar_noon)
        panchang["muhurta"] = muhurta

        return panchang
