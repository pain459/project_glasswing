"""
Sky events module.

Calculates:
- Milky Way / galactic center visibility and transit
- Meteor shower activity windows
- Moon constellation and distance context
- Seasonal and day-of-year information
- Solar declination
- General sky events for the day
"""

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from skyfield.api import Topos

logger = logging.getLogger(__name__)

# ─── Galactic center (Sagittarius A*) approximate J2000 coords ──────────────
GALACTIC_CENTER_RA = 266.4051  # degrees
GALACTIC_CENTER_DEC = -29.0078  # degrees

# ─── Meteor shower database (approximate active windows) ────────────────────
METEOR_SHOWERS = [
    {"name": "Quadrantids", "peak": "2026-01-03", "start": "2026-01-01", "end": "2026-01-06", "zhr": 120},
    {"name": "Lyrids", "peak": "2026-04-22", "start": "2026-04-16", "end": "2026-04-26", "zhr": 18},
    {"name": "Eta Aquariids", "peak": "2026-05-06", "start": "2026-04-19", "end": "2026-05-28", "zhr": 50},
    {"name": "Delta Aquariids", "peak": "2026-07-30", "start": "2026-07-12", "end": "2026-08-23", "zhr": 35},
    {"name": "Perseids", "peak": "2026-08-12", "start": "2026-07-17", "end": "2026-08-24", "zhr": 100},
    {"name": "Draconids", "peak": "2026-10-08", "start": "2026-10-06", "end": "2026-10-10", "zhr": 10},
    {"name": "Orionids", "peak": "2026-10-21", "start": "2026-10-02", "end": "2026-10-07", "zhr": 20},
    {"name": "Leonids", "peak": "2026-11-17", "start": "2026-11-06", "end": "2026-11-30", "zhr": 15},
    {"name": "Geminids", "peak": "2026-12-14", "start": "2026-12-04", "end": "2026-12-20", "zhr": 150},
    {"name": "Ursids", "peak": "2026-12-22", "start": "2026-12-17", "end": "2026-12-26", "zhr": 10},
]

# ─── Astronomical facts database ────────────────────────────────────────────
ASTRONOMICAL_FACTS = [
    # January
    {"month": 1, "day": 1, "fact": "New Year's Day often offers clear skies as atmospheric turbulence settles after the holidays."},
    {"month": 1, "day": 4, "fact": "Proxima Centauri, our nearest stellar neighbor at 4.24 light-years, is invisible to the naked eye (mag 11.13)."},
    {"month": 1, "day": 3, "fact": "The Quadrantid meteor shower peaks tonight with up to 120 meteors per hour."},
    {"month": 1, "day": 15, "fact": "Jupiter is at opposition around this time — its closest and brightest approach to Earth."},
    # February
    {"month": 2, "day": 2, "fact": "Groundhog Day: In astronomy, we look to the ground for perihelion — Earth's closest approach to the Sun."},
    {"month": 2, "day": 14, "fact": "Saturn's rings are tilted at about 26.7° to the ecliptic, making them spectacular through a small telescope."},
    {"month": 2, "day": 28, "fact": "The Andromeda Galaxy (M31) is 2.5 million light-years away and approaching us at 110 km/s."},
    # March
    {"month": 3, "day": 1, "fact": "The vernal equinox marks the Sun crossing the celestial equator — day and night are nearly equal."},
    {"month": 3, "day": 14, "fact": "Pi Day: The ratio of a circle's circumference to its diameter appears everywhere in orbital mechanics."},
    {"month": 3, "day": 20, "fact": "Spring equinox: The Milky Way begins rising in the east after sunset, revealing the galactic center."},
    # April
    {"month": 4, "day": 22, "fact": "The Lyrid meteor shower peaks with stones from comet C/1861 G1 Thatcher."},
    {"month": 4, "day": 15, "fact": "Saturn and Jupiter often appear close together in April skies — a 'planet parade'."},
    {"month": 4, "day": 30, "fact": "The Pleiades (M45) are best visible in April — a cluster of ~1,000 stars within 130 light-years."},
    # May
    {"month": 5, "day": 5, "fact": "Star Wars Day: The observable universe contains an estimated 2 trillion galaxies."},
    {"month": 5, "day": 6, "fact": "The Eta Aquariids peak with meteors from Halley's Comet debris stream."},
    {"month": 5, "day": 20, "fact": "Mercury is at its greatest eastern elongation — the best time to spot it before sunset."},
    # June
    {"month": 6, "day": 15, "fact": "The Summer Triangle (Vega, Deneb, Altair) dominates the evening sky."},
    {"month": 6, "day": 21, "fact": "Summer solstice: The longest day in the Northern Hemisphere. The Sun reaches its highest declination."},
    {"month": 6, "day": 30, "fact": "The Milky Way's core is visible all night long from mid-latitudes in June."},
    # July
    {"month": 7, "day": 4, "fact": "Independence Day fireworks compete with the Delta Aquariid meteor shower."},
    {"month": 7, "day": 20, "fact": "The Great Bear (Ursa Major) circles the North Pole star — a circumpolar constellation."},
    {"month": 7, "day": 28, "fact": "Apollo 11 landed on the Moon on July 20, 1969 — humanity's first steps on another world."},
    # August
    {"month": 8, "day": 12, "fact": "The Perseids peak — the most popular meteor shower, with up to 100 meteors per hour."},
    {"month": 8, "day": 1, "fact": "The Milky Way is at its most spectacular in August, arching from east to west."},
    {"month": 8, "day": 24, "fact": "UFO Day: The Roswell incident occurred on July 8, 1947, but August skies are best for stargazing."},
    # September
    {"month": 9, "day": 1, "fact": "The Diphda star in Cetus is the brightest star not in the main sequence classification."},
    {"month": 9, "day": 22, "fact": "Autumn equinox: Day and night are equal. The Milky Way begins to set earlier each evening."},
    {"month": 9, "day": 14, "fact": "Saturn's rings appear edge-on every 15 years — the 'ring eclipse' is coming in 2025."},
    # October
    {"month": 10, "day": 4, "fact": "World Space Flight Day: The X-1 broke the sound barrier on October 14, 1947."},
    {"month": 10, "day": 15, "fact": "The Orionid meteor shower peaks — debris from Halley's Comet, just like the Aquariids."},
    {"month": 10, "day": 20, "fact": "World Statistics Day: The Hubble Constant is measured at ~67.4 km/s/Mpc by Planck satellite."},
    # November
    {"month": 11, "day": 1, "fact": "The Leonid meteor storm of 1966 produced 144,000 meteors per hour — the greatest on record."},
    {"month": 11, "day": 10, "fact": "World Science Day: The James Webb Space Telescope orbits at L2, 1.5 million km from Earth."},
    {"month": 11, "day": 17, "fact": "The Leonids peak tonight. Look for radiant near the head of Leo."},
    {"month": 11, "day": 20, "fact": "Thanksgiving (US): The Moon often appears large and bright — the 'Full Beaver Moon'."},
    # December
    {"month": 12, "day": 14, "fact": "The Geminids peak — the richest meteor shower, with up to 150 meteors per hour."},
    {"month": 12, "day": 21, "fact": "Winter solstice: The shortest day. The Sun reaches its lowest declination at -23.44°."},
    {"month": 12, "day": 25, "fact": "Christmas Day: Jupiter and Saturn often appear close together in December skies."},
]

# Generic facts when no date-specific fact is found
GENERIC_FACTS = [
    "The Milky Way galaxy is approximately 100,000 light-years in diameter and contains 100-400 billion stars.",
    "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
    "The nearest galaxy to the Milky Way is the Large Magellanic Cloud at 163,000 light-years.",
    "A neutron star can spin up to 716 times per second.",
    "The cosmic microwave background is the oldest light in the universe, from 380,000 years after the Big Bang.",
    "Venus rotates backwards compared to most planets — the Sun rises in the west there.",
    "Saturn's density is less than water — it would float if you could find a big enough ocean.",
    "The Earth's atmosphere scatters blue light more than red, giving us blue skies and red sunsets.",
    "There are more stars in the observable universe than grains of sand on all of Earth's beaches.",
    "The Voyager 1 probe, launched in 1977, is the farthest human-made object from Earth.",
    "Black holes can be detected by the gravitational effect they have on nearby stars and gas.",
    "The Moon is drifting away from Earth at about 3.8 cm per year.",
    "Jupiter's Great Red Spot is a storm larger than Earth that has been raging for at least 350 years.",
    "The temperature at the center of the Sun is about 15 million degrees Celsius.",
    "One day on Venus is longer than one year on Venus (243 Earth days vs 225 Earth days).",
]


class EventsService:
    """Sky events, Milky Way visibility, and astronomical facts."""

    def __init__(self, ephemeris):
        self.eph = ephemeris
        self.sun = ephemeris["sun"]
        self.earth = ephemeris["earth"]
        self.moon = ephemeris["moon"]

    def _get_observer(self, latitude: float, longitude: float, elevation: float = 0.0):
        """Create a topocentric observer."""
        topos = Topos(
            latitude_degrees=latitude,
            longitude_degrees=longitude,
            elevation_m=elevation,
        )
        return self.earth + topos

    # ─── Solar Declination ─────────────────────────────────────────────

    def get_solar_declination(self, ts, dt: datetime) -> dict:
        """Get solar declination and equation of time for a date."""
        t = ts.from_datetime(dt)
        geo = self.earth.at(t).observe(self.sun)
        ra, dec, _ = geo.radec()

        # Equation of time approximation
        # EoT = 4 * (Y - equation_of_time_minutes) where Y is the mean solar time
        day_of_year = dt.timetuple().tm_yday
        # Simplified EoT formula (minutes)
        B = 2 * math.pi * (day_of_year - 81) / 365
        eq_time = (
            9.87 * math.sin(2 * B)
            - 7.53 * math.cos(B)
            - 1.5 * math.sin(B)
        )

        return {
            "solar_declination_deg": round(dec.degrees, 2),
            "right_ascension_hours": round(ra.hours, 4),
            "equation_of_time_minutes": round(eq_time, 1),
            "season": self._get_season(dt),
            "day_of_year": day_of_year,
        }

    def _get_season(self, dt: datetime) -> str:
        """Determine the season for a date (Northern Hemisphere)."""
        month = dt.month
        day = dt.day
        if (month, day) < (3, 20):
            return "winter"
        elif (month, day) < (6, 21):
            return "spring"
        elif (month, day) < (9, 22):
            return "summer"
        elif (month, day) < (12, 21):
            return "autumn"
        return "winter"

    # ─── Moon Constellation & Distance ─────────────────────────────────

    # Simplified constellation boundaries (RA/Dec boxes for major constellations
    # along the ecliptic — the zodiac plus Orion which is prominent)
    CONSTELLATIONS = [
        {"name": "Aries", "ra_min": 20.5, "ra_max": 23.5, "dec_min": -8, "dec_max": 24},
        {"name": "Taurus", "ra_min": 23.5, "ra_max": 2.5, "dec_min": -6, "dec_max": 28},
        {"name": "Gemini", "ra_min": 2.5, "ra_max": 6.0, "dec_min": -2, "dec_max": 33},
        {"name": "Cancer", "ra_min": 6.0, "ra_max": 8.8, "dec_min": 5, "dec_max": 33},
        {"name": "Leo", "ra_min": 8.8, "ra_max": 12.0, "dec_min": -8, "dec_max": 33},
        {"name": "Virgo", "ra_min": 12.0, "ra_max": 15.5, "dec_min": -12, "dec_max": 12},
        {"name": "Libra", "ra_min": 15.5, "ra_max": 17.5, "dec_min": -15, "dec_max": 8},
        {"name": "Scorpius", "ra_min": 17.5, "ra_max": 19.5, "dec_min": -35, "dec_max": 5},
        {"name": "Sagittarius", "ra_min": 19.5, "ra_max": 22.0, "dec_min": -45, "dec_max": -5},
        {"name": "Capricornus", "ra_min": 22.0, "ra_max": 23.8, "dec_min": -25, "dec_max": 5},
        {"name": "Aquarius", "ra_min": 23.8, "ra_max": 2.5, "dec_min": -18, "dec_max": 15},
        {"name": "Pisces", "ra_min": 0.0, "ra_max": 2.5, "dec_min": -3, "dec_max": 18},
        {"name": "Pisces", "ra_min": 20.5, "ra_max": 24.0, "dec_min": -3, "dec_max": 18},
        {"name": "Orion", "ra_min": 4.5, "ra_max": 7.0, "dec_min": -12, "dec_max": 22},
        {"name": "Ophiuchus", "ra_min": 16.0, "ra_max": 18.5, "dec_min": -20, "dec_max": 10},
    ]

    def _get_constellation_for_radec(self, ra_hours: float, dec_deg: float) -> str:
        """Look up the constellation for a given RA/Dec position."""
        for c in self.CONSTELLATIONS:
            if c["ra_min"] < c["ra_max"]:
                if c["ra_min"] <= ra_hours < c["ra_max"]:
                    if c["dec_min"] <= dec_deg <= c["dec_max"]:
                        return c["name"]
            else:
                if ra_hours >= c["ra_min"] or ra_hours < c["ra_max"]:
                    if c["dec_min"] <= dec_deg <= c["dec_max"]:
                        return c["name"]
        return "Unknown"

    def get_moon_constellation(self, ts, dt: datetime) -> str:
        """Get the constellation the Moon is in at a given time."""
        t = ts.from_datetime(dt)
        geo = self.earth.at(t).observe(self.moon)
        ra, dec, _ = geo.radec()
        return self._get_constellation_for_radec(ra.hours, dec.degrees)

    def get_sun_constellation(self, ts, dt: datetime) -> str:
        """Get the constellation the Sun is in at a given time."""
        t = ts.from_datetime(dt)
        geo = self.earth.at(t).observe(self.sun)
        ra, dec, _ = geo.radec()
        return self._get_constellation_for_radec(ra.hours, dec.degrees)

    def get_moon_distance_info(self, ts, dt: datetime) -> dict:
        """Get moon distance and context (supermoon, micromoon)."""
        t = ts.from_datetime(dt)
        geo = self.earth.at(t).observe(self.moon)
        distance_km = geo.distance().km

        # Approximate perigee ~363,300 km, apogee ~405,500 km
        # Supermoon: within 370,000 km, Micromoon: beyond 400,000 km
        if distance_km < 370_000:
            label = "supermoon"
        elif distance_km > 400_000:
            label = "micromoon"
        else:
            label = "normal"

        # Angular diameter approximation
        angular_diam_arcmin = math.degrees(
            2 * math.atan(1737.4 / distance_km)
        ) * 60

        return {
            "distance_km": round(distance_km, 0),
            "distance_label": label,
            "angular_diameter_arcmin": round(angular_diam_arcmin, 1),
        }

    # ─── Milky Way / Galactic Center ───────────────────────────────────

    def get_milky_way_info(
        self, ts, latitude: float, longitude: float,
        dt: datetime, elevation: float = 0.0
    ) -> dict:
        """Get galactic center visibility and optimal viewing info.

        The galactic center (Sagittarius A*) is at approximately
        RA 17h 45m, Dec -29°. Altitude/azimuth computed via spherical
        astronomy (LST + hour angle) — no Skyfield vector ops needed.
        """
        # Estimate altitude using spherical astronomy
        gc_alt = self._estimate_altitude(
            latitude, longitude, dt, GALACTIC_CENTER_RA, GALACTIC_CENTER_DEC
        )

        # Estimate azimuth from hour angle and declination
        gc_az = self._estimate_azimuth(
            latitude, longitude, dt, GALACTIC_CENTER_RA, GALACTIC_CENTER_DEC
        )

        # Determine best viewing time (when galactic center is highest)
        transit_hour = self._estimate_transit_hour(
            longitude, dt, GALACTIC_CENTER_RA
        )

        # Seasonal visibility rating
        month = dt.month
        visibility = self._get_milky_way_visibility(month, latitude)

        return {
            "galactic_center_altitude": round(gc_alt, 1),
            "galactic_center_azimuth": round(gc_az, 1),
            "is_visible": bool(gc_alt > 5),
            "best_viewing_hour_utc": transit_hour,
            "seasonal_visibility": visibility["rating"],
            "seasonal_description": visibility["description"],
            "optimal_months": visibility["optimal_months"],
        }

    def _get_lmst(self, lon: float, dt: datetime) -> float:
        """Get local mean sidereal time in degrees."""
        ref = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        jday = (dt - ref).total_seconds() / 86400.0
        jday += 2451545.0
        gmst = (280.46061837 + 360.98564736629 * (jday - 2451545.0)) % 360
        return (gmst + lon) % 360

    def _estimate_altitude(
        self, lat: float, lon: float, dt: datetime, ra_deg: float, dec_deg: float
    ) -> float:
        """Estimate altitude of a celestial object using spherical astronomy."""
        lmst = self._get_lmst(lon, dt)
        ha = lmst - ra_deg

        lat_rad = math.radians(lat)
        dec_rad = math.radians(dec_deg)
        ha_rad = math.radians(ha)

        sin_alt = (
            math.sin(lat_rad) * math.sin(dec_rad)
            + math.cos(lat_rad) * math.cos(dec_rad) * math.cos(ha_rad)
        )
        return math.degrees(math.asin(max(-1, min(1, sin_alt))))

    def _estimate_azimuth(
        self, lat: float, lon: float, dt: datetime, ra_deg: float, dec_deg: float
    ) -> float:
        """Estimate azimuth of a celestial object using spherical astronomy."""
        lmst = self._get_lmst(lon, dt)
        ha = lmst - ra_deg

        lat_rad = math.radians(lat)
        dec_rad = math.radians(dec_deg)
        ha_rad = math.radians(ha)

        sin_alt = (
            math.sin(lat_rad) * math.sin(dec_rad)
            + math.cos(lat_rad) * math.cos(dec_rad) * math.cos(ha_rad)
        )
        sin_alt = max(-1, min(1, sin_alt))
        alt = math.asin(sin_alt)

        # Azimuth from the formula: sin(az) = -cos(dec)*sin(ha) / cos(alt)
        cos_alt = math.cos(alt)
        if cos_alt < 1e-10:
            return 180.0  # At zenith, azimuth is undefined

        sin_az = -math.cos(dec_rad) * math.sin(ha_rad) / cos_alt
        sin_az = max(-1, min(1, sin_az))

        # cos(az) formula for quadrant resolution
        cos_az = (
            math.sin(dec_rad) - math.sin(lat_rad) * sin_alt
        ) / cos_alt
        cos_az = max(-1, min(1, cos_az))

        az = math.degrees(math.atan2(sin_az, cos_az))
        return (az + 360) % 360

    def _get_gmst(self, dt: datetime) -> float:
        """Get Greenwich Mean Sidereal Time in degrees."""
        ref = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        jday = (dt - ref).total_seconds() / 86400.0
        jday += 2451545.0
        return (280.46061837 + 360.98564736629 * (jday - 2451545.0)) % 360

    def _estimate_transit_hour(
        self, lon: float, dt: datetime, ra_deg: float
    ) -> int:
        """Estimate the UTC hour when an object transits the meridian."""
        gmst_0 = self._get_gmst(dt.replace(hour=0))
        target_gmst = (ra_deg - lon) % 360
        gmst_rate = 360.98564736629 / 24.0
        diff = (target_gmst - gmst_0) % 360
        hours = diff / gmst_rate
        return int(hours) % 24

    def _get_milky_way_visibility(self, month: int, latitude: float) -> dict:
        """Rate Milky Way visibility based on season and latitude."""
        # Southern hemisphere: flip months
        if latitude < 0:
            month = (month + 6) % 12 or 12

        if 3 <= month <= 9:
            return {
                "rating": "excellent",
                "description": "Galactic center is well-placed in evening skies.",
                "optimal_months": ["April", "May", "June", "July", "August"],
            }
        elif month in (2, 10):
            return {
                "rating": "good",
                "description": "Galactic center is visible but lower on the horizon.",
                "optimal_months": ["April", "May", "June", "July", "August"],
            }
        else:
            return {
                "rating": "poor",
                "description": "Galactic center is near or below the horizon. Core of the Milky Way is best seen in summer.",
                "optimal_months": ["April", "May", "June", "July", "August"],
            }

    # ─── Meteor Showers ───────────────────────────────────────────────

    def get_active_meteor_showers(self, date: datetime) -> list:
        """Get meteor showers active on the given date."""
        date_str = date.strftime("%Y-%m-%d")
        active = []
        for shower in METEOR_SHOWERS:
            if shower["start"] <= date_str <= shower["end"]:
                peak_dt = datetime.strptime(shower["peak"], "%Y-%m-%d").replace(
                    tzinfo=timezone.utc
                )
                days_from_peak = abs((date - peak_dt).days)
                active.append(
                    {
                        "name": shower["name"],
                        "peak_date": shower["peak"],
                        "zhr": shower["zhr"],
                        "days_from_peak": days_from_peak,
                        "near_peak": days_from_peak <= 2,
                    }
                )
        return active

    # ─── Astronomical Facts ───────────────────────────────────────────

    def get_daily_facts(self, date: datetime, count: int = 3) -> list:
        """Get astronomical facts relevant to the given date."""
        facts = []

        # Look for date-specific facts
        for fact_entry in ASTRONOMICAL_FACTS:
            if fact_entry["month"] == date.month and fact_entry["day"] == date.day:
                facts.append({"fact": fact_entry["fact"], "source": "date-specific"})

        # If no date-specific fact, use day-of-month proximity
        if not facts:
            for fact_entry in ASTRONOMICAL_FACTS:
                if (
                    fact_entry["month"] == date.month
                    and abs(fact_entry["day"] - date.day) <= 3
                ):
                    facts.append(
                        {
                            "fact": fact_entry["fact"],
                            "source": "proximity",
                        }
                    )
                    break

        # Fill remaining slots with generic facts
        import random

        random.seed(date.strftime("%Y%m%d"))  # Deterministic per date
        remaining = count - len(facts)
        if remaining > 0:
            available = [f for f in GENERIC_FACTS if f not in [x["fact"] for x in facts]]
            selected = random.sample(available, min(remaining, len(available)))
            for f in selected:
                facts.append({"fact": f, "source": "generic"})

        return facts[:count]

    # ─── Combined Sky Events ──────────────────────────────────────────

    def get_sky_events(
        self,
        ts,
        date: datetime,
        latitude: float,
        longitude: float,
        elevation: float = 0.0,
    ) -> dict:
        """Get all sky events for a given date and location."""
        ref_dt = date.replace(hour=12, minute=0, second=0, microsecond=0)

        milky_way = self.get_milky_way_info(
            ts, latitude, longitude, ref_dt, elevation
        )
        showers = self.get_active_meteor_showers(date)
        facts = self.get_daily_facts(date, count=3)
        solar_decl = self.get_solar_declination(ts, ref_dt)
        moon_const = self.get_moon_constellation(ts, ref_dt)
        moon_dist = self.get_moon_distance_info(ts, ref_dt)
        sun_const = self.get_sun_constellation(ts, ref_dt)

        return {
            "milky_way": milky_way,
            "meteor_showers": showers,
            "active_shower_count": len(showers),
            "facts": facts,
            "solar_declination": solar_decl,
            "sun_constellation": sun_const,
            "moon_constellation": moon_const,
            "moon_distance": moon_dist,
        }
