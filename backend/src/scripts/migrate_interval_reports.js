const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../config/database');

const migrate = async () => {
  try {
    console.log('Starting migration to create device_interval_reports table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_interval_reports (
          id BIGSERIAL PRIMARY KEY,
          client_id VARCHAR(100),
          device_id VARCHAR(100) NOT NULL,
          mac_id VARCHAR(50),
          firmware_ver VARCHAR(20),
          timestamp TIMESTAMPTZ NOT NULL,
          p1 NUMERIC,
          p2 NUMERIC,
          p3 NUMERIC,
          p4 NUMERIC,
          p5 NUMERIC,
          p6 NUMERIC,
          p7 NUMERIC,
          p8 NUMERIC,
          p9 NUMERIC,
          p10 NUMERIC,
          p11 NUMERIC,
          p12 NUMERIC,
          p13 NUMERIC,
          p14 NUMERIC,
          p15 NUMERIC,
          p16 NUMERIC,
          p17 NUMERIC,
          p18 NUMERIC,
          p19 NUMERIC,
          p20 NUMERIC,
          p21 NUMERIC,
          p22 NUMERIC,
          p23 NUMERIC,
          p24 NUMERIC,
          p25 NUMERIC,
          p26 NUMERIC,
          p27 NUMERIC,
          p28 NUMERIC,
          p29 NUMERIC,
          p30 NUMERIC,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create index on device_id and timestamp for fast reporting
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_device_interval_reports_device_ts 
      ON device_interval_reports(device_id, timestamp DESC);
    `);

    // Ensure it uniquely tracks per device per timestamp to prevent duplicates
    await pool.query(`
      ALTER TABLE device_interval_reports 
      DROP CONSTRAINT IF EXISTS unique_device_timestamp;
    `);

    await pool.query(`
      ALTER TABLE device_interval_reports 
      ADD CONSTRAINT unique_device_timestamp UNIQUE(device_id, timestamp);
    `);

    console.log('Migration successful! Table device_interval_reports completely set up.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
    process.exit(0);
  }
};

migrate();
