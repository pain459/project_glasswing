"""
Planetary calculation module.

Calculates positions, visibility, and events for:
Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune
"""

import logging
from datetime import datetime
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

PLANET_DISPLAY = {
    "mercury": "Mercury",
    "venus": "Venus",
    "mars": "Mars",
    "jupiter": "Jupiter",
    "saturn": "Saturn",
    "uranus": "Uranus",
    "neptune": "Neptune",
}


class PlanetaryService:
    """Planetary position and visibility calculations using Skyfield."""

    def __init__(self, ephemeris):
        self.eph = ephemeris

    def _get_observer(self, latitude: float, longitude: float, elevation: float = 0.0):
        from skyfield.api import Topos
        topos = Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)
        return self.eph["earth"] + topos

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

        return {
            "name": PLANET_DISPLAY.get(planet_name_lower, planet_name),
            "ra_hours": round(ra.hours, 4),
            "dec_deg": round(dec.degrees, 4),
            "altitude_deg": round(alt.degrees, 2),
            "azimuth_deg": round(az.degrees, 2),
            "distance_au": round(distance.au, 4),
            "is_above_horizon": bool(alt.degrees > 0),
        }

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
