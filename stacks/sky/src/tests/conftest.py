"""
Pytest configuration for scientific validation tests.

Fixtures provide shared ephemeris, location, and date objects so that
every test module can focus on assertions rather than setup.
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

# Ensure the project source root is on sys.path so that
# `from core.xxx import ...` works regardless of where pytest is invoked.
_SRC_ROOT = Path(__file__).resolve().parent.parent
if str(_SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(_SRC_ROOT))

import skyfield.api as skyfield
from core.ephemeris import EphemerisManager
from core.solar import SolarService
from core.lunar import LunarService
from core.planetary import PlanetaryService
from core.events import EventsService
from core.panchang import PanchangService
from core.coordinates import ObserverLocation


# ── Ephemeris data directory ──────────────────────────────────────────
# Try the project-local copy first, then fall back to the container path.
_EPHEM_CANDIDATES = [
    _SRC_ROOT.parent / "data" / "ephemeris",       # stacks/sky/data/ephemeris
    Path("/app/data/ephemeris"),                    # container default
]

def _find_ephem_dir() -> Path:
    for candidate in _EPHEM_CANDIDATES:
        if (candidate / "de440s.bsp").exists():
            return candidate
    # Last resort: let EphemerisManager pick its own default
    return Path("/app/data/ephemeris")


@pytest.fixture(scope="session")
def ephemeris_data_dir():
    """Return the path to the directory containing the DE440S kernel."""
    return _find_ephem_dir()


@pytest.fixture(scope="session")
def ephemeris(ephemeris_data_dir):
    """Load the DE440S ephemeris kernel (session-scoped, loaded once)."""
    mgr = EphemerisManager(data_dir=str(ephemeris_data_dir))
    kernel_path = mgr.ensure_kernel("de440s")
    mgr.load_kernel(kernel_path)
    return mgr.loaded_kernel


@pytest.fixture(scope="session")
def ts():
    """Skyfield timescale object (session-scoped)."""
    return skyfield.load.timescale()


@pytest.fixture(scope="session")
def solar_service(ephemeris):
    """SolarService instance backed by the loaded ephemeris."""
    return SolarService(ephemeris)


@pytest.fixture(scope="session")
def lunar_service(ephemeris):
    """LunarService instance backed by the loaded ephemeris."""
    return LunarService(ephemeris)


@pytest.fixture(scope="session")
def planetary_service(ephemeris):
    """PlanetaryService instance backed by the loaded ephemeris."""
    return PlanetaryService(ephemeris)


@pytest.fixture(scope="session")
def events_service(ephemeris):
    """EventsService instance backed by the loaded ephemeris."""
    return EventsService(ephemeris)


@pytest.fixture(scope="session")
def panchang_service(ephemeris):
    """PanchangService instance backed by the loaded ephemeris."""
    return PanchangService(ephemeris)


# ── Location fixtures ─────────────────────────────────────────────────

@pytest.fixture(scope="session")
def hyderabad_location():
    """ObserverLocation for Hyderabad, India (17.385°N, 78.4867°E)."""
    return ObserverLocation(
        name="Hyderabad",
        latitude_deg=17.385,
        longitude_deg=78.4867,
        elevation_m=542.0,
        timezone="Asia/Kolkata",
    )


# ── Date fixtures ─────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def test_date():
    """Test date: 2026-11-03 at midnight UTC."""
    return datetime(2026, 11, 3, 0, 0, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="session")
def test_date_noon_utc():
    """Test date at noon UTC (convenient for position queries)."""
    return datetime(2026, 11, 3, 12, 0, 0, tzinfo=timezone.utc)
