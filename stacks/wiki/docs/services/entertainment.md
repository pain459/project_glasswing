# Entertainment

Media streaming and digital library services.

---

## Plex

> **Media server — movies, TV, documentaries, home videos, music library**

- **URL:** [http://192.168.68.62:32400/web](http://192.168.68.62:32400/web)
- **Port:** `:32400`
- **Container:** `glasswing-plex`
- **Stack:** `stacks/plex/`

### How it works

Full-featured media server that organizes and streams content:

```
Media libraries (host volumes)
    │
    ├── Movies/
    ├── TV Shows/
    ├── Documentaries/
    ├── Music/
    └── Photos/
    │
    ▼
Plex Media Server
    │
    ├── Metadata fetching (posters, descriptions)
    ├── Transcoding (GPU-accelerated via RTX 4090)
    └── Streaming to clients
```

### Features

- Automatic media library scanning
- Metadata enrichment (posters, plots, cast info)
- Hardware transcoding via NVIDIA GPU
- Multi-user support with individual watchlists
- Remote access via Plex Relay
- Mobile and TV app support

---

## Kavita

> **Digital library — books, comics, manga, CBZ/CBR readers**

- **URL:** [http://192.168.68.62:3017](http://192.168.68.62:3017)
- **Port:** `:3017`
- **Container:** `glasswing-kavita`
- **Stack:** `stacks/kavita/`

### How it works

Self-hosted digital reading platform:

```
Book libraries (host volumes)
    │
    ├── EPUB/
    ├── CBZ / CBR/
    ├── PDF/
    └── HTML/
    │
    ▼
Kavita Server
    │
    ├── Built-in readers (EPUB, comic, PDF)
    ├── Reading progress tracking
    └── Multi-user support
```

### Supported formats

- EPUB, CBZ, CBR, PDF, HTML, MOBI
- Comic book metadata fetching
- Reading progress sync across devices
- User-specific shelves and collections
