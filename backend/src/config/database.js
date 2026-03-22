const { Pool } = require('pg');
require('dotenv').config();

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please create a .env file in the backend directory with:');
  console.error('DATABASE_URL=postgresql://username:password@localhost:5432/iot_dashboard');
  process.exit(1);
}

// Parse DATABASE_URL to check if password is present
const dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('@') && dbUrl.split('@')[0].split(':').length < 3) {
  console.error('ERROR: DATABASE_URL appears to be missing a password!');
  console.error('Expected format: postgresql://username:password@host:port/database');
  console.error('Current DATABASE_URL:', dbUrl.replace(/:([^:@]+)@/, ':***@')); // Hide password in error
  process.exit(1);
}

const sslConfig = process.env.DB_SSL === 'false' ? false :
  (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;

