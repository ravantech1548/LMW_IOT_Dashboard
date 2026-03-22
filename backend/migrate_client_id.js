const pool = require('./src/config/database');

async function migrate() {
    try {
        console.log('Migrating clients table to use string id...');

        // First, remove foreign key constraints
        await pool.query('ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_client_id_fkey');
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_client_id_fkey');

        // Alter types to VARCHAR
        await pool.query('ALTER TABLE clients ALTER COLUMN id TYPE VARCHAR(100) USING id::VARCHAR');
        await pool.query('ALTER TABLE departments ALTER COLUMN client_id TYPE VARCHAR(100) USING client_id::VARCHAR');
        await pool.query('ALTER TABLE users ALTER COLUMN client_id TYPE VARCHAR(100) USING client_id::VARCHAR');

        // Drop the auto-increment sequence and default limit
        await pool.query('ALTER TABLE clients ALTER COLUMN id DROP DEFAULT');
        await pool.query('DROP SEQUENCE IF EXISTS clients_id_seq CASCADE');

        // Re-add constraints
        await pool.query('ALTER TABLE departments ADD CONSTRAINT departments_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE');
        await pool.query('ALTER TABLE users ADD CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id)');

        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
