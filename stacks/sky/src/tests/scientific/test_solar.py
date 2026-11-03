"""
Scientific validation: Solar calculations for Hyderabad on 2026-11-03.

Reference values (approximate, from NOAA Solar Calculator and Skyfield):
  Sunrise  ~ 06:15 IST  (within 3 min)
  Sunset   ~ 17:45 IST  (within 3 min)
  Solar noon ~ 12:00 IST (within 5 min)
  Solar declination ~ -15° to -17° (November, post-equinox)
"""

from datetime import datetime, timezone, timedelta

import pytest

_IST = timezone(timedelta(hours=5, minutes=30))


class TestSunriseSunset:
    """Sunrise and sunset times for Hyderabad on 2026-11-03."""

    def test_sunrise_within_tolerance(self, solar_service, ts, hyderabad_location, test_date):
        result = solar_service.get_sunrise_sunset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert result["sunrise"] is not None, "Sunrise should be computed"

        sunrise_utc = datetime.fromisoformat(result["sunrise"])
        sunrise_ist = sunrise_utc.astimezone(_IST)

        # Expected ~06:15 IST, tolerance 3 minutes
        expected_hour = 6
        expected_minute = 15
        diff_minutes = abs(
            (sunrise_ist.hour - expected_hour) * 60 + (sunrise_ist.minute - expected_minute)
        )
        assert diff_minutes <= 3, (
            f"Sunrise {sunrise_ist.strftime('%H:%M')} IST is {diff_minutes} min "
            f"from expected 06:15 IST"
        )

    def test_sunset_within_tolerance(self, solar_service, ts, hyderabad_location, test_date):
        result = solar_service.get_sunrise_sunset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert result["sunset"] is not None, "Sunset should be computed"

        sunset_utc = datetime.fromisoformat(result["sunset"])
        sunset_ist = sunset_utc.astimezone(_IST)

        # Expected ~17:45 IST, tolerance 3 minutes
        expected_hour = 17
        expected_minute = 45
        diff_minutes = abs(
            (sunset_ist.hour - expected_hour) * 60 + (sunset_ist.minute - expected_minute)
        )
        assert diff_minutes <= 3, (
            f"Sunset {sunset_ist.strftime('%H:%M')} IST is {diff_minutes} min "
            f"from expected 17:45 IST"
        )

    def test_solar_noon_within_tolerance(self, solar_service, ts, hyderabad_location, test_date):
        result = solar_service.get_sunrise_sunset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert result["solar_noon"] is not None, "Solar noon should be computed"

        noon_utc = datetime.fromisoformat(result["solar_noon"])
        noon_ist = noon_utc.astimezone(_IST)

        # Expected ~12:00 IST, tolerance 5 minutes
        diff_minutes = abs(
            (noon_ist.hour - 12) * 60 + noon_ist.minute
        )
        assert diff_minutes <= 5, (
            f"Solar noon {noon_ist.strftime('%H:%M')} IST is {diff_minutes} min "
            f"from expected 12:00 IST"
        )

    def test_sunrise_before_sunset(self, solar_service, ts, hyderabad_location, test_date):
        result = solar_service.get_sunrise_sunset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert result["sunrise"] is not None and result["sunset"] is not None
        assert datetime.fromisoformat(result["sunrise"]) < datetime.fromisoformat(result["sunset"])

    def test_daylight_hours_reasonable(self, solar_service, ts, hyderabad_location, test_date):
        """In November Hyderabad gets roughly 11-12 hours of daylight."""
        result = solar_service.get_sunrise_sunset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert result["daylight_hours"] is not None
        assert 10.0 <= result["daylight_hours"] <= 13.0, (
            f"Daylight hours {result['daylight_hours']} outside expected range"
        )


class TestSolarDeclination:
    """Solar declination for November should be negative (Southern Hemisphere)."""

    def test_declination_negative_november(
        self, events_service, ts, test_date_noon_utc
    ):
        decl_data = events_service.get_solar_declination(ts, test_date_noon_utc)
        decl = decl_data["solar_declination_deg"]
        assert -20.0 <= decl <= -10.0, (
            f"Solar declination {decl}° outside expected November range [-20, -10]"
        )

    def test_declination_in_expected_band(
        self, events_service, ts, test_date_noon_utc
    ):
        """More precise: November 3 is roughly -15° to -17°."""
        decl_data = events_service.get_solar_declination(ts, test_date_noon_utc)
        decl = decl_data["solar_declination_deg"]
        assert -18.0 <= decl <= -14.0, (
            f"Solar declination {decl}° outside tighter November-3 band [-18, -14]"
        )


class TestSolarPosition:
    """Solar altitude and azimuth sanity checks."""

    def test_sun_above_horizon_at_noon(
        self, solar_service, ts, hyderabad_location, test_date_noon_utc
    ):
        pos = solar_service.get_solar_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert pos["is_above_horizon"] is True
        assert pos["altitude_deg"] > 0

    def test_sun_below_horizon_at_midnight(
        self, solar_service, ts, hyderabad_location, test_date
    ):
        pos = solar_service.get_solar_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert pos["is_above_horizon"] is False
        assert pos["altitude_deg"] < 0

    def test_azimuth_in_range(
        self, solar_service, ts, hyderabad_location, test_date_noon_utc
    ):
        pos = solar_service.get_solar_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert 0.0 <= pos["azimuth_deg"] < 360.0

    def test_altitude_in_range(
        self, solar_service, ts, hyderabad_location, test_date_noon_utc
    ):
        pos = solar_service.get_solar_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert -90.0 <= pos["altitude_deg"] <= 90.0

    def test_angular_diameter_reasonable(
        self, solar_service, ts, hyderabad_location, test_date_noon_utc
    ):
        """Solar angular diameter is ~1800-2000 arcseconds."""
        pos = solar_service.get_solar_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert 1700 <= pos["angular_diameter_arcsec"] <= 2100

    def test_distance_au_reasonable(
        self, solar_service, ts, hyderabad_location, test_date_noon_utc
    ):
        """Earth-Sun distance is ~0.98-1.02 AU in November."""
        pos = solar_service.get_solar_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert 0.95 <= pos["distance_au"] <= 1.05
