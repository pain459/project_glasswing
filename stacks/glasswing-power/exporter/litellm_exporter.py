#!/usr/bin/env python3
"""
LiteLLM Token Usage Exporter
Queries the LiteLLM Postgres database and exposes token usage metrics
as a Prometheus endpoint.
"""

import os
import time
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
import psycopg2
from prometheus_client import start_http_server, Gauge, Counter, Info

# Configuration
DB_HOST = os.getenv('DB_HOST', 'glasswing-postgres')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'litellm')
DB_USER = os.getenv('DB_USER', 'litellm')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'litellm')
PORT = int(os.getenv('PORT', '9188'))

# Prometheus metrics
litellm_prompt_tokens = Gauge(
    'litellm_prompt_tokens',
    'Input tokens used',
    ['date', 'model_group']
)

litellm_completion_tokens = Gauge(
    'litellm_completion_tokens',
    'Output tokens used',
    ['date', 'model_group']
)

litellm_spend = Gauge(
    'litellm_spend',
    'Spend in USD',
    ['date', 'model_group']
)

litellm_requests = Gauge(
    'litellm_requests',
    'Number of requests',
    ['date', 'model_group']
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
        
        # Query the last 90 days of usage
        cur.execute("""
            SELECT date, model_group, prompt_tokens, completion_tokens, spend, request_count
            FROM "LiteLLM_DailyModelUsage"
            ORDER BY date DESC
            LIMIT 90
        """)
        
        rows = cur.fetchall()
        
        # Clear existing metrics
        litellm_prompt_tokens.clear()
        litellm_completion_tokens.clear()
        litellm_spend.clear()
        litellm_requests.clear()
        
        # Update metrics
        for row in rows:
            date, model_group, prompt_tokens, completion_tokens, spend, request_count = row
            litellm_prompt_tokens.labels(date=date, model_group=model_group).set(prompt_tokens)
            litellm_completion_tokens.labels(date=date, model_group=model_group).set(completion_tokens)
            litellm_spend.labels(date=date, model_group=model_group).set(spend)
            litellm_requests.labels(date=date, model_group=model_group).set(request_count)
        
        cur.close()
        conn.close()
        print(f"[{datetime.now().isoformat()}] Updated metrics from {len(rows)} rows")
        
    except Exception as e:
        litellm_scrape_errors.inc()
        print(f"[{datetime.now().isoformat()}] Error updating metrics: {e}")

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            # Update metrics before serving
            update_metrics()
            
            # Generate Prometheus metrics
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
            self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress default logging
        pass

def main():
    print(f"Starting LiteLLM exporter on port {PORT}")
    server = HTTPServer(('0.0.0.0', PORT), MetricsHandler)
    server.serve_forever()

if __name__ == '__main__':
    main()
