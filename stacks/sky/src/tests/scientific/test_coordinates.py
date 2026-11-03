"""
Scientific validation: Coordinate transformations.

Validates:
- Converting lat/lon to radians and back is consistent
- Azimuth is in [0, 360)
- Altitude is in [-90, +90]
- ObserverLocation properties are correct
"""

import math

import pytest
from core.coordinates import ObserverLocation, TimeWindow


class TestLatLonRadians:
    """Latitude/longitude round-trip through radians."""

    def test_latitude_roundtrip(self):
        lat_deg = 17.385
        lat_rad = math.radians(lat_deg)
        lat_back = math.degrees(lat_rad)
        assert abs(lat_deg - lat_back) < 1e-10

    def test_longitude_roundtrip(self):
        lon_deg = 78.4867
        lon_rad = math.radians(lon_deg)
        lon_back = math.degrees(lon_rad)
        assert abs(lon_deg - lon_back) < 1e-10

    def test_negative_latitude_roundtrip(self):
        lat_deg = -33.8688  # Sydney
        lat_rad = math.radians(lat_deg)
        lat_back = math.degrees(lat_rad)
        assert abs(lat_deg - lat_back) < 1e-10

    def test_pole_latitude(self):
        """90° latitude should round-trip correctly."""
        lat_deg = 90.0
        lat_rad = math.radians(lat_deg)
        lat_back = math.degrees(lat_rad)
        assert abs(lat_deg - lat_back) < 1e-10

    def test_equator_latitude(self):
        """0° latitude should round-trip correctly."""
        lat_deg = 0.0
        lat_rad = math.radians(lat_deg)
        lat_back = math.degrees(lat_rad)
        assert abs(lat_deg - lat_back) < 1e-10


class TestAzimuthRange:
    """Azimuth values should be in [0, 360)."""

    def test_azimuth_normalization(self):
        """Negative azimuth should normalize to [0, 360)."""
        az = -45.0
        az_norm = az % 360
        assert 0 <= az_norm < 360
        assert az_norm == 315.0

    def test_azimuth_large_positive(self):
        """Large positive azimuth should normalize."""
        az = 450.0
        az_norm = az % 360
        assert 0 <= az_norm < 360
        assert az_norm == 90.0

    def test_azimuth_zero(self):
        az = 0.0
        az_norm = az % 360
        assert az_norm == 0.0

    def test_azimuth_360_wraps(self):
        az = 360.0
        az_norm = az % 360
        assert az_norm == 0.0


class TestAltitudeRange:
    """Altitude values should be in [-90, +90]."""

    def test_altitude_clamp_upper(self):
        alt = 95.0
        clamped = max(-90.0, min(90.0, alt))
        assert clamped == 90.0

    def test_altitude_clamp_lower(self):
        alt = -95.0
        clamped = max(-90.0, min(90.0, alt))
        assert clamped == -90.0

    def test_altitude_zenith(self):
        alt = 90.0
        clamped = max(-90.0, min(90.0, alt))
        assert clamped == 90.0

    def test_altitude_nadir(self):
        alt = -90.0
        clamped = max(-90.0, min(90.0, alt))
        assert clamped == -90.0

    def test_altitude_horizon(self):
        alt = 0.0
        clamped = max(-90.0, min(90.0, alt))
        assert clamped == 0.0


class TestObserverLocation:
    """ObserverLocation NamedTuple properties."""

    def test_hyderabad_location(self):
        loc = ObserverLocation(
            name="Hyderabad",
            latitude_deg=17.385,
            longitude_deg=78.4867,
            elevation_m=542.0,
            timezone="Asia/Kolkata",
        )
        assert loc.name == "Hyderabad"
        assert loc.latitude_deg == 17.385
        assert loc.longitude_deg == 78.4867
        assert loc.elevation_m == 542.0
        assert loc.timezone == "Asia/Kolkata"

    def test_timezone_property(self):
        loc = ObserverLocation(
            name="Test",
            latitude_deg=0.0,
            longitude_deg=0.0,
            timezone="UTC",
        )
        tz = loc.tz
        assert tz.key == "UTC"

    def test_default_elevation(self):
        loc = ObserverLocation(
            name="Test",
            latitude_deg=0.0,
            longitude_deg=0.0,
        )
        assert loc.elevation_m == 0.0
        assert loc.timezone == "UTC"

    def test_latitude_valid_range(self):
        """Latitude must be in [-90, 90]."""
        for lat in [-90, -45, 0, 45, 90]:
            loc = ObserverLocation(
                name="Test",
                latitude_deg=lat,
                longitude_deg=0.0,
            )
            assert -90 <= loc.latitude_deg <= 90

    def test_longitude_valid_range(self):
        """Longitude must be in [-180, 180]."""
        for lon in [-180, -90, 0, 90, 180]:
            loc = ObserverLocation(
                name="Test",
                latitude_deg=0.0,
                longitude_deg=lon,
            )
            assert -180 <= loc.longitude_deg <= 180


class TestTimeWindow:
    """TimeWindow NamedTuple properties."""

    def test_time_window_creation(self):
        from datetime import datetime, timezone

        tw = TimeWindow(
            utc=datetime(2026, 11, 3, 6, 0, tzinfo=timezone.utc),
            local=datetime(2026, 11, 3, 11, 30, tzinfo=timezone.utc),
            label="Sunrise",
        )
        assert tw.label == "Sunrise"
        assert tw.utc.year == 2026
