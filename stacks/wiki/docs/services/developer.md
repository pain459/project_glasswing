# Developer Workbench

Tools for coding, data analysis, documentation, and development utilities.

---

## Forgejo

> **Private Git hosting — self-hosted fork of Gitea**

- **URL:** [http://192.168.68.62:3011](http://192.168.68.62:3011)
- **Ports:** `:3011` (web), `:2222` (SSH)
- **Container:** `glasswing-forgejo`
- **Stack:** `stacks/forgejo/`

### How it works

Self-hosted Git repository manager. Fork of Gitea, which itself is a fork of Gogs. Provides:
- Repository hosting with web UI
- Pull requests and code review
- Issue tracking and milestones
- CI/CD hooks
- SSH access on port 2222

### Usage

Clone repositories via:
```bash
git clone http://192.168.68.62:3011/user/repo.git
git clone git@192.168.68.62:2222:user/repo.git
```

---

## JupyterLab

> **Python notebooks — data science, ML experiments, exploration**

- **URL:** [http://192.168.68.62:8889](http://192.168.68.62:8889)
- **Port:** `:8889`
- **Container:** `glasswing-jupyterlab`
- **Stack:** `stacks/jupyterlab/`

### How it works

Interactive Python environment for:
- Data exploration and visualization
- Machine learning experiments
- SQL queries against PostgreSQL
- Script prototyping

Persistent workspace with saved notebooks on Docker volume.

---

## DBGate

> **Database administration — query builder, schema browser, exports**

- **URL:** [http://192.168.68.62:3004](http://192.168.68.62:3004)
- **Port:** `:3004`
- **Container:** `glasswing-dbgate`
- **Stack:** `stacks/dbgate/`

### How it works

Web-based database management tool. Connects to:
- PostgreSQL (shared database server)
- DuckDB (ATLAS engine)
- Any other database via connection strings

Features:
- Visual query builder
- Schema browser
- Data export (CSV, JSON, SQL)
- Multi-database support

---

## Excalidraw

> **Hand-drawn style whiteboard — architecture diagrams, brainstorming**

- **URL:** [http://192.168.68.62:3009](http://192.168.68.62:3009)
- **Port:** `:3009`
- **Container:** `glasswing-excalidraw`
- **Stack:** `stacks/excalidraw/`

### How it works

Collaborative whiteboard with hand-drawn aesthetic. Used for:
- Architecture diagrams
- System design sketches
- Brainstorming sessions
- Flowcharts and wireframes

---

## CyberChef

> **Encode, decode, encrypt, hash, compress — data analysis recipes**

- **URL:** [http://192.168.68.62:3013](http://192.168.68.62:3013)
- **Port:** `:3013`
- **Container:** `glasswing-cyberchef`
- **Stack:** `stacks/cyberchef/`

### How it works

"The Cyber Swiss Army Knife" — collection of 200+ operations for:
- Base64 / Hex / URL encoding
- Encryption / Decryption (AES, RSA)
- Hashing (SHA, MD5)
- Compression (GZIP, ZIP)
- JSON / XML parsing
- Custom recipe chains

---

## IT-Tools

> **Developer utilities — JSON, UUID, regex, base64, hash generators**

- **URL:** [http://192.168.68.62:3015](http://192.168.68.62:3015)
- **Port:** `:3015`
- **Container:** `glasswing-it-tools`
- **Stack:** `stacks/it-tools/`

### How it works

Collection of 50+ developer utilities:
- JSON formatter and validator
- UUID generator
- Regex tester
- Base64 encoder/decoder
- Hash generators
- Color converters
- Cron expression builder

---

## Calculators

> **Math, finance, unit conversion, scientific calculators**

- **URL:** [http://192.168.68.62:3021](http://192.168.68.62:3021)
- **Port:** `:3021`
- **Container:** `glasswing-calculators`
- **Stack:** `stacks/calculators/`

### How it works

Web-based calculator suite:
- Scientific calculator
- Financial calculator (loans, interest)
- Unit converter (length, weight, temperature)
- Percentage calculator
- BMI and health calculators

---

## Stirling-PDF

> **PDF processing — merge, split, OCR, convert, sign, watermark**

- **URL:** [http://192.168.68.62:3016](http://192.168.68.62:3016)
- **Port:** `:3016`
- **Container:** `glasswing-stirling-pdf`
- **Stack:** `stacks/stirling-pdf/`

### How it works

Self-hosted PDF manipulation tool. Supports:
- Merge / split PDFs
- OCR on scanned documents
- Format conversion (PDF to image, image to PDF)
- Digital signatures
- Watermarks and stamps
- Page rotation and reordering
- Password protection
