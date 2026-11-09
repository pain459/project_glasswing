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

# GPU energy per calendar day, integrated from the nvidia_gpu_power_watts
# gauge in Prometheus TSDB. Labelled with date/week/month/year so dashboards
# can sum the days belonging to each period without any projection.
gpu_energy_daily_joules = Gauge(
    'gpu_energy_daily_joules',
    'GPU energy in joules consumed per calendar day (integrated from power gauge)',
    ['date', 'week', 'month', 'year']
)

# Cache of completed days: energy never changes once the day is over.
_gpu_energy_cache = {}


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


def _gpu_energy_for_range(start_epoch, end_epoch):
    """Integrate GPU power (W) over [start, end): energy in joules.

    Energy = avg(power) x duration. The average is taken over the samples
    that actually exist in TSDB; missing samples are not treated as zero.
    """
    window = f"{int(end_epoch - start_epoch)}s"
    total = _prom_query(f'sum(sum_over_time(nvidia_gpu_power_watts[{window}]))', at=end_epoch)
    count = _prom_query(f'sum(count_over_time(nvidia_gpu_power_watts[{window}]))', at=end_epoch)
    if total is None or not count:
        return None
    avg_watts = total / count
    return avg_watts * (end_epoch - start_epoch)


def update_gpu_energy():
    """Expose per-day GPU energy for the last GPU_HISTORY_DAYS days."""
    now = datetime.now(timezone.utc)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)

    computed = {}
    for offset in range(GPU_HISTORY_DAYS, -1, -1):
        day_start = midnight - timedelta(days=offset)
        day_end = day_start + timedelta(days=1)
        date_str = day_start.strftime('%Y-%m-%d')

        if date_str in _gpu_energy_cache:
            computed[date_str] = _gpu_energy_cache[date_str]
            continue

        # Today's window ends at 'now' (partial day); completed days end at midnight.
        end_epoch = now.timestamp() if offset == 0 else day_end.timestamp()
        joules = _gpu_energy_for_range(day_start.timestamp(), end_epoch)
        if joules is not None:
            computed[date_str] = joules
            if offset != 0:
                _gpu_energy_cache[date_str] = joules

    gpu_energy_daily_joules.clear()
    for date_str, joules in computed.items():
        week, month, year = _period_labels(date_str)
        gpu_energy_daily_joules.labels(date=date_str, week=week, month=month, year=year).set(joules)
    return len(computed)

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
                gpu_days = update_gpu_energy()
            except Exception as e:
                gpu_days = 0
                litellm_scrape_errors.inc()
                print(f"[{datetime.now().isoformat()}] GPU energy update error: {e}")
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
