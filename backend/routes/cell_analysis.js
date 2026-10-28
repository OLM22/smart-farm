const express = require('express');
const router = express.Router();
const CellAnalysis = require('../models/CellAnalysis');

// Get all cell analysis data
router.get('/', async (req, res) => {
  try {
    const data = await CellAnalysis.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error('Error fetching cell analysis data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cell analysis by ID
router.get('/:id', async (req, res) => {
  try {
    const data = await CellAnalysis.findById(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Cell analysis not found' });
    }
    res.json(data);
  } catch (err) {
    console.error('Error fetching cell analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cell analysis by image ID
router.get('/image/:imageId', async (req, res) => {
  try {
    const data = await CellAnalysis.find({ image_id: req.params.imageId }).sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error('Error fetching cell analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new cell analysis
router.post('/', async (req, res) => {
  const {
    image_id, label_name, confidence, size,
    color, area_ratio, bbox, is_cell
  } = req.body;

  try {
    const analysis = new CellAnalysis({
      image_id, label_name, confidence, size,
      color, area_ratio, bbox, is_cell
    });
    const savedAnalysis = await analysis.save();
    res.status(201).json(savedAnalysis);
  } catch (err) {
    console.error('Error creating cell analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cell analysis
router.put('/:id', async (req, res) => {
  const {
    image_id, label_name, confidence, size,
    color, area_ratio, bbox, is_cell
  } = req.body;

  try {
    const analysis = await CellAnalysis.findByIdAndUpdate(
      req.params.id,
      { image_id, label_name, confidence, size, color, area_ratio, bbox, is_cell },
      { new: true }
    );
    if (!analysis) {
      return res.status(404).json({ error: 'Cell analysis not found' });
    }
    res.json(analysis);
  } catch (err) {
    console.error('Error updating cell analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete cell analysis
router.delete('/:id', async (req, res) => {
  try {
    const analysis = await CellAnalysis.findByIdAndDelete(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Cell analysis not found' });
    }
    res.json({ message: 'Cell analysis deleted successfully' });
  } catch (err) {
    console.error('Error deleting cell analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;