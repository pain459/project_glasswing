#!/usr/bin/env python3
"""
LiteLLM Token Usage Exporter
Queries the LiteLLM Postgres database and exposes token usage metrics
as a Prometheus endpoint.
"""

import os
import time as time_mod
from datetime import datetime, timezone, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
import psycopg2
from prometheus_client import Gauge, Counter

# Configuration
DB_HOST = os.getenv('DB_HOST', 'glasswing-postgres')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'litellm')
DB_USER = os.getenv('DB_USER', 'litellm')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'litellm')
PORT = int(os.getenv('PORT', '9188'))
PROM_URL = os.getenv('PROM_URL', 'http://prometheus:9090')
GPU_HISTORY_DAYS = int(os.getenv('GPU_HISTORY_DAYS', '30'))

# Prometheus metrics — per-date (for time-range queries)
litellm_prompt_tokens = Gauge(
    'litellm_prompt_tokens',
    'Input tokens used (uncached)',
    ['date', 'week', 'month', 'year', 'model_group']
)

litellm_completion_tokens = Gauge(
    'litellm_completion_tokens',
    'Output tokens used',
    ['date', 'week', 'month', 'year', 'model_group']
)

litellm_spend = Gauge(
    'litellm_spend',
    'Spend in USD',
    ['date', 'week', 'month', 'year', 'model_group']
)

litellm_requests = Gauge(
    'litellm_requests',
    'Number of requests',
    ['date', 'week', 'month', 'year', 'model_group']
)

litellm_cached_tokens = Gauge(
    'litellm_cached_tokens',
    'Cached input tokens',
    ['date', 'week', 'month', 'year', 'model_group']
)

# Prometheus metrics — all-time totals (for "total from start" table)
litellm_prompt_tokens_total = Gauge(
    'litellm_prompt_tokens_total',
    'Total input tokens (uncached) since first use'
)

litellm_completion_tokens_total = Gauge(
    'litellm_completion_tokens_total',
    'Total output tokens since first use'
)

litellm_cached_tokens_total = Gauge(
    'litellm_cached_tokens_total',
    'Total cached input tokens since first use'
)

litellm_spend_total = Gauge(
    'litellm_spend_total',
    'Total spend in USD since first use'
)

litellm_scrape_errors = Counter(
    'litellm_scrape_errors_total',
    'Total number of scrape errors'
)

# Per-day energy integrated from power gauges in Prometheus TSDB. Labelled
# with date/week/month/year so dashboards can sum the days belonging to
# each period without any projection.
#
# Sources (metric, scale-to-watts, target gauge):
#   - nvidia_gpu_power_watts        : GPU package power (NVML), watts
#   - scaph_socket_power_microwatts : CPU package power (RAPL), microwatts.
#     Calibrated on the host: idle ~30 W, 16-core burn ~200 W, matching the
#     Ryzen 9 7950X (TDP 170 W). Do NOT use the scaph_*_energy_microjoules
#     counters: they carry an AMD energy_uj unit bug (~1000x inflated).
POWER_SOURCES = None  # initialised below, after the gauges are defined

gpu_energy_daily_joules = Gauge(
    'gpu_energy_daily_joules',
    'GPU energy in joules consumed per calendar day (integrated from power gauge)',
    ['date', 'week', 'month', 'year']
)

cpu_energy_daily_joules = Gauge(
    'cpu_energy_daily_joules',
    'CPU package energy in joules consumed per calendar day (integrated from socket power gauge)',
    ['date', 'week', 'month', 'year']
)

# Estimated CPU+GPU energy for period-to-date, for the days before the
# meters existed. Estimate = average measured power x time elapsed since the
# period started (never counting future days). The measured daily sums stay
# the source of truth; this only fills the un-metered head of each period.
local_energy_estimate_joules = Gauge(
    'local_energy_estimate_joules',
    'Estimated CPU+GPU energy in joules since the start of each period (avg measured power x elapsed time)',
    ['period']
)

POWER_SOURCES = [
    ('nvidia_gpu_power_watts', 1.0, gpu_energy_daily_joules),
    ('scaph_socket_power_microwatts', 1e-6, cpu_energy_daily_joules),
]

# Cache of integrated days: energy never changes once the day is over.
# Days with genuinely no data are cached as None (a completed day can
# never gain samples later). Today is always recomputed.
_energy_cache = {}  # (metric, date) -> joules or None
_rollup_last_run = 0.0
ROLLUP_INTERVAL = 60  # seconds; day-level data needs no fresh integration per scrape


def _prom_query(expr, at=None):
    """Run an instant PromQL query, return the first sample value or None."""
    params = {'query': expr}
    if at is not None:
        params['time'] = str(int(at))
    url = PROM_URL + '/api/v1/query?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=10) as resp:
        data = json.load(resp)
    result = data.get('data', {}).get('result', [])
    if result:
        return float(result[0]['value'][1])
    return None


def _period_labels(date_str):
    """date 'YYYY-MM-DD' -> (week, month, year) labels."""
    d = datetime.strptime(date_str, '%Y-%m-%d')
    iso_year, iso_week, _ = d.isocalendar()
    return f"{iso_year}W{iso_week:02d}", d.strftime('%Y-%m'), d.strftime('%Y')


def _integrate_power_gauge(metric, scale, start_epoch, end_epoch):
    """Integrate a power gauge (scaled to watts) over [start, end): joules.

    Energy = avg(power) x duration. The average is taken over the samples
    that actually exist in TSDB; missing samples are not treated as zero.
    """
    window = f"{int(end_epoch - start_epoch)}s"
    total = _prom_query(f'sum(sum_over_time({metric}[{window}]))', at=end_epoch)
    count = _prom_query(f'sum(count_over_time({metric}[{window}]))', at=end_epoch)
    if total is None or not count:
        return None
    avg_watts = (total / count) * scale
    return avg_watts * (end_epoch - start_epoch)


def update_power_energy():
    """Expose per-day CPU and GPU energy for the last GPU_HISTORY_DAYS days.

    Throttled to once per ROLLUP_INTERVAL: between runs the previously
    published metric values simply remain in place.
    """
    global _rollup_last_run
    now_ts = time_mod.time()
    if now_ts - _rollup_last_run < ROLLUP_INTERVAL and _rollup_last_run:
        return len(_energy_cache)

    now = datetime.now(timezone.utc)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)

    computed = {}  # (metric, date_str) -> joules or None
    for offset in range(GPU_HISTORY_DAYS, -1, -1):
        day_start = midnight - timedelta(days=offset)
        day_end = day_start + timedelta(days=1)
        date_str = day_start.strftime('%Y-%m-%d')

        for metric, scale, _gauge in POWER_SOURCES:
            key = (metric, date_str)
            if key in _energy_cache:
                computed[key] = _energy_cache[key]
                continue

            # Today's window ends at 'now' (partial day); completed days end at midnight.
            end_epoch = now.timestamp() if offset == 0 else day_end.timestamp()
            joules = _integrate_power_gauge(metric, scale, day_start.timestamp(), end_epoch)
            computed[key] = joules
            if offset != 0:
                # Completed days are final (with data or without).
                _energy_cache[key] = joules

    for metric, scale, gauge in POWER_SOURCES:
        gauge.clear()
        for (m, date_str), joules in computed.items():
            if m != metric or joules is None:
                continue
            week, month, year = _period_labels(date_str)
            gauge.labels(date=date_str, week=week, month=month, year=year).set(joules)

    _update_period_estimates(computed, now)

    _rollup_last_run = now_ts
    return sum(1 for j in computed.values() if j is not None)


def _update_period_estimates(computed, now):
    """Estimate only the UN-METERED head of each period.

    The CPU meter went live 2026-11-07 and the GPU meter 2026-11-08; days
    before that have no measured energy. For each period the gap between the
    period start and a meter's first data day is estimated as:
        avg measured power (W) x un-metered seconds
    with avg = total measured joules / span actually covered by the meter
    (blends idle baseline and inference bursts). Days the meter covered are
    NOT estimated here — the measured daily gauges already have them — and
    future days are never counted.
    """
    now_epoch = now.timestamp()
    per_metric = {}  # metric -> [total_joules, first_data_day_start_epoch]
    for (metric, date_str), joules in computed.items():
        if joules is None:
            continue
        first_epoch = datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc).timestamp()
        if metric not in per_metric:
            per_metric[metric] = [joules, first_epoch]
        else:
            per_metric[metric][0] += joules
            per_metric[metric][1] = min(per_metric[metric][1], first_epoch)

    week_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=now.weekday())
    period_starts = {
        'today': now.replace(hour=0, minute=0, second=0, microsecond=0),
        'week': week_start,
        'month': now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        'year': now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0),
    }
    for period, start in period_starts.items():
        start_epoch = start.timestamp()
        estimate_j = 0.0
        for joules_sum, first_epoch in per_metric.values():
            avg_watts = joules_sum / max(now_epoch - first_epoch, 1.0)
            head = min(first_epoch, now_epoch) - start_epoch  # negative => meter predates period
            estimate_j += avg_watts * max(head, 0.0)
        local_energy_estimate_joules.labels(period=period).set(estimate_j)

def update_metrics():
    """Query the database and update Prometheus metrics."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()

        # Query ALL usage from LiteLLM_DailyModelUsage (no date limit).
        # GROUP BY date + model_group with SUM() so that duplicate rows for the
        # same (date, model_group) are aggregated instead of overwriting each
        # other when written to the same Prometheus label bucket.
        cur.execute("""
            SELECT date, model_group,
                   SUM(prompt_tokens) AS prompt_tokens,
                   SUM(completion_tokens) AS completion_tokens,
                   SUM(spend) AS spend,
                   SUM(request_count) AS request_count
            FROM "LiteLLM_DailyModelUsage"
            GROUP BY date, model_group
            ORDER BY date DESC
        """)

        rows = cur.fetchall()

        # Clear existing per-date metrics
        litellm_prompt_tokens.clear()
        litellm_completion_tokens.clear()
        litellm_spend.clear()
        litellm_requests.clear()
        litellm_cached_tokens.clear()

        # Update per-date metrics
        for row in rows:
            date, model_group, prompt_tokens, completion_tokens, spend, request_count = row
            # Calculate ISO week (e.g., 2026W45), month (e.g., 2026-11), year (e.g., 2026)
            date_obj = datetime.strptime(date, '%Y-%m-%d')
            iso_year, iso_week, _ = date_obj.isocalendar()
            week = f"{iso_year}W{iso_week:02d}"
            month = date_obj.strftime("%Y-%m")
            year = date_obj.strftime("%Y")
            litellm_prompt_tokens.labels(date=date, week=week, month=month, year=year, model_group=model_group).set(prompt_tokens)
            litellm_completion_tokens.labels(date=date, week=week, month=month, year=year, model_group=model_group).set(completion_tokens)
            litellm_spend.labels(date=date, week=week, month=month, year=year, model_group=model_group).set(spend)
            litellm_requests.labels(date=date, week=week, month=month, year=year, model_group=model_group).set(request_count)

        # Query cached tokens from LiteLLM_SpendLogs (all time).
        # Group by model_group (not model) so that the same model stored under
        # different names (e.g. "openai/qwen3.8-opencode" vs "qwen3.8-opencode")
        # is not double-counted.
        cur.execute("""
            SELECT
                DATE(created_at) as date,
                COALESCE(NULLIF(model_group, ''), model) as model_group,
                SUM(CASE WHEN metadata->'usage_object'->'prompt_tokens_details'->>'cached_tokens' IS NOT NULL
                     THEN (metadata->'usage_object'->'prompt_tokens_details'->>'cached_tokens')::bigint
                     ELSE 0 END) as cached_tokens
            FROM "LiteLLM_SpendLogs"
            GROUP BY DATE(created_at), COALESCE(NULLIF(model_group, ''), model)
            ORDER BY date DESC
        """)

        cached_rows = cur.fetchall()
        for row in cached_rows:
            date, model, cached_tokens = row
            if cached_tokens and cached_tokens > 0:
                # Calculate ISO week, month, year
                date_obj = datetime.strptime(str(date), '%Y-%m-%d')
                iso_year, iso_week, _ = date_obj.isocalendar()
                week = f"{iso_year}W{iso_week:02d}"
                month = date_obj.strftime("%Y-%m")
                year = date_obj.strftime("%Y")
                litellm_cached_tokens.labels(date=str(date), week=week, month=month, year=year, model_group=model).set(cached_tokens)

        # All-time totals (single value, no labels)
        total_prompt = sum(r[2] for r in rows)
        total_completion = sum(r[3] for r in rows)
        total_spend = sum(r[4] for r in rows)
        total_cached = sum(r[2] for r in cached_rows if r[2])

        litellm_prompt_tokens_total.set(total_prompt)
        litellm_completion_tokens_total.set(total_completion)
        litellm_cached_tokens_total.set(total_cached)
        litellm_spend_total.set(total_spend)

        cur.close()
        conn.close()
        print(f"[{datetime.now().isoformat()}] Updated: {len(rows)} daily rows, {len(cached_rows)} cached rows, "
              f"totals: prompt={total_prompt:,} completion={total_completion:,} cached={total_cached:,} spend=${total_spend:.4f}")

    except Exception as e:
        litellm_scrape_errors.inc()
        print(f"[{datetime.now().isoformat()}] Error updating metrics: {e}")

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            update_metrics()
            try:
                power_days = update_power_energy()
            except Exception as e:
                power_days = 0
                litellm_scrape_errors.inc()
                print(f"[{datetime.now().isoformat()}] Power energy update error: {e}")
            from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
            output = generate_latest()
            self.send_response(200)
            self.send_header('Content-Type', CONTENT_TYPE_LATEST)
            self.end_headers()
            self.wfile.write(output)
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Not Found')

    def log_message(self, format, *args):
        pass

def main():
    print(f"Starting LiteLLM exporter on port {PORT}")
    server = HTTPServer(('0.0.0.0', PORT), MetricsHandler)
    server.serve_forever()

if __name__ == '__main__':
    main()
