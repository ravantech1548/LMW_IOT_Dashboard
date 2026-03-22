const pool = require('./src/config/database');
(async () => {
    try {
        await pool.query(`INSERT INTO devices (id) SELECT DISTINCT device_id FROM channel_mappings ON CONFLICT (id) DO NOTHING`);
        console.log('Seeded devices.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
