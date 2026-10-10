-- PostgreSQL initialization script for app_history database
\c postgres;
CREATE DATABASE app_history;
\c app_history;

DROP TABLE IF EXISTS query_history;
DROP TABLE IF EXISTS users;

-- Users table (as per Section 16)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query history table
CREATE TABLE IF NOT EXISTS query_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  database_type VARCHAR(20) NOT NULL,
  generated_query JSONB,
  selected_query TEXT,
  explanation TEXT,
  tables_used TEXT,
  columns_used TEXT,
  impact_estimate TEXT,
  error_message TEXT,
  execution_status VARCHAR(20),
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users for app_history (optional)
CREATE USER sql_reader_history WITH PASSWORD '${POSTGRES_READER_PASSWORD}';
CREATE USER sql_writer_history WITH PASSWORD '${POSTGRES_WRITER_PASSWORD}';

GRANT CONNECT ON DATABASE app_history TO sql_reader_history, sql_writer_history;
GRANT USAGE ON SCHEMA public TO sql_reader_history, sql_writer_history;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sql_reader_history;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sql_writer_history;
-- Default privileges for generic roles
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sql_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO sql_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO sql_reader, sql_writer;
-- Explicit grants on specific tables
GRANT SELECT ON TABLE query_history TO sql_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE query_history TO sql_writer;
GRANT SELECT ON TABLE users TO sql_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO sql_writer;
