FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir psycopg2-binary prometheus_client

# Copy the exporter
COPY litellm_exporter.py .

# Run as non-root user
USER 1000

# Expose the metrics port
EXPOSE 9188

# Run the exporter
CMD ["python", "litellm_exporter.py"]
