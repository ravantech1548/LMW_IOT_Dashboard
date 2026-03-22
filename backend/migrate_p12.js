const pool = require('./src/config/database');

const setupP12 = async () => {
    try {
        const stRes = await pool.query(`
            INSERT INTO sensor_types (name, unit, widget_type)
            VALUES ('Reserved', '-', 'numeric_card')
            ON CONFLICT (name) DO UPDATE SET unit='-', widget_type='numeric_card'
            RETURNING id
        `);
        const stId = stRes.rows[0].id;

        const sensorRes = await pool.query(`
            INSERT INTO sensors (location_id, sensor_type_id, name, mqtt_topic, device_id, channel_code, status)
            SELECT id, $1, 'Reserved', 'voltas', '200000000001', 'p12', 'active'
            FROM locations WHERE name = 'Carding Machine Area' LIMIT 1
            RETURNING id
        `, [stId]);
        const sId = sensorRes.rows[0].id;

        await pool.query(`
            INSERT INTO channel_mappings (device_id, payload_key, sensor_id, alias, data_mode)
            VALUES ('200000000001', 'p12', $1, 'Reserved', 'auto')
            ON CONFLICT (device_id, payload_key) DO UPDATE SET sensor_id=EXCLUDED.sensor_id, alias=EXCLUDED.alias
        `, [sId]);

        console.log('p12 mapped');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
setupP12();
