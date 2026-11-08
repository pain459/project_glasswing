#!/usr/bin/env python3
"""Generate the 'Token Cost Comparison' dashboard.

5 separate tables (one per period: Today, This Week, This Month, This Year, All-Time).
Each table shows all 10 providers as rows using a single 'or'-joined query.
No transformations — the table panel auto-expands series into rows.

Local cost: power-based (host energy counter, includes CPU + GPU).
Cloud cost: token-based (tokens × provider rates from LiteLLM metrics).

Dynamic dates: uses Grafana query-type template variables that return the
latest date/week from the metrics, so the dashboard always shows current data.
"""
import json

DS = {"type": "prometheus", "uid": "PDC628E2375F40484"}

# Cloud vendor pricing, per MTok: (input, output, cache_read)
VENDORS = [
    ("DeepSeek V4.1 Flash", 0.14, 0.28, 0.014),
    ("DeepSeek V4 Pro",     0.28, 0.42, 0.028),
    ("Gemini 3.1 Flash-Lite", 0.075, 0.30, 0.0075),
    ("Gemini 3.8 Flash",    0.19, 0.75, 0.019),
    ("Claude Haiku 4.5",    1.00, 5.00, 0.10),
    ("Claude Sonnet 5.5",   3.00, 15.00, 0.30),
    ("Claude Opus 5.5",     15.00, 75.00, 1.50),
    ("GPT-5.4",             1.25, 10.00, 0.125),
    ("GPT-5.5",             2.50, 15.00, 0.25),
]

# Period -> (title, date filter, week filter, energy window)
# Energy window is used for increase() on the host energy counter.
PERIODS = [
    ("Today",         'date="${today}"', None, "1d"),
    ("This Week",      None, 'week="${week}"', "7d"),
    ("This Month",     'date=~"${month}.*"', None, "30d"),
    ("This Year",      'date=~"${year}.*"', None, "365d"),
    ("All-Time",       None, None, "365d"),
]

def sel(metric, date_f, week_f):
    if date_f and week_f:
        return f'{metric}{{{date_f},{week_f}}}'
    if date_f:
        return f'{metric}{{{date_f}}}'
    if week_f:
        return f'{metric}{{{week_f}}}'
    return metric

def sum_by(metric, date_f, week_f):
    return f'sum({sel(metric, date_f, week_f)})'

def cloud_cost_expr(date_f, week_f, in_r, out_r, cache_r):
    p = sum_by('litellm_prompt_tokens', date_f, week_f)
    c = sum_by('litellm_completion_tokens', date_f, week_f)
    k = sum_by('litellm_cached_tokens', date_f, week_f)
    return (f'({p} * {in_r} + {c} * {out_r} + {k} * {cache_r}) / 1000000')

def local_cost_expr(window):
    """Local cost from the host energy counter (includes CPU + GPU).

    Uses increase() on the counter to get actual energy consumed in the window.
    No projection — only reports energy actually measured.
    Units: microjoules → /3.6e12 → kWh → × 9 INR/kWh → / 94.66 INR/USD → USD.
    """
    energy = f'sum(increase(scaph_host_energy_microjoules[{window}]))'
    return (f'{energy} / 3600000000000 * 9 / 94.66')

def build_period_expr(date_f, week_f, window):
    """Build a single 'or'-joined expression for one period (all providers as rows)."""
    parts = [f'label_replace({local_cost_expr(window)}, "provider", "Local (LiteLLM)", "", "")']
    for name, in_r, out_r, cache_r in VENDORS:
        parts.append(f'label_replace({cloud_cost_expr(date_f, week_f, in_r, out_r, cache_r)}, "provider", "{name}", "", "")')
    return ' or '.join(parts)

def make_panel(panel_id, title, expr, grid_y):
    return {
        "datasource": DS,
        "fieldConfig": {
            "defaults": {
                "color": {"mode": "thresholds"},
                "custom": {"align": "auto", "cellOptions": {"type": "auto"}, "inspect": False},
                "mappings": [],
                "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": None}]},
                "unit": "currencyUSD",
            },
            "overrides": [
                {
                    "matcher": {"id": "byName", "options": "provider"},
                    "properties": [{"id": "custom.width", "value": 220}],
                }
            ],
        },
        "gridPos": {"h": 12, "w": 12, "x": 0, "y": grid_y},
        "id": panel_id,
        "options": {
            "cellHeight": "sm",
            "footer": {"countRows": False, "fields": "", "reducer": ["sum"], "show": False},
            "showHeader": True,
            "sortBy": [{"desc": True, "displayName": "Value"}],
        },
        "pluginVersion": "11.1.0",
        "targets": [{
            "datasource": DS,
            "disableTextWrap": False,
            "editorMode": "code",
            "expr": expr,
            "format": "table",
            "fullMetaSearch": False,
            "includeNull": True,
            "instant": True,
            "legendFormat": "{{provider}}",
            "range": False,
            "refId": "A",
        }],
        "title": title,
        "type": "table",
    }

def build_dashboard():
    panels = []
    for i, (title, date_f, week_f, window) in enumerate(PERIODS):
        expr = build_period_expr(date_f, week_f, window)
        panels.append(make_panel(i + 1, title, expr, i * 12))

    dashboard = {
        "annotations": {"list": []},
        "editable": True,
        "fiscalYearStartMonth": 0,
        "graphPaper": {},
        "links": [],
        "liveNow": False,
        "panels": panels,
        "refresh": "1m",
        "schemaVersion": 39,
        "tags": ["glasswing-power", "cost-comparison", "tokens"],
        "templating": {"list": [
            # Dynamic date variables — query the latest values from the metrics.
            # These auto-update as new data arrives, so the dashboard always
            # shows the current date/week/month/year.
            {"name": "today", "label": "Date", "type": "query",
             "datasource": DS,
             "query": "label_values(scaph_host_energy_microjoules, date)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "week", "label": "Week", "type": "query",
             "datasource": DS,
             "query": "label_values(scaph_host_energy_microjoules, week)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "month", "label": "Month", "type": "query",
             "datasource": DS,
             "query": "label_values(scaph_host_energy_microjoules, date)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "year", "label": "Year", "type": "query",
             "datasource": DS,
             "query": "label_values(scaph_host_energy_microjoules, date)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
        ]},
        "time": {"from": "now-7d", "to": "now"},
        "timepicker": {},
        "timezone": "browser",
        "title": "Token Cost Comparison (Local vs Cloud)",
        "uid": "token-cost-comparison",
        "version": 1,
        "weekStart": "",
    }
    return dashboard

if __name__ == "__main__":
    d = build_dashboard()
    out = "dashboards/token-cost-comparison.json"
    with open(out, "w") as f:
        json.dump(d, f, indent=2)
    print(f"Wrote {out}")
    print(f"Panels: {len(d['panels'])}")
    for p in d['panels']:
        print(f"  {p['id']}: {p['title']} (expr {len(p['targets'][0]['expr'])} chars)")
