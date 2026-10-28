const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting');

// Get all system settings
router.get('/', async (req, res) => {
  try {
    const settings = await SystemSetting.find().sort({ node_id: 1 });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching system settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get system setting by node ID
router.get('/:nodeId', async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ node_id: req.params.nodeId });
    if (!setting) {
      return res.status(404).json({ error: 'System setting not found' });
    }
    res.json(setting);
  } catch (err) {
    console.error('Error fetching system setting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new system setting
router.post('/', async (req, res) => {
  const { node_id, node_name, telegram_token, email } = req.body;
  try {
    const setting = new SystemSetting({ node_id, node_name, telegram_token, email });
    const savedSetting = await setting.save();
    res.status(201).json(savedSetting);
  } catch (err) {
    console.error('Error creating system setting:', err);
    if (err.code === 11000) {
      res.status(400).json({ error: 'Node ID already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update system setting
router.put('/:nodeId', async (req, res) => {
  const { node_name, telegram_token, email } = req.body;
  try {
    const setting = await SystemSetting.findOneAndUpdate(
      { node_id: req.params.nodeId },
      { node_name, telegram_token, email },
      { new: true }
    );
    if (!setting) {
      return res.status(404).json({ error: 'System setting not found' });
    }
    res.json(setting);
  } catch (err) {
    console.error('Error updating system setting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete system setting
router.delete('/:nodeId', async (req, res) => {
  try {
    const setting = await SystemSetting.findOneAndDelete({ node_id: req.params.nodeId });
    if (!setting) {
      return res.status(404).json({ error: 'System setting not found' });
    }
    res.json({ message: 'System setting deleted successfully' });
  } catch (err) {
    console.error('Error deleting system setting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;