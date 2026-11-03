"""
LocationService — Manages observing locations.

Uses PostgreSQL persistence via SQLAlchemy when a database session is
provided. Falls back to an in-memory store when the database is
unavailable (e.g., during startup before migrations have run).
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session

from api.models.database import Location

logger = logging.getLogger(__name__)


class LocationService:
    """Manages saved observing locations with PostgreSQL persistence."""

    def __init__(self, db: Optional[Session] = None):
        self._db = db
        self._fallback_locations = {}
        self._fallback_next_id = 1
        self._use_db = db is not None

        if self._use_db:
            logger.info("LocationService initialized with database session")
        else:
            logger.info("No database session, using in-memory location store")

    def ensure_default_location(self, location_data):
        """Seed the default location if no locations exist."""
        if self._use_db:
            try:
                existing = self._db.query(Location).filter(
                    Location.is_default.is_(True)
                ).first()
                if not existing:
                    new_loc = Location(
                        name=location_data.name,
                        latitude_deg=location_data.latitude_deg,
                        longitude_deg=location_data.longitude_deg,
                        elevation_m=location_data.elevation_m,
                        timezone=location_data.timezone,
                        is_default=True,
                    )
                    self._db.add(new_loc)
                    self._db.commit()
                    logger.info("Seeded default location: %s", location_data.name)
            except Exception as exc:
                logger.warning("DB seed failed, falling back to in-memory: %s", exc)
                self._use_db = False
                self._seed_in_memory(location_data)
        else:
            self._seed_in_memory(location_data)

    def _seed_in_memory(self, location_data):
        """Seed default location in the in-memory fallback store."""
        if not self._fallback_locations:
            self._fallback_locations[1] = {
                "id": 1,
                "name": location_data.name,
                "latitude_deg": location_data.latitude_deg,
                "longitude_deg": location_data.longitude_deg,
                "elevation_m": location_data.elevation_m,
                "timezone": location_data.timezone,
            }
            self._fallback_next_id = 2
            logger.info("Seeded default location (in-memory): %s", location_data.name)

    def list_locations(self) -> list:
        """Return all saved locations."""
        if self._use_db:
            try:
                rows = self._db.query(Location).all()
                return [self._location_to_dict(r) for r in rows]
            except Exception as exc:
                logger.warning("DB list failed: %s", exc)
                self._use_db = False
                return list(self._fallback_locations.values())
        return list(self._fallback_locations.values())

    def get_location(self, location_id: int) -> Optional[dict]:
        """Get a location by ID."""
        if self._use_db:
            try:
                row = self._db.query(Location).filter(
                    Location.id == location_id
                ).first()
                return self._location_to_dict(row) if row else None
            except Exception as exc:
                logger.warning("DB get failed: %s", exc)
                self._use_db = False
                return self._fallback_locations.get(location_id)
        return self._fallback_locations.get(location_id)

    def create_location(self, location_data) -> dict:
        """Create a new location."""
        if self._use_db:
            try:
                new_loc = Location(
                    name=location_data.name,
                    latitude_deg=location_data.latitude_deg,
                    longitude_deg=location_data.longitude_deg,
                    elevation_m=getattr(location_data, 'elevation_m', 0.0),
                    timezone=getattr(location_data, 'timezone', 'UTC'),
                )
                self._db.add(new_loc)
                self._db.commit()
                self._db.refresh(new_loc)
                result = self._location_to_dict(new_loc)
                logger.info("Created location: %s (id=%d)", result["name"], result["id"])
                return result
            except Exception as exc:
                logger.warning("DB create failed, falling back to in-memory: %s", exc)
                self._use_db = False
                return self._create_in_memory(location_data)
        return self._create_in_memory(location_data)

    def _create_in_memory(self, location_data) -> dict:
        """Create a location in the in-memory fallback store."""
        loc = {
            "id": self._fallback_next_id,
            "name": location_data.name,
            "latitude_deg": location_data.latitude_deg,
            "longitude_deg": location_data.longitude_deg,
            "elevation_m": getattr(location_data, 'elevation_m', 0.0),
            "timezone": getattr(location_data, 'timezone', 'UTC'),
        }
        self._fallback_locations[self._fallback_next_id] = loc
        self._fallback_next_id += 1
        logger.info("Created location (in-memory): %s (id=%d)", loc["name"], loc["id"])
        return loc

    @staticmethod
    def _location_to_dict(row: Location) -> dict:
        """Convert a Location model row to a dictionary."""
        return {
            "id": row.id,
            "name": row.name,
            "latitude_deg": row.latitude_deg,
            "longitude_deg": row.longitude_deg,
            "elevation_m": row.elevation_m,
            "timezone": row.timezone,
        }
