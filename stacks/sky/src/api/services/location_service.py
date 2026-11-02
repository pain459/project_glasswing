"""
LocationService — Manages observing locations.

Uses an in-memory store for now; will be replaced with PostgreSQL persistence
in Phase 5.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class LocationService:
    """Manages saved observing locations."""

    def __init__(self):
        self._locations = {}
        self._next_id = 1

    def ensure_default_location(self, location_data):
        """Seed the default location if no locations exist."""
        if not self._locations:
            self._locations[1] = {
                "id": 1,
                "name": location_data.name,
                "latitude_deg": location_data.latitude_deg,
                "longitude_deg": location_data.longitude_deg,
                "elevation_m": location_data.elevation_m,
                "timezone": location_data.timezone,
            }
            self._next_id = 2
            logger.info("Seeded default location: %s", location_data.name)

    def list_locations(self) -> list:
        """Return all saved locations."""
        return list(self._locations.values())

    def get_location(self, location_id: int) -> Optional[dict]:
        """Get a location by ID."""
        return self._locations.get(location_id)

    def create_location(self, location_data) -> dict:
        """Create a new location."""
        loc = {
            "id": self._next_id,
            "name": location_data.name,
            "latitude_deg": location_data.latitude_deg,
            "longitude_deg": location_data.longitude_deg,
            "elevation_m": location_data.elevation_m,
            "timezone": location_data.timezone,
        }
        self._locations[self._next_id] = loc
        self._next_id += 1
        logger.info("Created location: %s (id=%d)", loc["name"], loc["id"])
        return loc
