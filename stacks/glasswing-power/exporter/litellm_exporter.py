#!/usr/bin/env python3
"""
LiteLLM Token Usage Exporter
Queries the LiteLLM Postgres database and exposes token usage metrics
as a Prometheus endpoint.
"""

import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import psycopg2
from prometheus_client import Gauge, Counter

# Configuration
DB_HOST = os.getenv('DB_HOST', 'glasswing-postgres')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'litellm')
DB_USER = os.getenv('DB_USER', 'litellm')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'litellm')
PORT = int(os.getenv('PORT', '9188'))

# Prometheus metrics — per-date (for time-range queries)
litellm_prompt_tokens = Gauge(
    'litellm_prompt_tokens',
    'Input tokens used (uncached)',
    ['date', 'week', 'model_group']
)

litellm_completion_tokens = Gauge(
    'litellm_completion_tokens',
    'Output tokens used',
    ['date', 'week', 'model_group']
)

litellm_spend = Gauge(
    'litellm_spend',
    'Spend in USD',
    ['date', 'week', 'model_group']
)

litellm_requests = Gauge(
    'litellm_requests',
    'Number of requests',
    ['date', 'week', 'model_group']
)

litellm_cached_tokens = Gauge(
    'litellm_cached_tokens',
    'Cached input tokens',
    ['date', 'week', 'model_group']
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
            # Calculate ISO week (e.g., 2026W45)
            date_obj = datetime.strptime(date, '%Y-%m-%d')
            iso_year, iso_week, _ = date_obj.isocalendar()
            week = f"{iso_year}W{iso_week:02d}"
            litellm_prompt_tokens.labels(date=date, week=week, model_group=model_group).set(prompt_tokens)
            litellm_completion_tokens.labels(date=date, week=week, model_group=model_group).set(completion_tokens)
            litellm_spend.labels(date=date, week=week, model_group=model_group).set(spend)
            litellm_requests.labels(date=date, week=week, model_group=model_group).set(request_count)

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
                # Calculate ISO week
                date_obj = datetime.strptime(str(date), '%Y-%m-%d')
                iso_year, iso_week, _ = date_obj.isocalendar()
                week = f"{iso_year}W{iso_week:02d}"
                litellm_cached_tokens.labels(date=str(date), week=week, model_group=model).set(cached_tokens)

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
