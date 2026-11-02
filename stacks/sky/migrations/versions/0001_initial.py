"""Initial migration — create all base tables.

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[tuple, None] = None
depends_on: Union[tuple, None] = None


def upgrade() -> None:
    # locations
    op.create_table(
        'locations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('latitude_deg', sa.Float(), nullable=False),
        sa.Column('longitude_deg', sa.Float(), nullable=False),
        sa.Column('elevation_m', sa.Float(), server_default='0.0'),
        sa.Column('timezone', sa.String(50), server_default='UTC'),
        sa.Column('is_default', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_locations_name', 'locations', ['name'])

    # ephemeris_assets
    op.create_table(
        'ephemeris_assets',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(50), nullable=False, unique=True),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('coverage_start', sa.Integer(), nullable=False),
        sa.Column('coverage_end', sa.Integer(), nullable=False),
        sa.Column('downloaded_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
    )

    # astronomical_objects
    op.create_table(
        'astronomical_objects',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('catalog_id', sa.String(50), nullable=False, unique=True),
        sa.Column('common_name', sa.String(200)),
        sa.Column('object_type', sa.String(50), nullable=False),
        sa.Column('ra_deg', sa.Float(), nullable=False),
        sa.Column('dec_deg', sa.Float(), nullable=False),
        sa.Column('epoch', sa.String(10), server_default='J2000'),
        sa.Column('apparent_magnitude', sa.Float()),
        sa.Column('angular_size_arcsec', sa.Float()),
        sa.Column('constellation', sa.String(50)),
        sa.Column('description', sa.Text()),
        sa.Column('metadata_json', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_objects_type', 'astronomical_objects', ['object_type'])
    op.create_index('ix_objects_constellation', 'astronomical_objects', ['constellation'])

    # astronomical_events
    op.create_table(
        'astronomical_events',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('start_utc', sa.DateTime(), nullable=False),
        sa.Column('peak_utc', sa.DateTime()),
        sa.Column('end_utc', sa.DateTime()),
        sa.Column('source', sa.String(100)),
        sa.Column('confidence', sa.Float(), server_default='1.0'),
        sa.Column('is_global', sa.Boolean(), server_default='true'),
        sa.Column('metadata_json', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_events_type', 'astronomical_events', ['event_type'])
    op.create_index('ix_events_start', 'astronomical_events', ['start_utc'])

    # daily_sky_snapshots
    op.create_table(
        'daily_sky_snapshots',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('location_id', sa.Integer(), sa.ForeignKey('locations.id'), nullable=False),
        sa.Column('date_utc', sa.DateTime(), nullable=False),
        sa.Column('solar_data', sa.JSON()),
        sa.Column('lunar_data', sa.JSON()),
        sa.Column('planet_data', sa.JSON()),
        sa.Column('milkyway_data', sa.JSON()),
        sa.Column('weather_data', sa.JSON()),
        sa.Column('calculated_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('engine_version', sa.String(50)),
        sa.Column('ephemeris_name', sa.String(50)),
    )
    op.create_index('ix_snapshots_location_date', 'daily_sky_snapshots',
                    ['location_id', 'date_utc'], unique=True)

    # calculation_runs
    op.create_table(
        'calculation_runs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('job_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('started_at', sa.DateTime()),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('duration_seconds', sa.Float()),
        sa.Column('error_message', sa.Text()),
        sa.Column('metadata_json', sa.JSON()),
    )


def downgrade() -> None:
    op.drop_table('calculation_runs')
    op.drop_table('daily_sky_snapshots')
    op.drop_table('astronomical_events')
    op.drop_table('astronomical_objects')
    op.drop_table('ephemeris_assets')
    op.drop_table('locations')
