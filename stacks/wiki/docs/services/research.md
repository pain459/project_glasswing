# Research & Intelligence

Disaster intelligence, earth observation, and service cataloging.

---

## ATLAS

> **Planetary disaster intelligence — real-time earthquake, cyclone, fire, flood tracking**

- **URL:** [http://192.168.68.62:5090](http://192.168.68.62:5090)
- **Port:** `:5090`
- **Containers:** `glasswing-atlas-web`, `glasswing-atlas-engine`
- **Stack:** `stacks/atlas/`

### How it works

Open-source planetary disaster intelligence platform with 3D globe visualization:

```
┌──────────────────┐
│  atlas-web       │
│  (nginx +        │──── /api/ ────▶  atlas-engine
│   React/Cesium)  │     (FastAPI)
└──────────────────┘                │
                                    ├── DuckDB (spatial queries)
                                    │     └── H3 extensions
                                    │     └── Spatial extensions
                                    │
                                    └── Data feeds (outbound)
                                          ├── USGS earthquakes
                                          ├── GDACS disasters
                                          ├── NASA EONET
                                          └── Fire detection feeds
```

### Architecture

- **Web container:** Nginx serving React frontend with CesiumJS 3D globe
- **Engine container:** FastAPI backend with DuckDB for spatial analytics
- **DuckDB volume:** Persistent data at `/data/runtime`
- **Network:** Not internal (engine needs outbound internet for data feeds)

### Data sources

| Source | Data Type |
|--------|-----------|
| USGS | Real-time earthquake feeds |
| GDACS | Global disaster alerts |
| NASA EONET | Earth observation events |
| Fire detection | Active fire hotspots |

### Key design decisions

- `pnpm-workspace.yaml` copied for `_repo_root()` resolution
- Entrypoint script handles volume permissions via `gosu`
- `atlas setup` runs on first start to initialize DuckDB extensions
- Memory limit 4g for DuckDB extension download headroom
- Health check start_period 120s (setup takes ~40-50s)

---

## Service Catalog

> **Complete stack service directory with search**

- **URL:** [http://192.168.68.62:3029](http://192.168.68.62:3029)
- **Port:** `:3029`
- **Container:** `glasswing-catalog`
- **Stack:** `stacks/catalog/`

### How it works

Static HTML page served via nginx. Documents all 40+ services across 10 categories with:
- Service names, descriptions, ports
- Container names and tech badges
- Real-time search/filter
- Dark theme consistent with Glasswing aesthetic
