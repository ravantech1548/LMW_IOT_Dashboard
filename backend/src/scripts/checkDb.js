const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkDb() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM channel_mappings');
    const res2 = await client.query('SELECT * FROM sensors');
    fs.writeFileSync('db_output_2.json', JSON.stringify({
      mappings: res.rows,
      sensors: res2.rows
    }, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

checkDb();
