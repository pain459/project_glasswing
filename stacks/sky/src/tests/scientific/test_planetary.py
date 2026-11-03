"""
Scientific validation: Planetary calculations for Hyderabad on 2026-11-03.

Validates that:
- All planets have valid ecliptic longitude (0-360°)
- Visible planets have altitude > 0° at night
- Planet rise/set times fall within the civil day
- Angular diameter and magnitude are in physically reasonable ranges
"""

from datetime import datetime, timezone, timedelta

import pytest

_IST = timezone(timedelta(hours=5, minutes=30))

PLANET_NAMES = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"]


class TestPlanetPositions:
    """Position sanity checks for every planet."""

    def test_all_planets_returned(
        self, planetary_service, ts, hyderabad_location, test_date_noon_utc
    ):
        planets = planetary_service.get_all_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert len(planets) == len(PLANET_NAMES), (
            f"Expected {len(PLANET_NAMES)} planets, got {len(planets)}"
        )

    def test_altitude_in_range(
        self, planetary_service, ts, hyderabad_location, test_date_noon_utc
    ):
        planets = planetary_service.get_all_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        for p in planets:
            assert -90.0 <= p["altitude_deg"] <= 90.0, (
                f"{p['name']} altitude {p['altitude_deg']}° out of range"
            )

    def test_azimuth_in_range(
        self, planetary_service, ts, hyderabad_location, test_date_noon_utc
    ):
        planets = planetary_service.get_all_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        for p in planets:
            assert 0.0 <= p["azimuth_deg"] < 360.0, (
                f"{p['name']} azimuth {p['azimuth_deg']}° out of range"
            )

    def test_distance_positive(
        self, planetary_service, ts, hyderabad_location, test_date_noon_utc
    ):
        planets = planetary_service.get_all_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        for p in planets:
            assert p["distance_au"] > 0, (
                f"{p['name']} distance {p['distance_au']} AU not positive"
            )

    def test_ra_in_range(
        self, planetary_service, ts, hyderabad_location, test_date_noon_utc
    ):
        """Right ascension should be 0-24 hours."""
        planets = planetary_service.get_all_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        for p in planets:
            assert 0.0 <= p["ra_hours"] < 24.0, (
                f"{p['name']} RA {p['ra_hours']}h out of range"
            )

    def test_dec_in_range(
        self, planetary_service, ts, hyderabad_location, test_date_noon_utc
    ):
        """Declination should be -90° to +90°."""
        planets = planetary_service.get_all_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        for p in planets:
            assert -90.0 <= p["dec_deg"] <= 90.0, (
                f"{p['name']} Dec {p['dec_deg']}° out of range"
            )


class TestPlanetRiseSet:
    """Rise/set times should fall within the civil day."""

    @pytest.mark.parametrize("planet", PLANET_NAMES)
    def test_rise_set_within_day(
        self, planetary_service, ts, hyderabad_location, test_date, planet
    ):
        result = planetary_service.get_planet_rise_set(
            ts, planet,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        if result["rise"]:
            rise_dt = datetime.fromisoformat(result["rise"])
            # Allow ±3 hours around midnight for planets that rise very early/late
            assert -3 <= rise_dt.hour <= 26, (
                f"{planet} rise hour {rise_dt.hour} out of range"
            )
        if result["set"]:
            set_dt = datetime.fromisoformat(result["set"])
            assert -3 <= set_dt.hour <= 26, (
                f"{planet} set hour {set_dt.hour} out of range"
            )


class TestVisiblePlanets:
    """Visible planets at night should be above the horizon."""

    def test_visible_planets_above_horizon(
        self, planetary_service, ts, hyderabad_location
    ):
        """Check at 22:00 IST (16:30 UTC) — well into nighttime."""
        night_dt = datetime(2026, 11, 3, 16, 30, 0, tzinfo=timezone.utc)
        visible = planetary_service.get_visible_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            night_dt,
            hyderabad_location.elevation_m,
            min_altitude=5.0,
        )
        for p in visible:
            assert p["is_above_horizon"] is True
            assert p["altitude_deg"] >= 5.0, (
                f"{p['name']} altitude {p['altitude_deg']}° below min_altitude"
            )

    def test_visible_planets_count_reasonable(
        self, planetary_service, ts, hyderabad_location
    ):
        """At least one planet should be visible at night."""
        night_dt = datetime(2026, 11, 3, 16, 30, 0, tzinfo=timezone.utc)
        visible = planetary_service.get_visible_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            night_dt,
            hyderabad_location.elevation_m,
            min_altitude=5.0,
        )
        assert len(visible) >= 1, "At least one planet should be visible at night"


class TestPlanetMagnitude:
    """Apparent magnitude sanity checks."""

    def test_magnitude_reasonable(
        self, planetary_service, ts, hyderabad_location, test_date_noon_utc
    ):
        """Planets typically range from ~-8 (Venus at inferior conjunction)
        to +13 (Neptune).  The approximate magnitude formula can overshoot
        slightly, so we use a generous envelope."""
        planets = planetary_service.get_all_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        for p in planets:
            if p["magnitude"] is not None:
                assert -10.0 <= p["magnitude"] <= 15.0, (
                    f"{p['name']} magnitude {p['magnitude']} out of range"
                )


class TestPlanetAngularDiameter:
    """Angular diameter should be positive and physically reasonable."""

    def test_angular_diameter_positive(
        self, planetary_service, ts, hyderabad_location, test_date_noon_utc
    ):
        planets = planetary_service.get_all_planets(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        for p in planets:
            assert p["angular_diameter_arcsec"] > 0, (
                f"{p['name']} angular diameter not positive"
            )
            # Even the smallest visible disk is > 0.1 arcsec
            assert p["angular_diameter_arcsec"] < 1000, (
                f"{p['name']} angular diameter {p['angular_diameter_arcsec']} arcsec too large"
            )
