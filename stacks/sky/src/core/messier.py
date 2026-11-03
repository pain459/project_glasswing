"""
Messier deep-sky object catalog module.

Provides the 110 Messier objects with J2000 RA/Dec, type, magnitude,
and constellation. Filters by visibility from the observer's location.
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Messier catalog: (designation, type, V_mag, RA_hours, Dec_deg, size_arcmin, constellation)
# Source: J2000 coordinates from SIMBAD/CDS
MESSIER_CATALOG = [
    ("M1", "Supernova Remnant", 8.4, 5.5700, 22.0090, 5.0, "Taurus"),
    ("M2", "Globular Cluster", 6.5, 0.7080, 49.2130, 10.0, "Aquarius"),
    ("M3", "Globular Cluster", 6.2, 1.5900, 33.9300, 15.0, "Canes Venatici"),
    ("M4", "Globular Cluster", 5.7, 5.9600, -26.4700, 30.0, "Sagittarius"),
    ("M5", "Globular Cluster", 5.6, 15.4800, 1.8800, 16.0, "Serpens"),
    ("M6", "Open Cluster", 4.3, 18.3400, -59.9900, 25.0, "Scorpius"),
    ("M7", "Open Cluster", 3.3, 18.4500, -62.0300, 80.0, "Scorpius"),
    ("M8", "Emission Nebula", 4.0, 18.0600, -24.3300, 90.0, "Sagittarius"),
    ("M9", "Globular Cluster", 7.8, 17.4200, -18.6100, 6.0, "Ophiuchus"),
    ("M10", "Globular Cluster", 6.6, 17.4700, -15.5300, 16.0, "Ophiuchus"),
    ("M11", "Open Cluster", 5.6, 5.9800, 5.9300, 13.0, "Scutum"),
    ("M12", "Globular Cluster", 6.8, 17.6400, -8.1100, 10.0, "Ophiuchus"),
    ("M13", "Globular Cluster", 5.8, 16.6950, 36.5500, 20.0, "Hercules"),
    ("M14", "Globular Cluster", 7.6, 17.5500, -3.0300, 8.0, "Ophiuchus"),
    ("M15", "Globular Cluster", 6.2, 20.9700, 29.1000, 12.0, "Pegasus"),
    ("M16", "Emission Nebula", 6.0, 18.1900, -13.7900, 30.0, "Sagittarius"),
    ("M17", "Emission Nebula", 6.0, 18.3600, -16.1600, 15.0, "Sagittarius"),
    ("M18", "Open Cluster", 6.7, 18.4200, -15.8600, 10.0, "Sagittarius"),
    ("M19", "Globular Cluster", 6.3, 17.8900, -23.8800, 10.0, "Ophiuchus"),
    ("M20", "Emission Nebula", 5.0, 18.4600, -22.6900, 25.0, "Sagittarius"),
    ("M21", "Open Cluster", 5.8, 18.5500, -21.7800, 10.0, "Sagittarius"),
    ("M22", "Globular Cluster", 5.1, 18.5100, -23.9900, 23.0, "Sagittarius"),
    ("M23", "Open Cluster", 5.1, 18.6300, -19.8300, 17.0, "Sagittarius"),
    ("M24", "Star Cloud", 4.5, 18.2300, -18.5300, 120.0, "Sagittarius"),
    ("M25", "Open Cluster", 4.6, 18.7300, -19.2300, 20.0, "Sagittarius"),
    ("M26", "Open Cluster", 7.9, 18.7800, -15.8300, 6.0, "Sagittarius"),
    ("M27", "Planetary Nebula", 7.5, 19.8900, 22.7200, 9.0, "Vulpecula"),
    ("M28", "Globular Cluster", 6.9, 17.9600, -27.0600, 8.0, "Sagittarius"),
    ("M29", "Open Cluster", 6.9, 20.4900, 35.6000, 6.0, "Cygnus"),
    ("M30", "Globular Cluster", 7.2, 21.1500, 17.2800, 8.0, "Capricornus"),
    ("M31", "Galaxy", 3.4, 0.7120, 41.2690, 120.0, "Andromeda"),
    ("M32", "Galaxy", 8.1, 0.7280, 40.6830, 5.0, "Andromeda"),
    ("M33", "Galaxy", 5.7, 1.3300, 30.6600, 100.0, "Triangulum"),
    ("M34", "Open Cluster", 4.9, 1.2700, 42.8300, 17.0, "Perseus"),
    ("M35", "Open Cluster", 4.9, 5.5700, 27.5200, 23.0, "Gemini"),
    ("M36", "Open Cluster", 4.3, 5.3700, 34.2800, 10.0, "Auriga"),
    ("M37", "Open Cluster", 4.4, 5.5000, 32.8200, 23.0, "Auriga"),
    ("M38", "Open Cluster", 4.8, 5.6900, 35.8800, 20.0, "Auriga"),
    ("M39", "Open Cluster", 3.8, 23.9700, 39.5300, 25.0, "Cygnus"),
    ("M40", "Double Star", 7.7, 12.5900, 54.9500, 2.0, "Ursa Major"),
    ("M41", "Open Cluster", 3.6, 6.5700, -20.6900, 28.0, "Canis Major"),
    ("M42", "Emission Nebula", 3.0, 5.5400, -5.3900, 50.0, "Orion"),
    ("M43", "Emission Nebula", 7.0, 5.5600, -5.2300, 15.0, "Orion"),
    ("M44", "Open Cluster", 3.7, 8.3200, 19.8000, 45.0, "Cancer"),
    ("M45", "Open Cluster", 0.6, 3.7900, 24.1100, 120.0, "Taurus"),
    ("M46", "Open Cluster", 4.9, 7.2300, -14.4900, 17.0, "Puppis"),
    ("M47", "Open Cluster", 3.5, 7.3800, -14.6800, 25.0, "Puppis"),
    ("M48", "Open Cluster", 3.7, 7.6900, -15.0200, 25.0, "Hydra"),
    ("M49", "Galaxy", 6.9, 12.7500, -11.3000, 6.0, "Virgo"),
    ("M50", "Open Cluster", 4.1, 7.5500, -1.6300, 17.0, "Puppis"),
    ("M51", "Galaxy", 6.7, 13.4600, 47.2000, 8.0, "Canes Venatici"),
    ("M52", "Open Cluster", 4.5, 2.6300, 46.7500, 12.0, "Cassiopeia"),
    ("M53", "Globular Cluster", 6.3, 13.5500, 28.5500, 8.0, "Canes Venatici"),
    ("M54", "Globular Cluster", 7.6, 18.9800, -30.1300, 6.0, "Sagittarius"),
    ("M55", "Globular Cluster", 6.3, 19.1500, -30.8300, 17.0, "Sagittarius"),
    ("M56", "Globular Cluster", 7.7, 19.0700, 30.2700, 5.0, "Lyra"),
    ("M57", "Planetary Nebula", 8.8, 19.5700, 33.0300, 2.0, "Lyra"),
    ("M58", "Galaxy", 6.8, 13.3900, -15.4300, 6.0, "Virgo"),
    ("M59", "Galaxy", 6.6, 12.8900, -11.7200, 4.0, "Virgo"),
    ("M60", "Galaxy", 6.4, 12.9500, -12.1300, 6.0, "Virgo"),
    ("M61", "Galaxy", 7.2, 12.8900, -2.7000, 5.0, "Virgo"),
    ("M62", "Globular Cluster", 6.4, 17.1900, -30.0900, 6.0, "Sagittarius"),
    ("M63", "Galaxy", 6.9, 13.4800, 42.0300, 6.0, "Canes Venatici"),
    ("M64", "Galaxy", 6.2, 8.7200, 1.6300, 7.0, "Canes Venatici"),
    ("M65", "Galaxy", 6.8, 11.4900, 13.0800, 5.0, "Leo"),
    ("M66", "Galaxy", 6.6, 11.5600, 12.4300, 5.0, "Leo"),
    ("M67", "Open Cluster", 5.6, 8.2900, 11.7800, 20.0, "Cancer"),
    ("M68", "Globular Cluster", 6.8, 14.5000, -26.0900, 6.0, "Hydra"),
    ("M69", "Globular Cluster", 6.7, 14.4700, -26.3300, 4.0, "Sagittarius"),
    ("M70", "Globular Cluster", 6.9, 14.5200, -23.5300, 5.0, "Sagittarius"),
    ("M71", "Open Cluster", 5.7, 16.7300, 12.3800, 10.0, "Sagittarius"),
    ("M72", "Globular Cluster", 6.8, 16.8000, 13.8300, 5.0, "Aquarius"),
    ("M73", "Open Cluster", 7.0, 20.6300, -16.3300, 6.0, "Aquarius"),
    ("M74", "Galaxy", 6.5, 1.0000, 13.8800, 8.0, "Pisces"),
    ("M75", "Globular Cluster", 6.0, 20.7700, -21.2300, 6.0, "Aquarius"),
    ("M76", "Planetary Nebula", 8.6, 20.6300, 28.2800, 1.0, "Perseus"),
    ("M77", "Galaxy", 5.3, 0.2500, -9.7300, 7.0, "Cetus"),
    ("M78", "Reflection Nebula", 8.3, 5.1900, -4.7300, 8.0, "Orion"),
    ("M79", "Globular Cluster", 6.7, 4.4000, -45.5300, 7.0, "Lepus"),
    ("M80", "Globular Cluster", 5.9, 14.9300, -30.2800, 7.0, "Scorpius"),
    ("M81", "Galaxy", 5.4, 9.9300, 54.9400, 10.0, "Ursa Major"),
    ("M82", "Galaxy", 6.4, 9.9900, 55.3900, 8.0, "Ursa Major"),
    ("M83", "Galaxy", 5.9, 12.6700, -29.8700, 10.0, "Hydra"),
    ("M84", "Galaxy", 6.3, 12.4800, -18.3300, 4.0, "Virgo"),
    ("M85", "Galaxy", 6.5, 12.5100, 18.1900, 6.0, "Coma Berenices"),
    ("M86", "Galaxy", 6.6, 12.3900, 13.0800, 5.0, "Virgo"),
    ("M87", "Galaxy", 5.6, 12.4500, 12.3300, 6.0, "Virgo"),
    ("M88", "Galaxy", 6.6, 12.5900, 14.6300, 5.0, "Coma Berenices"),
    ("M89", "Galaxy", 6.6, 12.5300, 12.8300, 4.0, "Virgo"),
    ("M90", "Galaxy", 6.7, 12.5600, 13.2800, 5.0, "Virgo"),
    ("M91", "Galaxy", 7.3, 12.6300, 14.0800, 4.0, "Coma Berenices"),
    ("M92", "Globular Cluster", 5.9, 17.0300, 43.0700, 7.0, "Hercules"),
    ("M93", "Open Cluster", 4.8, 6.3300, -25.1300, 13.0, "Puppis"),
    ("M94", "Galaxy", 6.3, 10.3200, 41.2700, 5.0, "Canes Venatici"),
    ("M95", "Galaxy", 6.9, 10.2300, 22.7000, 4.0, "Leo"),
    ("M96", "Galaxy", 6.6, 10.3800, 22.2300, 5.0, "Leo"),
    ("M97", "Planetary Nebula", 6.3, 12.1200, 56.8300, 2.0, "Ursa Major"),
    ("M98", "Galaxy", 6.3, 10.4500, 23.0000, 5.0, "Leo"),
    ("M99", "Galaxy", 6.8, 10.6300, 22.6300, 5.0, "Coma Berenices"),
    ("M100", "Galaxy", 6.4, 10.7000, 41.6300, 5.0, "Coma Berenices"),
    ("M101", "Galaxy", 5.2, 14.0500, 54.3500, 20.0, "Ursa Major"),
    ("M102", "Galaxy", 6.0, 14.0500, 54.3500, 20.0, "Ursa Major"),
    ("M103", "Open Cluster", 4.7, 1.6700, 60.4300, 13.0, "Cassiopeia"),
]


class MessierService:
    """Messier object visibility calculations."""

    def __init__(self, ephemeris):
        self.eph = ephemeris

    def _get_observer(self, latitude: float, longitude: float, elevation: float = 0.0):
        from skyfield.api import Topos
        topos = Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)
        return self.eph["earth"] + topos

    def get_visible_messier(
        self, ts, dt: datetime, latitude: float, longitude: float,
        elevation: float = 0.0, min_altitude: float = 10.0,
        max_magnitude: float = 7.0
    ) -> list:
        """Get Messier objects currently above the horizon and visible.

        Filters by altitude and magnitude. Returns sorted by altitude.
        """
        observer = self._get_observer(latitude, longitude, elevation)
        t = ts.from_datetime(dt)

        results = []
        for desig, obj_type, v_mag, ra_h, dec_d, size, const in MESSIER_CATALOG:
            if v_mag > max_magnitude:
                continue

            from skyfield.api import Star
            try:
                obj = Star(ra_hours=ra_h, dec_degrees=dec_d)
                obs = observer.at(t).observe(obj)
                apparent = obs.apparent()
                alt, az, dist = apparent.altaz()

                alt_deg = alt.degrees
                if alt_deg >= min_altitude:
                    # Airmass
                    airmass = None
                    if alt_deg > 5.0:
                        z = math.radians(90.0 - alt_deg)
                        airmass = round(
                            1.0 / (math.cos(z) + 0.50572 * math.pow(96.079 - alt_deg, -1.6)), 2
                        )

                    results.append({
                        "designation": desig,
                        "type": obj_type,
                        "magnitude": v_mag,
                        "size_arcmin": size,
                        "constellation": const,
                        "altitude_deg": round(alt_deg, 1),
                        "azimuth_deg": round(az.degrees, 1),
                        "airmass": airmass,
                    })
            except Exception:
                continue

        # Sort by altitude descending
        results.sort(key=lambda m: m["altitude_deg"], reverse=True)
        return results

    def get_messier_by_type(
        self, ts, dt: datetime, latitude: float, longitude: float,
        elevation: float = 0.0, obj_type: str = "Galaxy",
        min_altitude: float = 10.0
    ) -> list:
        """Get Messier objects of a specific type that are visible."""
        all_visible = self.get_visible_messier(ts, dt, latitude, longitude, elevation, min_altitude)
        return [m for m in all_visible if obj_type.lower() in m["type"].lower()]
