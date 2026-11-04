# Home Management

Inventory tracking and document management for household organization.

---

## HomeBox

> **Home inventory & organization — catalog items, locations, warranties**

- **URL:** [http://192.168.68.62:3024](http://192.168.68.62:3024)
- **Port:** `:3024`
- **Container:** `glasswing-homebox`
- **Stack:** `stacks/homebox/`

### How it works

Home inventory management system. Tracks:
- Items with photos and descriptions
- Locations and categories
- Purchase dates and warranty info
- Insurance values
- QR code labels for physical items

---

## Paperless-ngx

> **Document management — scan, OCR, index, search & archive papers**

- **URL:** [http://192.168.68.62:3025](http://192.168.68.62:3025)
- **Port:** `:3025`
- **Containers:** `glasswing-paperless`, `glasswing-paperless-broker`, `glasswing-paperless-db`
- **Stack:** `stacks/paperless/`

### How it works

Document management system that digitizes physical papers:

```
Document upload (PDF, image)
    │
    ▼
OCR processing (Tesseract)
    │
    ▼
Auto-tagging & classification
    │
    ▼
PostgreSQL (metadata index)
    │
    ▼
Full-text search
```

### Architecture

- **Web container:** Main application and UI
- **Broker (Redis):** Task queue for OCR jobs
- **Database (PostgreSQL):** Document metadata and search index
- **Data volume:** Stores original documents and OCR results

### Features

- Full-text search across all documents
- Automatic document type detection
- Tag-based organization
- Correspondent and document type management
- API for programmatic access
