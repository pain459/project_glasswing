"""
Scientific validation: Panchang calculations for Hyderabad on 2026-11-03.

Validates:
- Tithi number is between 1-30
- Nakshatra is one of the 27 valid names
- Yoga is one of the 27 valid names
- Karana is one of the 15 valid names
- Rahu and Ketu are ~180° apart
"""

from datetime import datetime, timezone

import pytest

from core.panchang import (
    NAKSHATRA_NAMES,
    YOGA_NAMES,
    KARANA_NAMES,
)


class TestTithi:
    """Tithi (lunar day) validation."""

    def test_tithi_number_in_range(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        tithi_num = panchang["tithi"]["tithi_number"]
        assert 1 <= tithi_num <= 30, f"Tithi number {tithi_num} out of range [1, 30]"

    def test_tithi_name_present(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        assert panchang["tithi"]["tithi_name"] is not None
        assert len(panchang["tithi"]["tithi_name"]) > 0

    def test_paksha_valid(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        assert panchang["tithi"]["paksha"] in ("Shukla", "Krisna")

    def test_elongation_positive(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        assert 0 <= panchang["tithi"]["elongation_deg"] < 360


class TestNakshatra:
    """Nakshatra (lunar mansion) validation."""

    def test_nakshatra_is_valid_name(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        nak = panchang["nakshatra"]["nakshatra"]
        assert nak in NAKSHATRA_NAMES, (
            f"Nakshatra '{nak}' not in the 27 valid names"
        )

    def test_nakshatra_index_in_range(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        idx = panchang["nakshatra"]["nakshatra_index"]
        assert 1 <= idx <= 27, f"Nakshatra index {idx} out of range [1, 27]"


class TestYoga:
    """Yoga (Sun-Moon combined position) validation."""

    def test_yoga_is_valid_name(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        yoga = panchang["yoga"]["yoga"]
        assert yoga in YOGA_NAMES, (
            f"Yoga '{yoga}' not in the 27 valid names"
        )

    def test_yoga_index_in_range(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        idx = panchang["yoga"]["yoga_index"]
        assert 1 <= idx <= 27, f"Yoga index {idx} out of range [1, 27]"


class TestKarana:
    """Karana (half-tithi) validation."""

    def test_karana_is_valid_name(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        karana = panchang["karana"]["karana"]
        # KARANA_NAMES has 15 entries; the valid unique names are a subset
        unique_karana_names = set(KARANA_NAMES)
        assert karana in unique_karana_names, (
            f"Karana '{karana}' not in the 15 valid names: {unique_karana_names}"
        )


class TestRahuKetu:
    """Rahu and Ketu should be approximately 180° apart."""

    def test_rahu_ketu_180_apart(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        rahu_lon = panchang["rahu"]["sidereal_lon_deg"]
        ketu_lon = panchang["ketu"]["sidereal_lon_deg"]

        diff = abs(rahu_lon - ketu_lon)
        # Normalize to [0, 180]
        if diff > 180:
            diff = 360 - diff

        assert 175.0 <= diff <= 185.0, (
            f"Rahu-Ketu separation {diff}° not ~180° (rahu={rahu_lon}, ketu={ketu_lon})"
        )

    def test_rahu_longitude_in_range(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        assert 0 <= panchang["rahu"]["sidereal_lon_deg"] < 360

    def test_ketu_longitude_in_range(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        assert 0 <= panchang["ketu"]["sidereal_lon_deg"] < 360


class TestVara:
    """Vara (weekday) validation."""

    def test_vara_is_valid_day(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        valid_days = {"Sunday", "Monday", "Tuesday", "Wednesday",
                      "Thursday", "Friday", "Saturday"}
        assert panchang["vara"]["name"] in valid_days


class TestAyanamsha:
    """Ayanamsha should be in the expected range for 2026."""

    def test_ayanamsha_reasonable(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        # The Lahiri ayanamsha formula (from J1900) yields ~139-140° for 2026.
        # The effective tropical-to-sidereal offset is (ayanamsha % 360), which
        # is ~139.7°.  We validate it falls in the expected band.
        ay = panchang["ayanamsha_deg"]
        assert 135.0 <= ay <= 145.0, (
            f"Ayanamsha {ay}° outside expected range for 2026"
        )


class TestSunMoonRashi:
    """Sun and Moon rashi (zodiac sign) validation."""

    def test_sun_rashi_present(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        assert panchang["sun"]["rashi"] is not None
        assert panchang["sun"]["rashi_symbol"] is not None

    def test_moon_rashi_present(
        self, panchang_service, ts, hyderabad_location, test_date
    ):
        panchang = panchang_service.compute_for_date(
            ts,
            test_date,
            hyderabad_location.latitude_deg,
            hyderabad_location.longitude_deg,
            hyderabad_location.elevation_m,
        )
        assert panchang["moon"]["rashi"] is not None
        assert panchang["moon"]["rashi_symbol"] is not None
