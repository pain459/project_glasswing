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
def sum0(metric, date_f, week_f, month_f, year_f):
    """Sum a token metric for a period; 'or vector(0)' so empty periods yield 0."""
    return f'(sum({sel(metric, date_f, week_f, month_f, year_f)}) or vector(0))'

def cloud_cost_expr(date_f, week_f, month_f, year_f, in_r, out_r, cache_r):
    p = sum0('litellm_prompt_tokens', date_f, week_f, month_f, year_f)
    c = sum0('litellm_completion_tokens', date_f, week_f, month_f, year_f)
    k = sum0('litellm_cached_tokens', date_f, week_f, month_f, year_f)
    # LiteLLM's prompt_tokens INCLUDES cached_tokens (verified: cached is a
    # strict subset of prompt in the DB). Charge the uncached remainder at the
    # input rate and cached tokens at the cache rate — otherwise cache-heavy
    # traffic is double-counted and costs inflate ~9x.
    return (f'((clamp_min({p} - {k}, 0)) * {in_r} + {k} * {cache_r} + {c} * {out_r}) / 1000000 or vector(0)')

def local_cost_expr(energy_f):
    """Local cost from measured CPU + GPU energy (per-day integrated gauges).

    cpu_energy_daily_joules : integrated from scaph_socket_power_microwatts
                              (RAPL package power, calibrated idle ~30 W /
                              16-core burn ~200 W on the Ryzen 9 7950X).
    gpu_energy_daily_joules : integrated from nvidia_gpu_power_watts (NVML).

    The scaph_*_energy_microjoules counters are NOT used: they carry an AMD
    energy_uj unit bug (~1000x inflated, ~38,000 W rates).
    Units: joules → /3.6e6 → kWh → × 9 INR/kWh → / 94.66 INR/USD → USD.
    """
    cpu = f'cpu_energy_daily_joules{{{energy_f}}}' if energy_f else 'cpu_energy_daily_joules'
    gpu = f'gpu_energy_daily_joules{{{energy_f}}}' if energy_f else 'gpu_energy_daily_joules'
    return f'(sum({cpu}) + sum({gpu})) / 3600000 * 9 / 94.66'

def build_period_expr(date_f, week_f, month_f, year_f, _window):
    """Build a single 'or'-joined expression for one period (all providers as rows)."""
    energy_f = date_f or week_f or month_f or year_f
    parts = [f'label_replace({local_cost_expr(energy_f)}, "provider", "Local (CPU+GPU power)", "", "")']
    for name, in_r, out_r, cache_r in VENDORS:
        parts.append(f'label_replace({cloud_cost_expr(date_f, week_f, month_f, year_f, in_r, out_r, cache_r)}, "provider", "{name}", "", "")')
    return ' or '.join(parts)

def make_panel(panel_id, title, expr, grid_pos):
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
        "gridPos": grid_pos,
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

def make_info_panel(panel_id):
    """Methodology header so the assumptions are visible without scrolling."""
    content = "\n".join([
        "### Local vs Cloud — how costs are calculated",
        "",
        "**Local** = measured electricity: CPU package power (RAPL socket gauge, calibrated: ~30 W idle, ~200 W all-core on the Ryzen 9 7950X) + GPU power (NVML), integrated per calendar day, priced at **₹9 / kWh** (Indian unit rate), converted at **₹94.66 / USD**.",
        "",
        "**Cloud** = LiteLLM tokens at vendor rates: `(prompt − cached) × input + cached × cache + completion × output` per MTok. RAM/disk/motherboard overhead is not metered. Values update live; periods without data yet show equal totals until real calendar boundaries accumulate.",
    ])
    return {
        "datasource": {"type": "datasource", "uid": "grafana"},
        "fieldConfig": {"defaults": {}, "overrides": []},
        "gridPos": {"h": 4, "w": 24, "x": 0, "y": 0},
        "id": panel_id,
        "options": {
            "code": {"language": "plaintext", "showLineNumbers": False, "showMiniMap": False},
            "content": content,
            "mode": "markdown",
        },
        "pluginVersion": "11.1.0",
        "title": "",
        "type": "text",
    }

def build_dashboard():
    panels = [make_info_panel(10)]
    # 2x2 grid of period tables + full-width All-Time.
    # Titles embed the live template variables so each table is self-dating.
    layout = [
        (0, 4, 12, 12),   # Today     -> left, row 1
        (12, 4, 12, 12),  # This Week -> right, row 1
        (0, 16, 12, 12),  # This Month  -> left, row 2
        (12, 16, 12, 12), # This Year   -> right, row 2
        (0, 28, 24, 12),  # All-Time  -> full width finale
    ]
    for i, (title, date_f, week_f, month_f, year_f, _window) in enumerate(PERIODS):
        expr = build_period_expr(date_f, week_f, month_f, year_f, _window)
        x, y, w, h = layout[i]
        if i == 0:
            display = f"Today — ${{today}}"
        elif i == 1:
            display = f"This Week — ${{week}}"
        elif i == 2:
            display = f"This Month — ${{month}}"
        elif i == 3:
            display = f"This Year — ${{year}}"
        else:
            display = title
        panels.append(make_panel(i + 1, display, expr, {"h": h, "w": w, "x": x, "y": y}))

    dashboard = {
        "annotations": {"list": []},
        "description": "Local cost = measured CPU package energy (RAPL socket power, calibrated) + GPU energy, integrated per calendar day, priced at 9 INR/kWh (Indian unit rate). Cloud cost = LiteLLM tokens at vendor rates: (prompt - cached) x input + cached x cache + completion x output. RAM/disk/motherboard overhead is not metered.",
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
            # per-day CPU energy metric (longest history). These auto-update
            # as new days arrive, so the dashboard always shows current data.
            {"name": "today", "label": "Date", "type": "query",
             "datasource": DS,
             "query": "label_values(cpu_energy_daily_joules, date)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "week", "label": "Week", "type": "query",
             "datasource": DS,
             "query": "label_values(cpu_energy_daily_joules, week)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "month", "label": "Month", "type": "query",
             "datasource": DS,
             "query": "label_values(cpu_energy_daily_joules, month)",
             "refresh": 1,
             "sort": 2,
             "current": {"selected": True, "text": "", "value": ""}},
            {"name": "year", "label": "Year", "type": "query",
             "datasource": DS,
             "query": "label_values(cpu_energy_daily_joules, year)",
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
        if 'targets' in p:
            print(f"  {p['id']}: {p['title']} @ {p['gridPos']} (expr {len(p['targets'][0]['expr'])} chars)")
        else:
            print(f"  {p['id']}: [info panel] @ {p['gridPos']}")
