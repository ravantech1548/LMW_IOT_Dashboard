const pool = require('./src/config/database');

const setupCardingDashboard = async () => {
    try {
        console.log('Starting Carding Dashboard setup...');

        const clientId = '100000000001';
        const deviceId = '200000000001';
        const assetType = 'carding';
        const messageType = 'Seconds';

        // 1. Create client if not exists
        await pool.query(
            `INSERT INTO clients (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
            [clientId, 'Carding Client']
        );

        // 2. Insert into devices table
        await pool.query(
            `INSERT INTO devices (id, client_id, asset_type, message_type)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET 
               client_id = EXCLUDED.client_id,
               asset_type = EXCLUDED.asset_type,
               message_type = EXCLUDED.message_type`,
            [deviceId, clientId, assetType, messageType]
        );

        // 3. Department and Location
        const deptRes = await pool.query(
            `INSERT INTO departments (client_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
            [clientId, 'Carding Department', 'Department for carding machine']
        );
        const deptId = deptRes.rows[0].id;

        const locRes = await pool.query(
            `INSERT INTO locations (department_id, name) VALUES ($1, $2) RETURNING id`,
            [deptId, 'Carding Machine Area']
        );
        const locId = locRes.rows[0].id;

        // 4. Sensor Types
        const sensorTypes = [
            { name: 'Shift', min: 1, max: 3, unit: 'Numbers', widget: 'numeric_card' },
            { name: 'Length', min: 0, max: 300000, unit: 'Meters', widget: 'numeric_card' },
            { name: 'Kgs', min: 0, max: 65535, unit: 'kgs', widget: 'numeric_card' },
            { name: 'Hour', min: 0, max: 24, unit: 'Total running Hours', widget: 'numeric_card' },
            { name: 'Minutes', min: 0, max: 60, unit: 'Total running Minutes', widget: 'numeric_card' },
            { name: 'EFF%', min: 0, max: 100, unit: 'Percentage (2 decimal accuracy)', widget: 'gauge' },
            { name: 'CAN', min: 0, max: 65535, unit: 'Counter', widget: 'numeric_card' },
            { name: 'BREAK', min: 0, max: 65535, unit: 'Counter', widget: 'numeric_card' },
            { name: 'D%', min: 0, max: 99.99, unit: 'Percentage (2 decimal accuracy)', widget: 'gauge' },
            { name: 'E-FAULT', min: 0, max: 65535, unit: 'Counter', widget: 'numeric_card' },
            { name: 'M-FAULT', min: 0, max: 65535, unit: 'Counter', widget: 'numeric_card' }
        ];

        const sensorTypeMap = {};

        for (const st of sensorTypes) {
            const res = await pool.query(
                `INSERT INTO sensor_types (name, min_value, max_value, unit, widget_type) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (name) DO UPDATE SET 
                 min_value = EXCLUDED.min_value, 
                 max_value = EXCLUDED.max_value, 
                 unit = EXCLUDED.unit, 
                 widget_type = EXCLUDED.widget_type
                 RETURNING id`,
                [st.name, st.min, st.max, st.unit, st.widget]
            );
            sensorTypeMap[st.name] = res.rows[0].id;
        }

        console.log('Sensor types created.');

        // 5. Create Sensors and Channel Mappings
        const channels = [
            { key: 'p1', type: 'Shift', alias: 'Shift' },
            { key: 'p2', type: 'Length', alias: 'Length' },
            { key: 'p3', type: 'Kgs', alias: 'Kgs' },
            { key: 'p4', type: 'Hour', alias: 'Hour' },
            { key: 'p5', type: 'Minutes', alias: 'Minutes' },
            { key: 'p6', type: 'EFF%', alias: 'Efficiency' },
            { key: 'p7', type: 'CAN', alias: 'CAN Counter' },
            { key: 'p8', type: 'BREAK', alias: 'Break Counter' },
            { key: 'p9', type: 'D%', alias: 'D Percentage' },
            { key: 'p10', type: 'E-FAULT', alias: 'Electrical Faults' },
            { key: 'p11', type: 'M-FAULT', alias: 'Mechanical Faults' },
        ];

        for (const ch of channels) {
            const sensorTypeId = sensorTypeMap[ch.type];

            // Insert Sensor
            const sensorRes = await pool.query(`
                INSERT INTO sensors (location_id, sensor_type_id, name, mqtt_topic, device_id, channel_code, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'active')
                RETURNING id
            `, [locId, sensorTypeId, ch.alias, 'voltas', deviceId, ch.key.toLowerCase()]);
            const sensorId = sensorRes.rows[0].id;

            // Insert Channel Mapping
            await pool.query(`
                INSERT INTO channel_mappings (device_id, payload_key, sensor_id, alias, data_mode)
                VALUES ($1, $2, $3, $4, 'auto')
                ON CONFLICT (device_id, payload_key) DO UPDATE SET
                    sensor_id = EXCLUDED.sensor_id,
                    alias = EXCLUDED.alias,
                    data_mode = 'auto'
            `, [deviceId, ch.key.toLowerCase(), sensorId, ch.alias]);
        }

        console.log('Sensors and mappings configured.');

        process.exit(0);

    } catch (error) {
        console.error('Error setup carding dashboard:', error);
        process.exit(1);
    }
};

setupCardingDashboard();
