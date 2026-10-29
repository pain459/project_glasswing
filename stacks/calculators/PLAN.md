# Glasswing Calculators — Self-Hosted Calculator Soup Replica

## Overview

Static calculator hub serving 526 calculators (math, financial, conversions, statistics, geometry, physics, health, time, algebra, technology and more) inspired by CalculatorSoup.com. Pure HTML/CSS/JS served by nginx — no backend, no database.

**URL:** `http://pathfinder:3021`

## Architecture

```
calculators/
├── compose.yaml              # nginx:alpine serving static files
├── secrets.list
├── PLAN.md                   # this file
└── public/                   # served as /usr/share/nginx/html
    ├── index.html            # home page with category cards
    ├── css/
    │   └── site.css          # shared styles
    ├── js/
    │   ├── core.js           # shared utilities
    │   ├── calculators/      # one JS module per calculator
    │   └── conversions/      # JSON factor tables
    └── pages/                # one HTML file per calculator
        ├── financial/
        ├── math/
        ├── conversions/
        ├── health/
        └── statistics/
```

## Phase Plan

### Phase 1: Foundation (current)
- [x] Project structure & compose.yaml
- [ ] Shared template (index.html, site.css, core.js)
- [ ] 5 representative calculators: loan, percentage, distance converter, BMI, mean/median/mode
- [ ] Deploy & test

### Phase 2: Core Coverage (~40 calculators)
- Financial: mortgage, compound interest, ROI, amortization, etc.
- Math: GCF, LCM, prime factorization, fractions, exponents
- Conversions: weight, temperature, area, volume, speed
- Statistics: random number generator, character counter, GPA
- Geometry: circle, rectangle, triangle

### Phase 3: Extended Coverage (~100 calculators)
- Remaining financial, time & date, algebra, physics, construction, health, games/random, discrete math, technology, trigonometry

### Phase 4: Polish
- Search, bookmarks, PWA, dark mode toggle, shareable URLs

## What We're Skipping

- All 526 calculators (80/20 rule, ~100 is enough)
- Currency converter (needs live API)
- US tax estimator (changes yearly)
- Chemistry (needs compound DB)
- Word problems (educational only)
