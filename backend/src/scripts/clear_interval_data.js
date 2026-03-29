const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../config/database');

const clearData = async () => {
  try {
    console.log('Connecting to database to clear interval data...');

    // Delete interval data from the sensor_data table
    const sensorDeleteResult = await pool.query(`DELETE FROM sensor_data WHERE data_status = 'interval'`);
    console.log(`Deleted ${sensorDeleteResult.rowCount} rows from sensor_data table.`);

    // Delete all records from the device_interval_reports format table
    const deviceReportDeleteResult = await pool.query(`TRUNCATE TABLE device_interval_reports`);
    console.log(`Successfully truncated the device_interval_reports table.`);

    console.log('All interval data has been successfully cleared from the database.');
  } catch (error) {
    console.error('Error clearing interval data:', error);
  } finally {
    pool.end();
    process.exit(0);
  }
};

clearData();
