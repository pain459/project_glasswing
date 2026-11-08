#!/usr/bin/env python3
"""Generate the 'Token Cost Comparison' dashboard.

5 separate tables (one per period: Today, This Week, This Month, This Year, All-Time).
Each table shows all 10 providers as rows using a single 'or'-joined query.
No transformations — the table panel auto-expands series into rows.
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

# Period -> (title, date filter, week filter, GPU window, GPU days)
PERIODS = [
    ("Today (2026-11-08)",    'date="${today}"', None, "1d", 1),
    ("This Week (2026W45)",   None, 'week="2026W45"', "7d", 7),
    ("This Month (2026-11)",  'date=~"2026-11.*"', None, "30d", 30),
    ("This Year (2026)",      'date=~"2026.*"', None, "365d", 365),
    ("All-Time (Total Recorded)", None, None, "365d", 365),
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

def local_cost_expr(gpu_window, gpu_days):
    """Period-aware local cost: CPU energy (counter increase) + GPU energy (avg power × time).

    CPU: sum(increase(scaph_host_energy_microjoules[window])) — counter, energy in microjoules.
    GPU: sum(avg_over_time(nvidia_gpu_power_watts[window]) * 86400 * days) — avg W × seconds = J.
    Both wrapped in sum() to strip labels before adding.
    Units: CPU in uJ, GPU in J. Convert GPU to uJ (×1e6), sum, then /3.6e12 → kWh → INR → USD.
    """
    cpu = f'sum(increase(scaph_host_energy_microjoules[{gpu_window}]))'
    gpu = f'sum(avg_over_time(nvidia_gpu_power_watts[{gpu_window}]) * 86400 * {gpu_days})'
    # (cpu_uJ + gpu_J * 1e6) / 3.6e12 * 9 / 94.66
    return (f'({cpu} + {gpu} * 1000000) / 3600000000000 * 9 / 94.66')

def build_period_expr(date_f, week_f, gpu_window, gpu_days):
    """Build a single 'or'-joined expression for one period (all providers as rows)."""
    parts = [f'label_replace({local_cost_expr(gpu_window, gpu_days)}, "provider", "Local (LiteLLM)", "", "")']
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
    for i, (title, date_f, week_f, gpu_window, gpu_days) in enumerate(PERIODS):
        expr = build_period_expr(date_f, week_f, gpu_window, gpu_days)
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
            {"name": "today", "label": "Today", "type": "custom",
             "query": "2026-11-08",
             "current": {"selected": True, "text": "2026-11-08", "value": "2026-11-08"},
             "options": [{"text": "2026-11-08", "value": "2026-11-08", "selected": True}]},
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
