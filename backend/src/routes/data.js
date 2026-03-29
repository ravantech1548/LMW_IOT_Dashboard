const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getSensorData,
  getLatestSensorData,
  getAggregatedData,
  getDeviceIntervalReports
} = require('../controllers/dataController');

router.use(authMiddleware);

router.get('/sensor/:sensor_id', getSensorData);
router.get('/latest', getLatestSensorData);
router.get('/aggregated', getAggregatedData);
router.get('/device-reports/:device_id', getDeviceIntervalReports);

module.exports = router;


