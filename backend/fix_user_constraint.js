const pool = require('./src/config/database');

async function fixUserDeleteCascade() {
    try {
        console.log('Updating users table foreign key constraint...');

        // Drop the existing constraint
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_client_id_fkey');

        // Re-add constraint with ON DELETE CASCADE
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_client_id_fkey 
            FOREIGN KEY (client_id) 
            REFERENCES clients(id) 
            ON DELETE CASCADE
        `);

        console.log('Successfully updated constraint!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update constraint:', error);
        process.exit(1);
    }
}

fixUserDeleteCascade();
