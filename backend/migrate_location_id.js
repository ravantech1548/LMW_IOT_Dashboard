const pool = require('./src/config/database');

async function migrate() {
    try {
        console.log('Migrating locations table to use string id...');

        // First, remove foreign key constraints on sensors
        await pool.query('ALTER TABLE sensors DROP CONSTRAINT IF EXISTS sensors_location_id_fkey');

        // Alter types to VARCHAR
        await pool.query('ALTER TABLE locations ALTER COLUMN id TYPE VARCHAR(100) USING id::VARCHAR');
        await pool.query('ALTER TABLE sensors ALTER COLUMN location_id TYPE VARCHAR(100) USING location_id::VARCHAR');

        // Drop the auto-increment sequence and default limit
        await pool.query('ALTER TABLE locations ALTER COLUMN id DROP DEFAULT');
        await pool.query('DROP SEQUENCE IF EXISTS locations_id_seq CASCADE');

        // Re-add constraints with ON UPDATE CASCADE
        await pool.query('ALTER TABLE sensors ADD CONSTRAINT sensors_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE ON UPDATE CASCADE');

        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
