"""
Coordinate system utilities.

Supports:
- WGS84 latitude/longitude/elevation
- IANA timezone identifiers
- UTC timestamps and local civil dates
- Julian dates
- Right ascension and declination
- Altitude and azimuth
- Atmospheric refraction assumptions
"""

import zoneinfo
from datetime import datetime, timezone
from typing import NamedTuple, Optional


class ObserverLocation(NamedTuple):
    """Canonical observer location."""
    name: str
    latitude_deg: float
    longitude_deg: float
    elevation_m: float = 0.0
    timezone: str = "UTC"

    @property
    def tz(self) -> zoneinfo.ZoneInfo:
        return zoneinfo.ZoneInfo(self.timezone)


class TimeWindow(NamedTuple):
    """A time interval with UTC and local representations."""
    utc: datetime
    local: datetime
    label: str = ""
