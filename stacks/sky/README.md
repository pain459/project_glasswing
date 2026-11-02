# Skytoday — Pathfinder Sky

Personal Astronomy Intelligence Platform for the Glasswing stack on Pathfinder.

## Overview

Skytoday calculates, stores, and serves astronomical data for arbitrary geographic
locations and dates. It uses **Skyfield** with JPL DE441S ephemeris for scientifically
accurarise calculations of solar, lunar, and planetary positions and events.

## Architecture

| Service | Image | Port | Purpose |
|---|---|---|---|
| `glasswing-sky-api` | Built from `Dockerfile.api` | Internal (8000) | FastAPI backend with astronomy calculations |
| `glasswing-sky-web` | Built from `Dockerfile.web` | 5088 | Next.js frontend dashboard |
| `glasswing-sky-worker` | Built from `Dockerfile.worker` | Internal | Background scheduler (Phase 5+) |
| `glasswing-sky-postgres` | `postgres:17-alpine` | Internal (5432) | PostgreSQL database |

## Science Stack

- **Skyfield** — JPL DE-series ephemeris, solar/lunar event finding
- **Astropy** — Coordinate transformations
- **NumPy** — Numerical operations
- **DE441S** — JPL ephemeris kernel (1900–2050, ~6 MB)

## Deployment

```bash
# 1. Register secrets in Infisical
./scripts/infisical-register.sh /sky stacks/sky/sky.registry

# 2. Deploy
make up STACK=sky

# 3. Verify
make check STACK=sky
```

## API Endpoints

All endpoints are prefixed with `/api/v1/` and accessible through the Next.js
frontend at port 5088 (rewritten to the API container internally).

| Endpoint | Description |
|---|---|
| `GET /health/live` | Liveness probe |
| `GET /health/ready` | Readiness probe (ephemeris loaded) |
| `GET /api/v1/system/status` | Engine and ephemeris status |
| `GET /api/v1/sky/daily` | Full daily sky briefing |
| `GET /api/v1/sun` | Solar events and positions |
| `GET /api/v1/moon` | Lunar phase and events |
| `GET /api/v1/planets` | All planet positions |
| `GET /api/v1/planets/{planet}` | Single planet data |
| `GET /api/v1/locations` | Saved observing locations |

All endpoints accept `date`, `location_id`, `latitude`, `longitude`, and
`timezone` query parameters.

## Database

PostgreSQL with Alembic migrations. Initial migration creates tables for
locations, ephemeris assets, astronomical objects, events, daily snapshots,
and calculation runs.

## Phases

- **Phase 0-1 (current):** Science core, API, deployment, basic frontend
- **Phase 2:** Milky Way visibility, observation recommendations
- **Phase 3:** Event calendar, meteor showers, eclipse predictions
- **Phase 4:** Weather integration, satellite tracking
- **Phase 5:** Full database persistence, scheduled workers
- **Phase 6:** Complete frontend with all explorers
- **Phase 7:** Content enrichment, local events
- **Phase 8:** Production hardening, monitoring, backups

## Data

Ephemeris kernels are downloaded at first startup via `pre-up.sh` and cached
in the `glasswing-sky-ephemeris-data` Docker volume. Subsequent deploys skip
the download if the checksum matches.

## Secrets

| Key | Purpose |
|---|---|
| `SKY_POSTGRES_USER` | Database user |
| `SKY_POSTGRES_PASSWORD` | Database password |
| `SKY_POSTGRES_DB` | Database name |

Registered via `stacks/sky/sky.registry` and `scripts/infisical-register.sh`.
