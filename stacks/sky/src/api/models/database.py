"""
SQLAlchemy database models for Skytoday.

Tables:
- locations: Saved observing locations
- ephemeris_assets: Ephemeris kernel metadata
- astronomical_objects: Star and deep-sky object catalogues
- astronomical_events: Calculated and sourced astronomical events
- daily_sky_snapshots: Cached daily sky summaries
- calculation_runs: Calculation job tracking
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Float, Integer, String, Text, JSON, Index,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    latitude_deg = Column(Float, nullable=False)
    longitude_deg = Column(Float, nullable=False)
    elevation_m = Column(Float, default=0.0)
    timezone = Column(String(50), default="UTC")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_locations_name", "name"),
    )


class EphemerisAsset(Base):
    __tablename__ = "ephemeris_assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    file_path = Column(String(500), nullable=False)
    sha256 = Column(String(64), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    coverage_start = Column(Integer, nullable=False)
    coverage_end = Column(Integer, nullable=False)
    downloaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)


class AstronomicalObject(Base):
    __tablename__ = "astronomical_objects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    catalog_id = Column(String(50), nullable=False, unique=True)
    common_name = Column(String(200))
    object_type = Column(String(50), nullable=False)  # star, planet, messier, ngc, etc.
    ra_deg = Column(Float, nullable=False)
    dec_deg = Column(Float, nullable=False)
    epoch = Column(String(10), default="J2000")
    apparent_magnitude = Column(Float)
    angular_size_arcsec = Column(Float)
    constellation = Column(String(50))
    description = Column(Text)
    metadata_json = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_objects_type", "object_type"),
        Index("ix_objects_constellation", "constellation"),
    )


class AstronomicalEvent(Base):
    __tablename__ = "astronomical_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50), nullable=False)  # solar, lunar, planetary, meteor, etc.
    name = Column(String(200), nullable=False)
    description = Column(Text)
    start_utc = Column(DateTime, nullable=False)
    peak_utc = Column(DateTime)
    end_utc = Column(DateTime)
    source = Column(String(100))
    confidence = Column(Float, default=1.0)
    is_global = Column(Boolean, default=True)
    metadata_json = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_events_type", "event_type"),
        Index("ix_events_start", "start_utc"),
    )


class DailySkySnapshot(Base):
    __tablename__ = "daily_sky_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    date_utc = Column(DateTime, nullable=False)
    solar_data = Column(JSON)
    lunar_data = Column(JSON)
    planet_data = Column(JSON)
    milkyway_data = Column(JSON)
    weather_data = Column(JSON)
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    engine_version = Column(String(50))
    ephemeris_name = Column(String(50))

    __table_args__ = (
        Index("ix_snapshots_location_date", "location_id", "date_utc", unique=True),
    )


class CalculationRun(Base):
    __tablename__ = "calculation_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    duration_seconds = Column(Float)
    error_message = Column(Text)
    metadata_json = Column(JSON)
