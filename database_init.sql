-- ============================================================================
-- VOLTAS IOT DASHBOARD - MASTER DATABASE INITIALIZATION SCRIPT
-- ============================================================================
-- This script creates the entire database schema, including tables, indexes,
-- default system settings, and the initial admin user.
--
-- USAGE:
-- psql -h localhost -p 5432 -U iotuser -d iot_dashboard -f database_init.sql
--
-- OR in pgAdmin Query Tool.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enable Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ----------------------------------------------------------------------------
-- 2. Create Tables (in dependency order)
-- ----------------------------------------------------------------------------

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    site_address TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor_level VARCHAR(50),
    geo_coordinates POINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensor Types Table
CREATE TABLE IF NOT EXISTS sensor_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20),
    description TEXT,
    min_value NUMERIC,
    max_value NUMERIC,
    widget_type VARCHAR(30) DEFAULT 'line_chart',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensors Table (with MQTT fields)
CREATE TABLE IF NOT EXISTS sensors (
    id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    sensor_type_id INT REFERENCES sensor_types(id),
    name VARCHAR(255) NOT NULL,
    mqtt_topic VARCHAR(500) NOT NULL,
    device_id VARCHAR(50),
    channel_code VARCHAR(10),
    mqtt_payload_topic VARCHAR(255),
    data_mode VARCHAR(10) DEFAULT 'live',
    interval_seconds INT DEFAULT 60,
    sensor_count INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensors_mqtt_topic ON sensors(mqtt_topic);
CREATE INDEX IF NOT EXISTS idx_sensors_device_id ON sensors(device_id);
CREATE INDEX IF NOT EXISTS idx_sensors_mqtt_payload_topic ON sensors(mqtt_payload_topic);

-- Sensor Data Table (with TimescaleDB Hypertable)
CREATE TABLE IF NOT EXISTS sensor_data (
    id BIGSERIAL,
    sensor_id INT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    value NUMERIC NOT NULL,
    quality VARCHAR(20) DEFAULT 'good',
    data_status VARCHAR(20) DEFAULT 'active',
    metadata JSONB,
    PRIMARY KEY (sensor_id, timestamp)
);

-- Convert to Hypertable (TimescaleDB)
-- Note: wrapped in DO block to handle errors effectively if not feasible
DO $$
BEGIN
    PERFORM create_hypertable('sensor_data', 'timestamp', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping TimescaleDB hypertable conversion (extension might be missing)';
END $$;

CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_time ON sensor_data(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp DESC);

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    client_id INT REFERENCES clients(id),
    shift_id INT REFERENCES shifts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_shift_id ON users(shift_id);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by INT REFERENCES users(id)
);

-- Channel Mappings Table (DB-driven MQTT payload routing)
CREATE TABLE IF NOT EXISTS channel_mappings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    payload_key VARCHAR(20) NOT NULL,
    sensor_id INT REFERENCES sensors(id) ON DELETE CASCADE,
    alias VARCHAR(100),
    data_mode VARCHAR(10) DEFAULT 'live',
    interval_seconds INT DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, payload_key)
);

CREATE INDEX IF NOT EXISTS idx_channel_mappings_device ON channel_mappings(device_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_sensor ON channel_mappings(sensor_id);

-- ----------------------------------------------------------------------------
-- 3. Insert Initial Data
-- ----------------------------------------------------------------------------

-- System Settings Defaults
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
    ('payload_timeout_minutes', '5', 'Time in minutes without payload before device is marked as offline'),
    ('offline_check_interval_minutes', '1', 'How often the system checks for offline devices (in minutes)'),
    ('heartbeat_interval_minutes', '15', 'How often to insert heartbeat records when sensor values haven''t changed'),
    ('timezone', 'Asia/Kolkata', 'System-wide timezone for date/time display (e.g. Asia/Kolkata, Asia/Singapore)')
ON CONFLICT (setting_key) DO NOTHING;

-- Admin User
-- Pwd: 'admin123' (Bcrypt hash)
-- Note: Replace with your own hash if needed. This is a standard bcrypt hash for 'admin123'.
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin', 
    'admin@iotdashboard.com', 
    '$2a$10$wWkca8vL7w.s0n/i7eW8O.sC2s3.s0r0y.s0u.s0n.s0d', -- Placeholder/Example hash. PLEASE UPDATE VIA ADMIN UI.
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- Note on Password:
-- The hash above is a placeholder. For security, please run `npm run create-admin` 
-- in the backend directory to generate a secure fresh hash, or log in and change password immediately.

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
