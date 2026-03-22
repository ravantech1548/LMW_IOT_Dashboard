const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getAllMappings,
    getDevices,
    getMappingById,
    createMapping,
    updateMapping,
    upsertMappings,
    saveDeviceConfig,
    deleteMapping,
    deleteMappingsForDevice
} = require('../controllers/channelMappingController');

// Middleware: require admin role for write operations
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// IMPORTANT: Named/specific routes MUST come before wildcard /:id routes
// Otherwise Express matches 'devices', 'upsert', 'device-config' as :id params

// GET /api/channel-mappings?device_id=xxx  - list all mappings
router.get('/', authMiddleware, getAllMappings);

// GET /api/channel-mappings/devices  - list distinct device_ids (BEFORE /:id)
router.get('/devices', authMiddleware, getDevices);

// POST /api/channel-mappings  - create new mapping
router.post('/', authMiddleware, requireAdmin, createMapping);

// POST /api/channel-mappings/upsert  - batch upsert (BEFORE /:id)
router.post('/upsert', authMiddleware, requireAdmin, upsertMappings);

// POST /api/channel-mappings/device-config  - unified: create sensors + mappings atomically
router.post('/device-config', authMiddleware, requireAdmin, saveDeviceConfig);

// DELETE /api/channel-mappings/device/:device_id  - delete all for a device (BEFORE /:id)
router.delete('/device/:device_id', authMiddleware, requireAdmin, deleteMappingsForDevice);

// Wildcard /:id routes come LAST
// GET /api/channel-mappings/:id  - get single mapping
router.get('/:id', authMiddleware, getMappingById);

// PUT /api/channel-mappings/:id  - update mapping
router.put('/:id', authMiddleware, requireAdmin, updateMapping);

// DELETE /api/channel-mappings/:id  - delete single mapping
router.delete('/:id', authMiddleware, requireAdmin, deleteMapping);

module.exports = router;
