# Glasswing OpenObserve Dashboards

Dashboard JSON files for importing into OpenObserve at `http://192.168.68.62:3018`.

## Available Dashboards

| Dashboard | File | Data Source | Status |
|---|---|---|---|
| **System Overview** | `system-overview.json` | hostmetricsreceiver (CPU, memory, disk, network, load) | Ready |
| **Container Health** | `container-health.json` | docker_stats receiver (per-container metrics) | Ready |
| **Service Error Tracking** | `service-error-tracking.json` | Vector (glasswing_errors, glasswing_docker streams) | Ready |
| **GPU Monitoring** | `gpu-monitoring.json` | DCGM exporter / nvidia-smi | Placeholder - needs GPU metrics source |

## How to Import

1. Open OpenObserve at `http://192.168.68.62:3018`
2. Navigate to **Dashboards** in the left sidebar
3. Click the **Import** button
4. Select the JSON file you want to import
5. Click **Import**

Repeat for each dashboard file.

## GPU Monitoring

The GPU dashboard is a placeholder. To enable actual GPU metrics:

### Option A: DCGM Exporter (Recommended)
Install NVIDIA DCGM exporter on the host and add a `prometheusreceiver` scrape config to the OTel collector pointing at the DCGM exporter endpoint.

### Option B: nvidia-smi scraping
Add a simple sidecar that runs `nvidia-smi` periodically and exports Prometheus-format metrics.

Once GPU metrics are flowing into OpenObserve, the dashboard panels will populate automatically.
