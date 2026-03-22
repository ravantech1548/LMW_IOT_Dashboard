-- ============================================================================
-- MIGRATION: Add channel_mappings table and extend sensor/sensor_types tables
-- ============================================================================
-- Run this after the base database_init.sql has been executed.
--
-- USAGE:
-- psql -h localhost -p 5432 -U iotuser -d iot_dashboard -f add_channel_mappings.sql
-- ============================================================================

-- 1. Add widget_type to sensor_types
ALTER TABLE sensor_types 
ADD COLUMN IF NOT EXISTS widget_type VARCHAR(30) DEFAULT 'line_chart';

COMMENT ON COLUMN sensor_types.widget_type IS 
  'Dashboard widget type: line_chart, gauge, on_off_card, bar_chart, numeric_card';

-- 2. Add data_mode and interval_seconds to sensors
ALTER TABLE sensors
ADD COLUMN IF NOT EXISTS data_mode VARCHAR(10) DEFAULT 'live',
ADD COLUMN IF NOT EXISTS interval_seconds INT DEFAULT 60;

COMMENT ON COLUMN sensors.data_mode IS 
  'live = broadcast immediately on change; interval = average and store every N seconds';
COMMENT ON COLUMN sensors.interval_seconds IS 
  'For interval mode: how many seconds between averaged DB inserts';

-- 3. Create channel_mappings table
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

COMMENT ON TABLE channel_mappings IS 
  'Maps a device payload key (p1, s1, etc.) to a sensor for dynamic dashboard configuration';

CREATE INDEX IF NOT EXISTS idx_channel_mappings_device ON channel_mappings(device_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_sensor ON channel_mappings(sensor_id);

-- 4. Set sensible widget_type defaults for existing sensor types
UPDATE sensor_types SET widget_type = 'on_off_card'   WHERE LOWER(name) IN ('switch', 'relay', 'binary');
UPDATE sensor_types SET widget_type = 'gauge'          WHERE LOWER(name) IN ('temperature', 'humidity', 'pressure', 'co2');
UPDATE sensor_types SET widget_type = 'numeric_card'   WHERE LOWER(name) IN ('counter', 'energy', 'power', 'voltage', 'current');
UPDATE sensor_types SET widget_type = 'line_chart'     WHERE widget_type IS NULL OR widget_type = 'line_chart';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
