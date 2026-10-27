-- 01-create-databases.sql
-- Create databases for common Glasswing services on first boot.
-- Run via: docker-entrypoint-initdb.d/ (executed automatically by Postgres image)
--
-- Each service should use its own database. Add new entries here as services
-- are deployed that need Postgres.

-- Default database is created by POSTGRES_DB env var.
-- These are additional databases for future services.

-- Grafana (when deployed)
-- SELECT 'CREATE DATABASE grafana' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'grafana')\gexec

-- Gatus (when deployed)
-- SELECT 'CREATE DATABASE gatus' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gatus')\gexec

-- Authentik (when deployed)
-- SELECT 'CREATE DATABASE authentik' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'authentik')\gexec

-- N8N (when deployed)
-- SELECT 'CREATE DATABASE n8n' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Placeholder: uncomment as services are added.
