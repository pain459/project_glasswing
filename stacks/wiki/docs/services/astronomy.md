# Astronomy

Celestial mechanics, ephemeris data, and observing conditions.

---

## Skytoday

> **Astronomy intelligence — solar, lunar, planetary positions, ISS tracking, weather observing conditions**

- **URL:** [http://192.168.68.62:5088](http://192.168.68.62:5088)
- **Port:** `:5088`
- **Containers:** `glasswing-sky-web`, `glasswing-sky-api`, `glasswing-sky-worker`, `glasswing-sky-postgres`
- **Stack:** `stacks/sky/`

### How it works

Custom-built astronomy platform with four containers:

```
┌─────────────┐     ┌─────────────┐
│  sky-web    │────▶│  sky-api    │
│  (nginx +   │     │  (FastAPI)  │
│  React)     │     └──────┬──────┘
└──────┬──────┘            │
       │                   ├── PostgreSQL (ephemeris data)
       │                   │
       │                   ├── sky-worker (background jobs)
       │                   │     └── Fetch Open-Meteo weather
       │                   │     └── Compute celestial positions
       │                   │
       └───────────────────┴── Panchangam integration
```

### Features

- **Solar data:** Sunrise, sunset, solar noon, twilight times
- **Lunar data:** Moonrise, moonset, phases, illumination
- **Planetary positions:** Real-time ephemeris for all major planets
- **ISS tracking:** Next passes over your location
- **Weather observing conditions:** Sky clarity, humidity, wind from Open-Meteo
- **Panchangam integration:** Hindu calendar data for cultural context

### Data sources

- **Open-Meteo API:** Weather and astronomical data (free, no API key)
- **Internal computations:** Celestial mechanics via Python libraries
- **PostgreSQL:** Persistent storage for computed ephemeris data
