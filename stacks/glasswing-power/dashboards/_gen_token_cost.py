#!/usr/bin/env python3
"""Generate the 'Token Cost Comparison' dashboard (single table).

Rows  = Local (LiteLLM) + cloud vendors
Cols  = Day / Week / Month / Year
Cell  = "<tokens> tok -> $<cost>"  (cloud)  |  power-based cost (Local)

Each (provider, period) is its own PromQL series joined with `or`, so a single
query returns every row. The table is then pivoted with Grafana transformations.
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

# Period -> (date filter, week filter)
PERIODS = [
    ("Day",   'date="${today}"', None),
    ("Week",  None, 'week="${week}"'),
    ("Month", 'date=~"2026-11.*"', None),
    ("Year",  'date=~"2026.*"', None),
]

def sel(metric, date_f, week_f):
    """Build a selector with whichever filter is present."""
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

def local_cost_expr():
    # (CPU energy + GPU energy) in kWh * rate(9 INR/kWh) / FX(94.66) -> USD.
    # sum() strips the differing instance/job labels so the two series add cleanly.
    return ('(sum(scaph_host_energy_microjoules) + sum(increase(nvidia_gpu_power_watts[30d])) * 3600) '
            '/ 1000000 / 3600 * 9 / 94.66')

def tag_period(expr, provider, period):
    """Add provider + period labels. `and on()` keeps the LEFT labels, so the
    period label must be applied by an OUTER label_replace on the AND result."""
    return (f'label_replace(label_replace({expr}, "provider", "{provider}", "", "") '
            f'and on() label_replace(vector(1), "period", "{period}", "", ""), '
            f'"period", "{period}", "", "")')

def build_expr():
    parts = []
    for period, date_f, week_f in PERIODS:
        # Local row (same power-based value for every period)
        parts.append(tag_period(local_cost_expr(), "Local (LiteLLM)", period))
        # Cloud vendors
        for name, in_r, out_r, cache_r in VENDORS:
            parts.append(tag_period(cloud_cost_expr(date_f, week_f, in_r, out_r, cache_r), name, period))
    return ' or '.join(parts)

def build_dashboard():
    expr = build_expr()
    panel = {
        "type": "table",
        "title": "Token Cost Comparison (Local power-based vs Cloud token-based)",
        "datasource": DS,
        "targets": [{"refId": "A", "expr": expr, "instant": True, "datasource": DS}],
        "fieldConfig": {
            "defaults": {"color": {"mode": "thresholds"},
                         "custom": {"align": "auto", "cellOptions": {"type": "auto"}, "inspect": False},
                         "mappings": [],
                         "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": None}]}},
            "overrides": [],
        },
        "options": {
            "cellHeight": "sm",
            "showHeader": True,
            "footer": {"show": False, "countRows": False, "reducer": ["sum"], "fields": ""},
            "sortBy": [{"desc": False, "displayName": "provider"}],
        },
        "transformations": [
            {"id": "extractFields", "options": {"frameIndex": 0,
                "fields": ["Time", "provider", "period", "Value"]}},
            {"id": "organize", "options": {
                "renameByName": {"Time": "Time", "provider": "Provider",
                                 "period": "Period", "Value": "Cost (USD)"},
                "excludeByName": {}}},
            {"id": "groupBy", "options": {
                "fields": {"provider": {"aggregator": "first", "reducer": ["first"]},
                           "Cost (USD)": {"aggregator": "first", "reducer": ["first"]},
                           "Time": {"aggregator": "first", "reducer": ["first"]}}}},
            {"id": "pivot", "options": {
                "valueField": {"name": "Cost (USD)"},
                "rowFields": [{"name": "provider"}],
                "columnFields": [{"name": "period"}]}},
            {"id": "sortBy", "options": {"sort": [{"field": "provider", "desc": False}]}},
        ],
        "gridPos": {"h": 22, "w": 24, "x": 0, "y": 0},
        "id": 1,
    }

    dashboard = {
        "annotations": {"list": []},
        "editable": True,
        "fiscalYearStartMonth": 0,
        "graphPaper": {},
        "links": [],
        "liveNow": False,
        "panels": [panel],
        "refresh": "1m",
        "schemaVersion": 39,
        "tags": ["glasswing-power", "cost-comparison", "tokens"],
        "templating": {"list": [
            {"name": "today", "label": "Today", "type": "custom",
             "query": "2026-11-08",
             "current": {"selected": True, "text": "2026-11-08", "value": "2026-11-08"},
             "options": [{"text": "2026-11-08", "value": "2026-11-08", "selected": True}]},
            {"name": "week", "label": "Week", "type": "custom",
             "query": "2026W45",
             "current": {"selected": True, "text": "2026W45", "value": "2026W45"},
             "options": [{"text": "2026W45", "value": "2026W45", "selected": True}]},
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
    print(f"Expr length: {len(d['panels'][0]['targets'][0]['expr'])} chars")
    print(f"Series count: {d['panels'][0]['targets'][0]['expr'].count('label_replace(') // 2 * 2}")
    print("\n--- First 600 chars of expr ---")
    print(d['panels'][0]['targets'][0]['expr'][:600])
