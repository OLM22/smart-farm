const express = require('express');
const router = express.Router();
const CameraData = require('../models/CameraData');

// Get all camera data
router.get('/', async (req, res) => {
  try {
    const data = await CameraData.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error('Error fetching camera data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get camera data by ID
router.get('/:id', async (req, res) => {
  try {
    const data = await CameraData.findById(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Camera data not found' });
    }
    res.json(data);
  } catch (err) {
    console.error('Error fetching camera data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get camera data by node ID
router.get('/node/:nodeId', async (req, res) => {
  try {
    const data = await CameraData.find({ node_id: req.params.nodeId }).sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error('Error fetching camera data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new camera data
router.post('/', async (req, res) => {
  const { node_id, timestamp, set_data_record_time, image_path, image } = req.body;
  try {
    const data = new CameraData({
      node_id,
      timestamp: timestamp || new Date(),
      set_data_record_time,
      image_path,
      image
    });
    const savedData = await data.save();
    res.status(201).json(savedData);
  } catch (err) {
    console.error('Error creating camera data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update camera data
router.put('/:id', async (req, res) => {
  const { node_id, timestamp, set_data_record_time, image_path, image } = req.body;
  try {
    const data = await CameraData.findByIdAndUpdate(
      req.params.id,
      { node_id, timestamp, set_data_record_time, image_path, image },
      { new: true }
    );
    if (!data) {
      return res.status(404).json({ error: 'Camera data not found' });
    }
    res.json(data);
  } catch (err) {
    console.error('Error updating camera data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete camera data
router.delete('/:id', async (req, res) => {
  try {
    const data = await CameraData.findByIdAndDelete(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Camera data not found' });
    }
    res.json({ message: 'Camera data deleted successfully' });
  } catch (err) {
    console.error('Error deleting camera data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;