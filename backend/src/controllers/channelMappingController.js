const pool = require('../config/database');

/**
 * Get all channel mappings, optionally filtered by device_id
 */
const getAllMappings = async (req, res, next) => {
  try {
    const { device_id } = req.query;

    let query = `
      SELECT 
        cm.id,
        cm.device_id,
        cm.payload_key,
        cm.sensor_id,
        cm.alias,
        cm.data_mode,
        cm.interval_seconds,
        cm.created_at,
        cm.updated_at,
        s.name AS sensor_name,
        st.name AS sensor_type,
        st.unit AS sensor_unit,
        st.widget_type,
        l.name AS location_name,
        d.name AS department_name,
        c.name AS client_name
      FROM channel_mappings cm
      LEFT JOIN sensors s ON cm.sensor_id = s.id
      LEFT JOIN sensor_types st ON s.sensor_type_id = st.id
      LEFT JOIN locations l ON s.location_id = l.id
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN clients c ON d.client_id = c.id
    `;

    const params = [];
    const conditions = [];

    if (device_id) {
      conditions.push(`cm.device_id = $${params.length + 1}`);
      params.push(device_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY cm.device_id ASC, cm.payload_key ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all distinct device_ids that have channel mappings configured
 */
const getDevices = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT d.id as device_id, d.client_id, d.asset_type, d.message_type 
       FROM devices d 
       ORDER BY d.id ASC`
    );
    // If there are mappings not yet in devices table
    const backupResult = await pool.query(
      `SELECT DISTINCT device_id FROM channel_mappings 
       WHERE device_id NOT IN (SELECT id FROM devices)
       ORDER BY device_id ASC`
    );
    const devices = result.rows;
    backupResult.rows.forEach(r => {
      devices.push({ device_id: r.device_id, client_id: null, asset_type: null, message_type: null });
    });

    res.json(devices);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single mapping by ID
 */
const getMappingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT cm.*, s.name AS sensor_name, st.name AS sensor_type, st.unit
       FROM channel_mappings cm
       LEFT JOIN sensors s ON cm.sensor_id = s.id
       LEFT JOIN sensor_types st ON s.sensor_type_id = st.id
       WHERE cm.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Channel mapping not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new channel mapping
 */
const createMapping = async (req, res, next) => {
  try {
    const {
      device_id,
      payload_key,
      sensor_id,
      alias,
      data_mode = 'live',
      interval_seconds = 60
    } = req.body;

    if (!device_id || !payload_key) {
      return res.status(400).json({ error: 'device_id and payload_key are required' });
    }

    // Validate data_mode
    if (!['live', 'interval'].includes(data_mode)) {
      return res.status(400).json({ error: 'data_mode must be "live" or "interval"' });
    }

    // Validate sensor exists if provided
    if (sensor_id) {
      const sensorCheck = await pool.query('SELECT id FROM sensors WHERE id = $1', [sensor_id]);
      if (sensorCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Sensor not found' });
      }
    }

    const result = await pool.query(
      `INSERT INTO channel_mappings 
       (device_id, payload_key, sensor_id, alias, data_mode, interval_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [device_id, payload_key, sensor_id || null, alias || null, data_mode, interval_seconds]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      // Unique violation: device_id + payload_key already exists
      return res.status(409).json({
        error: `A mapping for device "${req.body.device_id}" key "${req.body.payload_key}" already exists. Use PUT to update it.`
      });
    }
    next(error);
  }
};

/**
 * Update an existing channel mapping
 */
const updateMapping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      device_id,
      payload_key,
      sensor_id,
      alias,
      data_mode,
      interval_seconds
    } = req.body;

    // Check mapping exists
    const existing = await pool.query('SELECT id FROM channel_mappings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Channel mapping not found' });
    }

    // Validate data_mode if provided
    if (data_mode && !['live', 'interval'].includes(data_mode)) {
      return res.status(400).json({ error: 'data_mode must be "live" or "interval"' });
    }

    // Validate sensor exists if provided
    if (sensor_id !== undefined && sensor_id !== null) {
      const sensorCheck = await pool.query('SELECT id FROM sensors WHERE id = $1', [sensor_id]);
      if (sensorCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Sensor not found' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (device_id !== undefined) { updates.push(`device_id = $${paramCount++}`); values.push(device_id); }
    if (payload_key !== undefined) { updates.push(`payload_key = $${paramCount++}`); values.push(payload_key); }
    if (sensor_id !== undefined) { updates.push(`sensor_id = $${paramCount++}`); values.push(sensor_id || null); }
    if (alias !== undefined) { updates.push(`alias = $${paramCount++}`); values.push(alias || null); }
    if (data_mode !== undefined) { updates.push(`data_mode = $${paramCount++}`); values.push(data_mode); }
    if (interval_seconds !== undefined) { updates.push(`interval_seconds = $${paramCount++}`); values.push(interval_seconds); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE channel_mappings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: `A mapping for this device + payload key combination already exists.`
      });
    }
    next(error);
  }
};

/**
 * Upsert multiple mappings for a device in one call (used by the Channel Mapping UI)
 */
const upsertMappings = async (req, res, next) => {
  try {
    const { device_id, mappings } = req.body;

    if (!device_id || !Array.isArray(mappings)) {
      return res.status(400).json({ error: 'device_id and mappings array are required' });
    }

    const results = [];

    for (const mapping of mappings) {
      const { payload_key, sensor_id, alias, data_mode = 'live', interval_seconds = 60 } = mapping;

      if (!payload_key) continue;

      const result = await pool.query(
        `INSERT INTO channel_mappings (device_id, payload_key, sensor_id, alias, data_mode, interval_seconds)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (device_id, payload_key)
         DO UPDATE SET 
           sensor_id = EXCLUDED.sensor_id,
           alias = EXCLUDED.alias,
           data_mode = EXCLUDED.data_mode,
           interval_seconds = EXCLUDED.interval_seconds,
           updated_at = NOW()
         RETURNING *`,
        [device_id, payload_key, sensor_id || null, alias || null, data_mode, interval_seconds]
      );

      results.push(result.rows[0]);
    }

    res.json({
      message: `Saved ${results.length} channel mappings for device "${device_id}"`,
      mappings: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a channel mapping
 */
const deleteMapping = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM channel_mappings WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Channel mapping not found' });
    }

    res.json({ message: 'Channel mapping deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all mappings for a specific device
 */
const deleteMappingsForDevice = async (req, res, next) => {
  try {
    const { device_id } = req.params;

    const result = await pool.query(
      'DELETE FROM channel_mappings WHERE device_id = $1 RETURNING id',
      [device_id]
    );

    res.json({
      message: `Deleted ${result.rows.length} mappings for device "${device_id}"`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save full device channel configuration:
 * For each channel, create/update the sensor in sensors table + upsert channel_mapping.
 * Body: { device_id, channels: [{ payload_key, alias, sensor_type_id, location_id }] }
 * Data mode is determined automatically by Device_status in the MQTT payload.
 */
const saveDeviceConfig = async (req, res, next) => {
  try {
    const { device_id, client_id, asset_type, message_type, channels } = req.body;

    if (!device_id || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'device_id and channels array are required' });
    }

    // Upsert into devices table
    await pool.query(
      `INSERT INTO devices (id, client_id, asset_type, message_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET 
         client_id = EXCLUDED.client_id,
         asset_type = EXCLUDED.asset_type,
         message_type = EXCLUDED.message_type,
         updated_at = NOW()`,
      [device_id, client_id || null, asset_type || null, message_type || null]
    );

    const results = [];

    for (const ch of channels) {
      const { payload_key, alias, sensor_type_id, location_id, mqtt_topic } = ch;

      if (!payload_key) continue;

      const normalizedKey = payload_key.toLowerCase();
      const sensorName = alias || `${device_id}-${normalizedKey}`;
      const topicToSave = mqtt_topic || 'voltas';

      // Check if a mapping already exists for this device+key
      const existingMapping = await pool.query(
        'SELECT id, sensor_id FROM channel_mappings WHERE device_id = $1 AND LOWER(payload_key) = $2',
        [device_id, normalizedKey]
      );

      let sensorId;

      if (existingMapping.rows.length > 0 && existingMapping.rows[0].sensor_id) {
        // Update the existing linked sensor
        sensorId = existingMapping.rows[0].sensor_id;
        const updates = [];
        const vals = [];
        let p = 1;

        if (alias !== undefined) { updates.push(`name = $${p++}`); vals.push(sensorName); }
        if (sensor_type_id !== undefined) { updates.push(`sensor_type_id = $${p++}`); vals.push(sensor_type_id || null); }
        if (location_id !== undefined) { updates.push(`location_id = $${p++}`); vals.push(location_id || null); }
        if (mqtt_topic !== undefined) { updates.push(`mqtt_topic = $${p++}`); vals.push(topicToSave); }

        if (updates.length > 0) {
          updates.push(`updated_at = NOW()`);
          vals.push(sensorId);
          await pool.query(
            `UPDATE sensors SET ${updates.join(', ')} WHERE id = $${p}`,
            vals
          );
        }
      } else {
        // Create a new sensor — mqtt_topic uses provided or defaults to 'voltas', device_id + channel_code for tracing
        if (!location_id || !sensor_type_id) {
          console.warn(`Skipping ${normalizedKey}: missing location_id or sensor_type_id`);
          continue;
        }
        const newSensor = await pool.query(
          `INSERT INTO sensors
             (location_id, sensor_type_id, name, mqtt_topic, device_id, channel_code, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')
           RETURNING id`,
          [location_id, sensor_type_id, sensorName, topicToSave, device_id, normalizedKey]
        );
        sensorId = newSensor.rows[0].id;
      }

      // Upsert to channel_mappings (data_mode = 'auto' — resolved at runtime from Device_status)
      const mappingResult = await pool.query(
        `INSERT INTO channel_mappings (device_id, payload_key, sensor_id, alias, data_mode)
         VALUES ($1, $2, $3, $4, 'auto')
         ON CONFLICT (device_id, payload_key)
         DO UPDATE SET
           sensor_id  = EXCLUDED.sensor_id,
           alias      = EXCLUDED.alias,
           data_mode  = 'auto',
           updated_at = NOW()
         RETURNING *`,
        [device_id, normalizedKey, sensorId, alias || null]
      );

      results.push({ ...mappingResult.rows[0], sensor_id: sensorId });
    }

    res.json({
      message: `Saved ${results.length} channel configs for device "${device_id}"`,
      mappings: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMappings,
  getDevices,
  getMappingById,
  createMapping,
  updateMapping,
  upsertMappings,
  saveDeviceConfig,
  deleteMapping,
  deleteMappingsForDevice
};
