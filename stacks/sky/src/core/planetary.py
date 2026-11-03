"""
Planetary calculation module.

Calculates positions, visibility, and events for:
Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune

Includes:
- Rise/set times via find_risings/find_settings
- Culmination (meridian transit) times
- Apparent magnitude
- Angular diameter
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional


logger = logging.getLogger(__name__)

PLANET_NAMES = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"]

# DE440S uses "mars barycenter" etc. for outer planets; mercury/venus use simple names
PLANET_EPHEMERIS_KEY = {
    "mercury": "mercury",
    "venus": "venus",
    "mars": "mars barycenter",
    "jupiter": "jupiter barycenter",
    "saturn": "saturn barycenter",
    "uranus": "uranus barycenter",
    "neptune": "neptune barycenter",
}

# IAU 3-letter abbreviation → full constellation name (all 88 constellations)
CONSTELLATION_FULL = {
    "And": "Andromeda", "Aps": "Apus", "Aql": "Aquila", "Aqr": "Aquarius",
    "Ara": "Ara", "Ari": "Aries", "Aur": "Auriga", "Boo": "Boötes",
    "Cae": "Caelum", "Cam": "Camelopardalis", "Cap": "Capricornus", "Car": "Carina",
    "Cen": "Centaurus", "Cep": "Cepheus", "Cet": "Cetus", "Cma": "Chamaeleon",
    "CMa": "Canis Major", "CMi": "Canis Minor", "Cnc": "Cancer", "Col": "Columba",
    "Com": "Coma Berenices", "CrA": "Corona Australis", "CrB": "Corona Borealis",
    "Crt": "Crater", "Cru": "Crux", "Cyg": "Cygnus",
    "Del": "Delphinus", "Dor": "Dorado", "Dra": "Draco", "Equ": "Equuleus",
    "Eri": "Eridanus", "For": "Fornax", "Gem": "Gemini", "Gru": "Grus",
    "Her": "Hercules", "Hya": "Hydra", "Hyi": "Hydrus", "Ind": "Indus",
    "Lac": "Lacerta", "Leo": "Leo", "LeA": "Leo Minor", "Lib": "Libra",
    "Lep": "Lepus", "Lup": "Lupus", "Lyn": "Lynx", "Lyr": "Lyra",
    "Men": "Mensa", "Mic": "Microscopium", "Mon": "Monoceros", "Mus": "Musca",
    "Nor": "Norma", "Oct": "Octans", "Oph": "Ophiuchus", "Ori": "Orion",
    "Pav": "Pavo", "Peg": "Pegasus", "Per": "Perseus",
    "Phe": "Phoenix", "Pic": "Pictor", "PsA": "Piscis Austrinus", "Psc": "Pisces",
    "Pup": "Puppis", "Pyx": "Pyxis", "Ret": "Reticulum", "Scl": "Sculptor",
    "Sct": "Scutum", "Sco": "Scorpius", "Serpens": "Serpens", "Ser": "Serpens",
    "Sex": "Sextans", "Sge": "Sagitta", "Sgr": "Sagittarius",
    "Tau": "Taurus", "Tel": "Telescopium", "Tri": "Triangulum",
    "TrA": "Triangulum Australe", "Tuc": "Tucana",
    "UMa": "Ursa Major", "UMi": "Ursa Minor", "Vel": "Vela", "Vir": "Virgo",
    "Vol": "Volans", "Vul": "Vulpecula",
}

PLANET_DISPLAY = {
    "mercury": "Mercury",
    "venus": "Venus",
    "mars": "Mars",
    "jupiter": "Jupiter",
    "saturn": "Saturn",
    "uranus": "Uranus",
    "neptune": "Neptune",
}

# Planet radii in km for angular diameter computation
PLANET_RADII_KM = {
    "mercury": 2439.7,
    "venus": 6051.8,
    "mars": 3389.5,
    "jupiter": 69911,
    "saturn": 58232,
    "uranus": 25362,
    "neptune": 24622,
}


class PlanetaryService:
    """Planetary position and visibility calculations using Skyfield."""

    def __init__(self, ephemeris):
        self.eph = ephemeris
        from skyfield.api import load_constellation_map
        self.constellation_map = load_constellation_map()

    def _get_constellation(self, geo_vector) -> str:
        """Look up the IAU constellation for a geocentric observation vector."""
        try:
            abbr = self.constellation_map(geo_vector)
            return CONSTELLATION_FULL.get(abbr, abbr)
        except Exception:
            return "Unknown"

    def _get_observer(self, latitude: float, longitude: float, elevation: float = 0.0):
        from skyfield.api import Topos
        topos = Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)
        return self.eph["earth"] + topos

    def _get_topos(self, latitude: float, longitude: float, elevation: float = 0.0):
        """Get a plain Topos for meridian_transits."""
        from skyfield.api import Topos
        return Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)

    def get_planet_position(
        self, ts, planet_name: str, latitude: float, longitude: float,
        dt: datetime, elevation: float = 0.0
    ) -> Optional[dict]:
        """Get topocentric position of a planet."""
        planet_name_lower = planet_name.lower()
        if planet_name_lower not in PLANET_NAMES:
            return None

        try:
            eph_key = PLANET_EPHEMERIS_KEY.get(planet_name_lower, planet_name_lower)
            planet = self.eph[eph_key]
        except KeyError:
            logger.warning("Planet %s not found in ephemeris", planet_name)
            return None

        observer = self._get_observer(latitude, longitude, elevation)
        t = ts.from_datetime(dt)

        # Geocentric position for RA/Dec
        earth = self.eph["earth"]
        geo_pos = earth.at(t).observe(planet)
        ra, dec, proper_motion = geo_pos.radec()

        # Topocentric position using (earth + topos) pattern
        topo_pos = observer.at(t).observe(planet)
        apparent = topo_pos.apparent()
        alt, az, distance = apparent.altaz()

        # Angular diameter from distance and known radius
        radius_km = PLANET_RADII_KM.get(planet_name_lower, 1000)
        distance_km = distance.au * 149_597_870.7
        angular_diam_arcsec = math.degrees(
            2 * math.atan(radius_km / distance_km)
        ) * 3600

        return {
            "name": PLANET_DISPLAY.get(planet_name_lower, planet_name),
            "ra_hours": round(ra.hours, 4),
            "dec_deg": round(dec.degrees, 4),
            "altitude_deg": round(alt.degrees, 2),
            "azimuth_deg": round(az.degrees, 2),
            "distance_au": round(distance.au, 4),
            "is_above_horizon": bool(alt.degrees > 0),
            "angular_diameter_arcsec": round(angular_diam_arcsec, 2),
        }

    def get_planet_rise_set(
        self, ts, planet_name: str, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> dict:
        """Get rise and set times for a planet on a given date."""
        from skyfield.almanac import find_risings, find_settings

        planet_name_lower = planet_name.lower()
        if planet_name_lower not in PLANET_NAMES:
            return {"rise": None, "set": None}

        try:
            eph_key = PLANET_EPHEMERIS_KEY.get(planet_name_lower, planet_name_lower)
            planet = self.eph[eph_key]
        except KeyError:
            return {"rise": None, "set": None}

        observer = self._get_observer(latitude, longitude, elevation)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        t_start = ts.from_datetime(day_start)
        t_end = ts.from_datetime(day_end)

        rise_time = None
        set_time = None

        try:
            risings, _ = find_risings(observer, planet, t_start, t_end)
            if risings and len(risings) > 0:
                rise_time = risings[0].utc_datetime().isoformat()
        except Exception:
            pass

        try:
            settings, _ = find_settings(observer, planet, t_start, t_end)
            if settings and len(settings) > 0:
                set_time = settings[0].utc_datetime().isoformat()
        except Exception:
            pass

        return {"rise": rise_time, "set": set_time}

    def get_planet_culmination(
        self, ts, planet_name: str, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> Optional[str]:
        """Get the planet's meridian transit (culmination) time for a date."""
        from skyfield.almanac import find_discrete, meridian_transits

        planet_name_lower = planet_name.lower()
        if planet_name_lower not in PLANET_NAMES:
            return None

        try:
            eph_key = PLANET_EPHEMERIS_KEY.get(planet_name_lower, planet_name_lower)
            planet = self.eph[eph_key]
        except KeyError:
            return None

        topos = self._get_topos(latitude, longitude, elevation)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        try:
            t_start = ts.from_datetime(day_start)
            t_end = ts.from_datetime(day_end)
            transit_func = meridian_transits(self.eph, planet, topos)
            transits, _ = find_discrete(t_start, t_end, transit_func)
            if len(transits) > 0:
                return transits[0].utc_datetime().isoformat()
        except Exception as e:
            logger.debug("Planet %s culmination failed: %s", planet_name, e)

        return None

    def get_all_planets(
        self, ts, latitude: float, longitude: float,
        dt: datetime, elevation: float = 0.0
    ) -> list:
        """Get positions of all planets."""
        results = []
        for planet in PLANET_NAMES:
            pos = self.get_planet_position(ts, planet, latitude, longitude, dt, elevation)
            if pos:
                results.append(pos)
        return results

    def get_all_planets_with_events(
        self, ts, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> list:
        """Get positions of all planets with rise/set and culmination times."""
        local_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        obs_dt = date.replace(hour=12, minute=0, second=0, microsecond=0)
        results = []
        for planet in PLANET_NAMES:
            pos = self.get_planet_position(ts, planet, latitude, longitude, obs_dt, elevation)
            if pos:
                # Add rise/set times
                rise_set = self.get_planet_rise_set(ts, planet, latitude, longitude, local_date, elevation)
                pos["rise"] = rise_set["rise"]
                pos["set"] = rise_set["set"]

                # Add culmination time
                culmination = self.get_planet_culmination(ts, planet, latitude, longitude, local_date, elevation)
                pos["culmination"] = culmination

                # Add constellation (IAU boundaries, geocentric)
                planet_name_lower = planet.lower()
                eph_key = PLANET_EPHEMERIS_KEY.get(planet_name_lower, planet_name_lower)
                try:
                    t = ts.from_datetime(obs_dt)
                    geo = self.eph["earth"].at(t).observe(self.eph[eph_key])
                    pos["constellation"] = self._get_constellation(geo)
                except Exception:
                    pos["constellation"] = "Unknown"

                results.append(pos)
        return results

    def get_planet_constellation_transitions(
        self, ts, planet_name: str, start_dt: datetime, months: int = 6
    ) -> list:
        """Compute constellation transitions for a planet over the next N months.

        Returns a list of segments:
        [
            {"constellation": "Leo", "start": "2026-11-03", "end": "2026-12-15"},
            {"constellation": "Virgo", "start": "2026-12-15", "end": "2027-02-10"},
            ...
        ]
        """
        planet_name_lower = planet_name.lower()
        eph_key = PLANET_EPHEMERIS_KEY.get(planet_name_lower, planet_name_lower)
        try:
            planet_body = self.eph[eph_key]
        except KeyError:
            return []

        end_dt = start_dt + timedelta(days=months * 30)
        segments = []
        current_const = None
        segment_start = start_dt.strftime("%Y-%m-%d")

        day = start_dt.replace(hour=12, minute=0, second=0, microsecond=0)
        while day <= end_dt:
            t = ts.from_datetime(day)
            geo = self.eph["earth"].at(t).observe(planet_body)
            const = self._get_constellation(geo)

            if const != current_const:
                # Close previous segment
                if current_const is not None:
                    segments.append({
                        "constellation": current_const,
                        "start": segment_start,
                        "end": (day - timedelta(days=1)).strftime("%Y-%m-%d"),
                    })
                current_const = const
                segment_start = day.strftime("%Y-%m-%d")

            day += timedelta(days=1)

        # Close final segment
        if current_const is not None:
            segments.append({
                "constellation": current_const,
                "start": segment_start,
                "end": end_dt.strftime("%Y-%m-%d"),
            })

        return segments

    def get_visible_planets(
        self, ts, latitude: float, longitude: float,
        dt: datetime, elevation: float = 0.0,
        min_altitude: float = 5.0
    ) -> list:
        """Get planets that are above the horizon and observable."""
        all_planets = self.get_all_planets(ts, latitude, longitude, dt, elevation)
        return [
            p for p in all_planets
            if p["is_above_horizon"] and p["altitude_deg"] >= min_altitude
        ]
