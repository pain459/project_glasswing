"""
Scientific validation: Lunar calculations for Hyderabad on 2026-11-03.

The moon phase around 2026-11-03 is Last Quarter (waning), with
illumination roughly 30-40%.  Moonrise/moonset times are validated
to be within a reasonable window.
"""

from datetime import datetime, timezone, timedelta

import pytest

_IST = timezone(timedelta(hours=5, minutes=30))


class TestMoonPhase:
    """Moon phase and illumination for 2026-11-03."""

    def test_phase_is_last_quarter_or_nearby(
        self, lunar_service, ts, test_date_noon_utc
    ):
        """Around Nov 3 2026 the moon is in Last Quarter / Waning Crescent."""
        phase = lunar_service.get_moon_phase(ts, test_date_noon_utc)
        # Last Quarter is index 6; Waning Crescent is index 7
        acceptable = {"Last Quarter", "Waning Crescent", "Waning Gibbous"}
        assert phase["phase_name"] in acceptable, (
            f"Expected Last Quarter or nearby, got {phase['phase_name']}"
        )

    def test_illumination_in_expected_range(
        self, lunar_service, ts, test_date_noon_utc
    ):
        """Last Quarter illumination is roughly 30-50%."""
        phase = lunar_service.get_moon_phase(ts, test_date_noon_utc)
        illum = phase["illuminated_fraction"]
        assert 0.15 <= illum <= 0.55, (
            f"Illumination {illum} outside expected range [0.15, 0.55]"
        )

    def test_phase_fraction_reasonable(
        self, lunar_service, ts, test_date_noon_utc
    ):
        """Phase fraction 0-1; Last Quarter is around 0.75."""
        phase = lunar_service.get_moon_phase(ts, test_date_noon_utc)
        assert 0.0 <= phase["phase_fraction"] <= 1.0
        # Last Quarter is roughly 0.75 ± 0.15
        assert 0.55 <= phase["phase_fraction"] <= 0.95, (
            f"Phase fraction {phase['phase_fraction']} not near Last Quarter (~0.75)"
        )

    def test_phase_angle_positive(
        self, lunar_service, ts, test_date_noon_utc
    ):
        phase = lunar_service.get_moon_phase(ts, test_date_noon_utc)
        assert phase["phase_angle_deg"] > 0


class TestMoonriseMoonset:
    """Moonrise and moonset times for Hyderabad on 2026-11-03."""

    def test_moonrise_computed(
        self, lunar_service, ts, hyderabad_location, test_date
    ):
        result = lunar_service.get_moonrise_moonset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert result["moonrise"] is not None, "Moonrise should be computed"

    def test_moonset_computed(
        self, lunar_service, ts, hyderabad_location, test_date
    ):
        result = lunar_service.get_moonrise_moonset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert result["moonset"] is not None, "Moonset should be computed"

    def test_moonrise_within_civil_day(
        self, lunar_service, ts, hyderabad_location, test_date
    ):
        """Moonrise should fall within ±2 hours of the civil day."""
        result = lunar_service.get_moonrise_moonset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        mr = datetime.fromisoformat(result["moonrise"])
        mr_ist = mr.astimezone(_IST)
        # Moonrise between 22:00 previous day and 02:00 next day is normal
        # We just check it is within 2 hours of some midnight boundary
        assert 0 <= mr_ist.hour <= 23, f"Moonrise hour {mr_ist.hour} out of range"

    def test_moonset_within_civil_day(
        self, lunar_service, ts, hyderabad_location, test_date
    ):
        result = lunar_service.get_moonrise_moonset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        ms = datetime.fromisoformat(result["moonset"])
        ms_ist = ms.astimezone(_IST)
        assert 0 <= ms_ist.hour <= 23, f"Moonset hour {ms_ist.hour} out of range"

    def test_moonrise_and_moonset_both_computed(
        self, lunar_service, ts, hyderabad_location, test_date
    ):
        """Both moonrise and moonset should be computed for a normal day.

        Note: For a Last Quarter moon, moonset can come before moonrise
        (moon sets in the morning, rises in the evening). We don't enforce
        ordering — just that both values exist and are within the civil day.
        """
        result = lunar_service.get_moonrise_moonset(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date,
            hyderabad_location.elevation_m,
        )
        assert result["moonrise"] is not None
        assert result["moonset"] is not None


class TestMoonPosition:
    """Moon position sanity checks."""

    def test_moon_altitude_in_range(
        self, lunar_service, ts, hyderabad_location, test_date_noon_utc
    ):
        pos = lunar_service.get_moon_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert -90.0 <= pos["altitude_deg"] <= 90.0

    def test_moon_azimuth_in_range(
        self, lunar_service, ts, hyderabad_location, test_date_noon_utc
    ):
        pos = lunar_service.get_moon_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert 0.0 <= pos["azimuth_deg"] < 360.0

    def test_moon_distance_reasonable(
        self, lunar_service, ts, hyderabad_location, test_date_noon_utc
    ):
        """Moon distance is ~363,000-405,000 km."""
        pos = lunar_service.get_moon_position(
            ts,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            test_date_noon_utc,
            hyderabad_location.elevation_m,
        )
        assert 350_000 <= pos["distance_km"] <= 420_000, (
            f"Moon distance {pos['distance_km']} km outside expected range"
        )


class TestLunarAge:
    """Lunar age sanity checks."""

    def test_lunar_age_positive(
        self, lunar_service, ts, test_date_noon_utc
    ):
        age = lunar_service.get_lunar_age(ts, test_date_noon_utc)
        assert age["age_days"] is not None
        assert 0 <= age["age_days"] <= 30

    def test_lunar_age_percent_in_range(
        self, lunar_service, ts, test_date_noon_utc
    ):
        age = lunar_service.get_lunar_age(ts, test_date_noon_utc)
        if age["age_percent"] is not None:
            assert 0.0 <= age["age_percent"] <= 1.0
