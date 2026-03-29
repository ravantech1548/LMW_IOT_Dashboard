require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('../config/database');

async function clean() {
  try {
    console.log('Cleaning orphaned sensors...');
    const result = await pool.query(`
      DELETE FROM sensors 
      WHERE device_id IS NOT NULL 
      AND device_id NOT IN (SELECT DISTINCT device_id FROM channel_mappings)
      RETURNING id, name, device_id;
    `);
    console.log(`Deleted ${result.rows.length} orphaned sensors:`, result.rows);
    
    // Also clean up devices
    const devResult = await pool.query(`
      DELETE FROM devices 
      WHERE id NOT IN (SELECT DISTINCT device_id FROM channel_mappings)
      RETURNING id;
    `);
    console.log(`Deleted ${devResult.rows.length} orphaned devices:`, devResult.rows);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
clean();
