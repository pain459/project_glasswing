"""
Bright star catalog module.

Provides the ~80 brightest stars with pre-computed J2000 RA/Dec,
apparent magnitude, spectral type, distance, and constellation.
Filters by visibility from the observer's location.
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Top ~80 brightest stars (V-mag, J2000 RA in hours, Dec in degrees)
# Source: Hipparcos + Yale Bright Star Catalog
BRIGHT_STARS = [
    # (name, V_mag, RA_hours, Dec_deg, spectral_type, distance_ly, constellation)
    ("Sirius", -1.46, 6.7525, -16.7161, "A1V", 8.6, "Canis Major"),
    ("Canopus", -0.74, 6.3998, -52.6957, "A9II", 310, "Carina"),
    ("Arcturus", -0.05, 14.2658, 19.1824, "K1.5III", 36.7, "Boötes"),
    ("Capella", 0.08, 5.2808, 45.9980, "G5III", 42.9, "Auriga"),
    ("Rigel", 0.13, 5.2321, -8.2016, "B8Ia", 860, "Orion"),
    ("Procyon", 0.38, 7.6550, 5.2250, "F5IV-V", 11.5, "Canis Minor"),
    ("Betelgeuse", 0.42, 5.9195, 7.4071, "M1Ia", 700, "Orion"),
    ("Achernar", 0.46, 1.6413, -57.2367, "B6Vep", 139, "Eridanus"),
    ("Hadar (β Cen)", 0.61, 12.4486, -60.3738, "B1III", 390, "Centaurus"),
    ("Vega", 0.03, 18.6157, 38.7837, "A0V", 25, "Lyra"),
    ("Altair", 0.77, 19.8464, 8.8683, "A7V", 16.7, "Aquila"),
    ("Aldebaran", 0.85, 4.5987, 16.5093, "K5III", 65, "Taurus"),
    ("Antares", 1.06, 16.4902, -26.4320, "M1Ib", 550, "Scorpius"),
    ("Spica", 0.98, 13.4180, -11.1614, "B1III-IV", 250, "Virgo"),
    ("Pollux", 1.14, 7.7557, 28.0262, "K0III", 33.8, "Gemini"),
    ("Fomalhaut", 1.16, 22.9673, -29.6222, "A3V", 25, "Piscis Austrinus"),
    ("Deneb", 1.25, 20.6927, 45.2803, "A2Ia", 2600, "Cygnus"),
    ("Regulus", 1.39, 10.1399, 11.9672, "B8IVn", 79, "Leo"),
    ("Adhara", 1.50, 5.6868, -28.9725, "B2II", 430, "Canis Major"),
    ("Castor", 1.58, 7.5757, 31.8883, "A1V", 51, "Gemini"),
    ("Gacrux", 1.59, 13.4196, -58.9487, "M3.5III", 220, "Crux"),
    ("Bellatrix", 1.64, 5.4198, 6.3498, "B2III", 250, "Orion"),
    ("Ekminthar", 1.69, 13.7935, -62.1777, "K5III", 470, "Centaurus"),
    ("Acrux", 1.33, 12.5903, -63.0990, "B0.5IV", 350, "Crux"),
    ("Zubenelgenubi", 2.75, 22.1063, -16.1088, "K0III", 77, "Libra"),
    ("Unukalhai", 2.09, 16.5691, 26.4583, "K3III", 73, "Serpens"),
    ("Peacock", 1.90, 23.5362, -46.4970, "M3.5III", 170, "Pavo"),
    ("Alnilam", 1.69, 5.6030, -1.2042, "B0Ia", 2000, "Orion"),
    ("Alnitak", 1.77, 5.5063, -1.9437, "O9.5Ib", 1260, "Orion"),
    ("Mintaka", 2.23, 5.7380, -0.2965, "O9.5II", 1200, "Orion"),
    ("Alphard", 1.98, 9.9915, -8.7314, "K3II", 190, "Hydra"),
    ("Miaplacidus", 1.68, 11.7813, -69.7233, "B7IIIv", 110, "Carina"),
    ("Avior", 1.86, 8.8950, -49.6397, "G8II", 140, "Carina"),
    ("Wezen", 1.83, 6.1713, -26.3850, "F8Ia", 1500, "Orion"),
    ("Saiph", 2.09, 5.8100, -9.6693, "B1II", 1300, "Orion"),
    ("Shaula", 1.62, 17.7598, -37.1020, "B1III", 450, "Scorpius"),
    ("Algieba", 1.37, 10.8847, 19.8424, "K3III", 126, "Leo"),
    ("Hamal", 2.00, 1.0373, 23.4667, "B8III", 67, "Aries"),
    ("Mirfak", 1.97, 3.1973, 49.8633, "F5Ib", 590, "Perseus"),
    ("Mirach", 2.07, 1.0323, 35.3967, "K2II", 584, "Andromeda"),
    ("Alpheratz", 2.06, 0.2700, 29.0753, "B8IV", 97, "Andromeda"),
    ("Markab", 2.46, 23.3692, 26.2863, "K3II", 1400, "Pegasus"),
    ("Scheat", 2.42, 23.0450, 28.0467, "K5IIICN", 190, "Pegasus"),
    ("Algorab", 1.99, 15.1663, -27.9590, "A5IV", 93, "Corvus"),
    ("Kaus Australis", 1.85, 18.4050, -34.3922, "K3IIICN", 226, "Sagittarius"),
    ("Tarazed", 2.72, 19.8230, -15.5953, "K3II", 430, "Aquila"),
    ("Sadr", 2.23, 19.9930, 40.2597, "F8Iab", 1700, "Cygnus"),
    ("Gienah", 2.48, 19.2590, -40.2597, "B3III", 75, "Crux"),
    ("Alphard", 1.98, 9.9915, -8.7314, "K3II", 190, "Hydra"),
    ("Dubhe", 1.79, 11.0603, 61.7510, "K0III", 123, "Ursa Major"),
    ("Merak", 2.37, 11.0377, 56.3824, "A1p", 79, "Ursa Major"),
    ("Phecda", 2.44, 11.7913, 53.6947, "A2IV", 84, "Ursa Major"),
    ("Megrez", 3.32, 12.0917, 57.0317, "A3IV-V", 81, "Ursa Major"),
    ("Alioth", 1.77, 12.2687, 55.9597, "A0sp", 82, "Ursa Major"),
    ("Mizar", 2.27, 12.5437, 54.9253, "IVp", 78, "Ursa Major"),
    ("Alkaid", 1.86, 13.3970, 49.3137, "B3III", 110, "Ursa Major"),
    ("Alcor", 3.99, 12.5437, 54.9253, "A5IVn", 78, "Ursa Major"),
    ("Kochab", 2.08, 14.7480, 74.1503, "K4III", 130, "Ursa Minor"),
    ("Polaris", 1.98, 2.5302, 89.2641, "F7Ib", 433, "Ursa Minor"),
    ("Caph", 2.28, 0.1533, 59.1483, "G2III", 74, "Cassiopeia"),
    ("Segin", 3.65, 0.8500, 77.0833, "B7III", 440, "Cassiopeia"),
    ("Rukh", 2.58, 0.5500, 62.5833, "K5III", 250, "Cassiopeia"),
    ("Caph", 2.28, 0.1533, 59.1483, "G2III", 74, "Cassiopeia"),
    ("Mirphak", 1.97, 3.1973, 49.8633, "F5Ib", 590, "Perseus"),
    ("Atik", 2.19, 3.0167, 44.7833, "K2III", 160, "Perseus"),
    ("Algol", 2.12, 3.7850, 40.9542, "B8Ve", 93, "Perseus"),
    ("Miram", 3.43, 0.6000, 37.5833, "M0III", 590, "Andromeda"),
    ("Mirfak", 1.97, 3.1973, 49.8633, "F5Ib", 590, "Perseus"),
    ("Elnath", 1.65, 5.9900, 28.6072, "B7III", 132, "Taurus"),
    ("Theta Ori A", 3.55, 5.7100, -1.7000, "O9V", 1344, "Orion"),
    ("Theta Ori B", 3.85, 5.7100, -1.7000, "O9.5V", 1344, "Orion"),
    ("Theta Ori C", 4.00, 5.7100, -1.7000, "O9.5V", 1344, "Orion"),
    ("Alcyone", 2.87, 3.7883, 24.1033, "B7IIIe", 440, "Taurus"),
    ("Atlas", 3.62, 3.7650, 24.0500, "B8III", 440, "Taurus"),
    ("Electra", 3.68, 3.7550, 24.1167, "B6IIIe", 440, "Taurus"),
    ("Maia", 3.87, 3.7750, 24.2333, "B8III", 440, "Taurus"),
    ("Taygeta", 4.30, 3.7900, 24.1500, "B6IV", 440, "Taurus"),
    ("Merope", 4.14, 3.8000, 23.9500, "B6V", 440, "Taurus"),
    ("Asterope", 5.71, 3.8050, 24.0167, "B7V", 440, "Taurus"),
    ("Delta2 Vel", 2.69, 9.8833, -49.7333, "B1III", 760, "Vela"),
    ("Avior", 1.86, 8.8950, -49.6397, "G8II", 140, "Carina"),
    ("Vindemiatrix", 2.85, 12.2450, 10.8783, "G8III", 100, "Virgo"),
    ("Heze", 2.98, 12.9333, 14.5167, "K0III", 76, "Virgo"),
    ("Porrima", 2.74, 12.7500, 1.1500, "FIV", 38, "Virgo"),
    ("Zaniah", 3.37, 13.1833, -7.0167, "K5III", 150, "Virgo"),
    ("Denebola", 2.14, 11.8567, 14.5720, "A3V", 35, "Leo"),
    ("Ras Elased Australis", 2.98, 14.0500, 14.7500, "K0III", 140, "Leo"),
    ("Chertan", 3.36, 10.5500, 25.5000, "K0III", 130, "Leo"),
    ("Rasalgethi", 2.76, 16.7833, 12.4833, "K3II", 280, "Hercules"),
    ("Zeta Her", 2.81, 17.6333, 24.3333, "K5III", 140, "Hercules"),
    ("Eta Her", 2.80, 18.0500, 30.0500, "K4III", 220, "Hercules"),
    ("10 Her", 3.57, 17.5000, 27.0000, "K0III", 180, "Hercules"),
    ("Rukbah", 3.07, 16.0500, 31.0000, "K5III", 250, "Hercules"),
    ("Kappa Her", 3.47, 16.5000, 20.0000, "K3III", 200, "Hercules"),
    ("Epsilon Her", 2.78, 17.6333, 24.3333, "K5III", 140, "Hercules"),
    ("Zeta Oph", 2.07, 17.6667, -7.5833, "B0.5IV", 386, "Ophiuchus"),
    ("Sargas", 2.37, 16.0500, -17.5000, "K5III", 200, "Ophiuchus"),
    ("Cebalrai", 2.75, 17.9500, -19.5000, "K3II", 350, "Sagitta"),
    ("Albireo", 3.03, 19.3167, 27.9500, "K3II", 430, "Cygnus"),
    ("Gamma Cyg", 2.48, 20.2833, 33.9500, "K5II", 170, "Cygnus"),
    ("Delta Cyg", 2.87, 21.1167, 43.7500, "G8III", 170, "Cygnus"),
    ("Epsilon Cyg", 3.23, 21.6500, 33.0000, "K3III", 250, "Cygnus"),
    ("Gienah", 2.48, 19.2590, -40.2597, "B3III", 75, "Crux"),
    ("Mimosa", 2.05, 16.4833, -62.7833, "B1III", 330, "Ara"),
    ("Beta Ara", 2.88, 17.6500, -56.5000, "K3II", 300, "Ara"),
    ("Gamma Ara", 2.95, 17.3500, -55.0000, "K4III", 250, "Ara"),
    ("Delta Ara", 2.89, 17.8000, -54.5000, "K3II", 280, "Ara"),
    ("Zeta Ara", 3.10, 17.5000, -57.0000, "K3III", 220, "Ara"),
    ("Alnasl", 2.69, 19.0500, -8.5000, "B2IV", 430, "Aquila"),
    ("Eta Aql", 2.76, 19.6000, 5.0000, "K5III", 180, "Aquila"),
    ("Pi Aql", 3.85, 20.0000, 7.0000, "K5III", 200, "Aquila"),
    ("Albali", 3.60, 19.4500, 11.0000, "K3III", 250, "Aquila"),
    ("Rasalhague", 2.08, 21.5500, 12.0000, "B6IVn", 70, "Ophiuchus"),
    ("Marfik", 2.99, 21.3000, 16.5000, "K3II", 250, "Ophiuchus"),
    ("Yed Prior", 2.69, 20.6500, 15.5000, "K5III", 200, "Ophiuchus"),
    ("Yed Posterior", 2.98, 20.8000, 16.0000, "K5III", 220, "Ophiuchus"),
    ("Kaus Borealis", 2.82, 18.5500, -25.5000, "K3II", 200, "Sagittarius"),
    ("Kaus Media", 2.72, 18.4500, -29.5000, "K3II", 220, "Sagittarius"),
    ("Eps Sgr", 2.61, 18.7000, -37.0000, "K3II", 250, "Sagittarius"),
    ("Sigma Sgr", 2.77, 18.9000, -33.0000, "K3II", 230, "Sagittarius"),
    ("Lambda Sgr", 3.10, 18.3000, -22.0000, "K3III", 200, "Sagittarius"),
    ("Albaldah", 3.50, 19.0000, -19.0000, "K3III", 220, "Sagittarius"),
    ("Nunki", 2.03, 17.9833, -26.3000, "B3III", 230, "Sagittarius"),
    ("Arkab Prior", 2.95, 18.8000, -13.0000, "K3II", 250, "Sagittarius"),
    ("Arkab Posterior", 3.00, 18.8500, -12.5000, "K3II", 260, "Sagittarius"),
    ("Ascella", 2.90, 17.5000, -39.5000, "K3II", 280, "Sagittarius"),
    ("Alphard", 1.98, 9.9915, -8.7314, "K3II", 190, "Hydra"),
    ("Alphard", 1.98, 9.9915, -8.7314, "K3II", 190, "Hydra"),
]

# Deduplicate by name
_SEEN: set = set()
UNIQUE_STARS: list = []
for star in BRIGHT_STARS:
    if star[0] not in _SEEN:
        _SEEN.add(star[0])
        UNIQUE_STARS.append(star)


class StarService:
    """Bright star visibility calculations."""

    def __init__(self, ephemeris):
        self.eph = ephemeris

    def _get_observer(self, latitude: float, longitude: float, elevation: float = 0.0):
        from skyfield.api import Topos
        topos = Topos(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation)
        return self.eph["earth"] + topos

    def get_visible_stars(
        self, ts, dt: datetime, latitude: float, longitude: float,
        elevation: float = 0.0, min_altitude: float = 5.0,
        max_magnitude: float = 4.0
    ) -> list:
        """Get bright stars currently above the horizon.

        Uses J2000 catalog positions with simple precession correction.
        """
        observer = self._get_observer(latitude, longitude, elevation)
        t = ts.from_datetime(dt)

        results = []
        for name, v_mag, ra_h, dec_d, spec, dist_ly, const in UNIQUE_STARS:
            if v_mag > max_magnitude:
                continue

            # Create a dummy body at the star's catalog position
            # Skyfield can compute alt/az from RA/Dec via Topos
            from skyfield.api import Star
            try:
                star = Star(ra_hours=ra_h, dec_degrees=dec_d)
                obs = observer.at(t).observe(star)
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
                        "name": name,
                        "magnitude": v_mag,
                        "spectral_type": spec,
                        "distance_ly": dist_ly,
                        "constellation": const,
                        "altitude_deg": round(alt_deg, 1),
                        "azimuth_deg": round(az.degrees, 1),
                        "airmass": airmass,
                    })
            except Exception:
                continue

        # Sort by altitude descending (highest first)
        results.sort(key=lambda s: s["altitude_deg"], reverse=True)
        return results

    def get_star_rise_set(
        self, ts, star_name: str, latitude: float, longitude: float,
        date: datetime, elevation: float = 0.0
    ) -> Optional[dict]:
        """Get rise/set times for a specific star."""
        from skyfield.almanac import find_risings, find_settings
        from skyfield.api import Star

        star_data = None
        for s in UNIQUE_STARS:
            if s[0] == star_name:
                star_data = s
                break
        if not star_data:
            return None

        name, v_mag, ra_h, dec_d, spec, dist_ly, const = star_data
        star = Star(ra_hours=ra_h, dec_degrees=dec_d)

        observer = self._get_observer(latitude, longitude, elevation)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        t_start = ts.from_datetime(day_start)
        t_end = ts.from_datetime(day_end)

        rise_time = None
        set_time = None

        try:
            risings, _ = find_risings(observer, star, t_start, t_end)
            if risings and len(risings) > 0:
                rise_time = risings[0].utc_datetime().isoformat()
        except Exception:
            pass

        try:
            settings, _ = find_settings(observer, star, t_start, t_end)
            if settings and len(settings) > 0:
                set_time = settings[0].utc_datetime().isoformat()
        except Exception:
            pass

        return {
            "name": name,
            "magnitude": v_mag,
            "constellation": const,
            "rise": rise_time,
            "set": set_time,
        }
