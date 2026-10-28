const express = require('express');
const router = express.Router();
const DeviceStatusLog = require('../models/DeviceStatusLog');

// Get all device status logs
router.get('/', async (req, res) => {
  try {
    const logs = await DeviceStatusLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching device status logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get device status logs by node ID
router.get('/node/:nodeId', async (req, res) => {
  try {
    const logs = await DeviceStatusLog.find({ node_id: req.params.nodeId }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching device status logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get device status logs by device name
router.get('/device/:deviceName', async (req, res) => {
  try {
    const logs = await DeviceStatusLog.find({ device_name: req.params.deviceName }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching device status logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get device status logs by date range
router.get('/date-range', async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    const logs = await DeviceStatusLog.find({
      timestamp: { $gte: new Date(start_date), $lte: new Date(end_date) }
    }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching device status logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new device status log
router.post('/', async (req, res) => {
  const { device_name, node_id, status, control_mode, remark } = req.body;
  try {
    const log = new DeviceStatusLog({
      device_name,
      node_id,
      status,
      control_mode,
      timestamp: new Date(),
      remark
    });
    const savedLog = await log.save();
    res.status(201).json(savedLog);
  } catch (err) {
    console.error('Error creating device status log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update device status log
router.put('/:logId', async (req, res) => {
  const { device_name, node_id, status, control_mode, remark } = req.body;
  try {
    const log = await DeviceStatusLog.findByIdAndUpdate(
      req.params.logId,
      { device_name, node_id, status, control_mode, remark },
      { new: true }
    );
    if (!log) {
      return res.status(404).json({ error: 'Device status log not found' });
    }
    res.json(log);
  } catch (err) {
    console.error('Error updating device status log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete device status log
router.delete('/:logId', async (req, res) => {
  try {
    const log = await DeviceStatusLog.findByIdAndDelete(req.params.logId);
    if (!log) {
      return res.status(404).json({ error: 'Device status log not found' });
    }
    res.json({ message: 'Device status log deleted successfully' });
  } catch (err) {
    console.error('Error deleting device status log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;