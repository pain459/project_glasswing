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

# Period -> (title, date filter, week filter, month filter, year filter, energy window)
# Local cost filters the per-day GPU energy metric by calendar labels, so each
# table sums exactly the days belonging to that period. No rolling windows,
# no projection.
PERIODS = [
    ("Today",         'date="${today}"', None, None, None, None),
    ("This Week",      None, 'week="${week}"', None, None, None),
    ("This Month",     None, None, 'month="${month}"', None, None),
    ("This Year",      None, None, None, 'year="${year}"', None),
    ("All-Time",       None, None, None, None, None),
]

def sel(metric, date_f, week_f, month_f, year_f):
    filters = [f for f in [date_f, week_f, month_f, year_f] if f]
    if filters:
        return f'{metric}{{{",".join(filters)}}}'
    return metric

def sum_by(metric, date_f, week_f, month_f, year_f):
    return f'sum({sel(metric, date_f, week_f, month_f, year_f)})'

def cloud_cost_expr(date_f, week_f, month_f, year_f, in_r, out_r, cache_r):
    p = sum_by('litellm_prompt_tokens', date_f, week_f, month_f, year_f)
    c = sum_by('litellm_completion_tokens', date_f, week_f, month_f, year_f)
    k = sum_by('litellm_cached_tokens', date_f, week_f, month_f, year_f)
    # 'or vector(0)' makes an empty period (no tokens used yet) show $0.00
    # instead of "No data".
    return (f'(({p} * {in_r} + {c} * {out_r} + {k} * {cache_r}) / 1000000) or vector(0)')

def local_cost_expr(energy_f):
    """Local cost from per-day GPU energy (gpu_energy_daily_joules).

    The exporter integrates the nvidia_gpu_power_watts gauge over each
    calendar day and labels it with date/week/month/year. Summing the days
    belonging to each period gives the actual measured energy — no
    projection, no rolling windows.

    Units: joules → /3.6e6 → kWh → × 9 INR/kWh → / 94.66 INR/USD → USD.
    """
    metric = f'gpu_energy_daily_joules{{{energy_f}}}' if energy_f else 'gpu_energy_daily_joules'
    return f'sum({metric}) / 3600000 * 9 / 94.66'

def build_period_expr(date_f, week_f, month_f, year_f, _window):
    """Build a single 'or'-joined expression for one period (all providers as rows)."""
    energy_f = date_f or week_f or month_f or year_f
    parts = [f'label_replace({local_cost_expr(energy_f)}, "provider", "Local (GPU power)", "", "")']
    for name, in_r, out_r, cache_r in VENDORS:
        parts.append(f'label_replace({cloud_cost_expr(date_f, week_f, month_f, year_f, in_r, out_r, cache_r)}, "provider", "{name}", "", "")')
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
                },
                {
                    "matcher": {"id": "byName", "options": "Time"},
                    "properties": [{"id": "custom.hidden", "value": True}],
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
    for i, (title, date_f, week_f, month_f, year_f, window) in enumerate(PERIODS):
        expr = build_period_expr(date_f, week_f, month_f, year_f, window)
        panels.append(make_panel(i + 1, title, expr, i * 12))

    dashboard = {
        "annotations": {"list": []},
        "description": "Local cost = measured GPU energy (integrated from the power gauge, per calendar day) at 9 INR/kWh. CPU/host energy is excluded: the scaphandre host counters report ~32 kW on this machine and are not credible. Cloud cost = LiteLLM tokens x provider rates.",
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
            # Dynamic date variables — query the latest values from the
            # per-day GPU energy metric. These auto-update as new days
            # arrive, so the dashboard always shows current date/week/month/year.
            {"name": "today", "label": "Date", "type": "query",
             "datasource": DS,
             "query": "label_values(gpu_energy_daily_joules, date)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "week", "label": "Week", "type": "query",
             "datasource": DS,
             "query": "label_values(gpu_energy_daily_joules, week)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "month", "label": "Month", "type": "query",
             "datasource": DS,
             "query": "label_values(gpu_energy_daily_joules, month)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "year", "label": "Year", "type": "query",
             "datasource": DS,
             "query": "label_values(gpu_energy_daily_joules, year)",
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
