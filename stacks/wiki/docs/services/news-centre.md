# News Centre

News aggregation and RSS feed management.

---

## Glance

> **Visual news dashboard — 7 curated pages of feeds, widgets, bookmarks**

- **URL:** [http://192.168.68.62:3026](http://192.168.68.62:3026)
- **Port:** `:3026`
- **Container:** `glasswing-glance`
- **Stack:** `stacks/news-centre/`

### How it works

Minimalist news dashboard that aggregates content from multiple sources:
- RSS feeds
- News websites
- Weather widgets
- Bookmarks
- Custom pages

7 curated pages covering technology, science, local news, and more.

---

## FreshRSS

> **RSS feed manager — persistent subscriptions, auto-refresh, categories**

- **URL:** [http://192.168.68.62:3027](http://192.168.68.62:3027)
- **Port:** `:3027`
- **Container:** `glasswing-freshrss`
- **Stack:** `stacks/news-centre/`

### How it works

Self-hosted RSS feed aggregator:
- Subscribe to any RSS/Atom feed
- Organize feeds into categories
- Auto-refresh at configurable intervals
- Mark articles as read/unread
- Full-text mode for paywalled articles
- Mobile-friendly interface
