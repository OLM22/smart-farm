const express = require('express');
const router = express.Router();
const ImageAnalysis = require('../models/ImageAnalysis');
const CameraData = require('../models/CameraData');
const Node = require('../models/Node');

// Helper: enrich image analysis with node_name
async function enrichWithNodeName(analyses) {
  const enriched = [];
  for (const ia of analyses) {
    const obj = ia.toJSON ? ia.toJSON() : { ...ia };
    // Look up camera_data to get node_id, then node to get node_name
    const camera = await CameraData.findById(obj.image_id);
    if (camera) {
      const node = await Node.findOne({ node_id: camera.node_id });
      obj.node_name = node ? node.node_name : '';
    } else {
      obj.node_name = obj.node_name || '';
    }
    enriched.push(obj);
  }
  return enriched;
}

// GET all image analysis data
router.get('/', async (req, res) => {
  try {
    const { node_name } = req.query;
    let analyses;

    if (node_name) {
      // Find node by name, then camera_data by node_id, then analyses by image_ids
      const node = await Node.findOne({ node_name });
      if (!node) return res.json([]);
      const cameras = await CameraData.find({ node_id: node.node_id });
      const imageIds = cameras.map(c => c._id.toString());
      analyses = await ImageAnalysis.find({ image_id: { $in: imageIds } }).sort({ timestamp: -1 });
    } else {
      analyses = await ImageAnalysis.find().sort({ timestamp: -1 });
    }

    const enriched = await enrichWithNodeName(analyses);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET latest image analysis data
router.get('/latest', async (req, res) => {
  try {
    const { node_name } = req.query;
    let analysis;

    if (node_name) {
      const node = await Node.findOne({ node_name });
      if (!node) return res.status(404).json({ error: 'No image analysis data found' });
      const cameras = await CameraData.find({ node_id: node.node_id });
      const imageIds = cameras.map(c => c._id.toString());
      analysis = await ImageAnalysis.findOne({ image_id: { $in: imageIds } }).sort({ timestamp: -1 });
    } else {
      analysis = await ImageAnalysis.findOne().sort({ timestamp: -1 });
    }

    if (!analysis) {
      return res.status(404).json({ error: 'No image analysis data found' });
    }

    const enriched = await enrichWithNodeName([analysis]);
    res.json(enriched[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET image analysis data within date range
router.get('/filter/date-range', async (req, res) => {
  try {
    const { start, end, node_name } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const filter = {
      timestamp: { $gte: new Date(start), $lte: new Date(end) }
    };

    if (node_name) {
      const node = await Node.findOne({ node_name });
      if (!node) return res.json([]);
      const cameras = await CameraData.find({ node_id: node.node_id });
      const imageIds = cameras.map(c => c._id.toString());
      filter.image_id = { $in: imageIds };
    }

    const analyses = await ImageAnalysis.find(filter).sort({ timestamp: -1 });
    const enriched = await enrichWithNodeName(analyses);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET specific image analysis by image_id
router.get('/:image_id', async (req, res) => {
  try {
    const { image_id } = req.params;
    const { node_name } = req.query;

    let analysis;
    if (node_name) {
      const node = await Node.findOne({ node_name });
      if (!node) return res.status(404).json({ error: 'Image analysis not found' });
      const cameras = await CameraData.find({ node_id: node.node_id });
      const imageIds = cameras.map(c => c._id.toString());
      analysis = await ImageAnalysis.findOne({ image_id, image_id: { $in: imageIds } });
    } else {
      analysis = await ImageAnalysis.findOne({ image_id });
    }

    if (!analysis) {
      return res.status(404).json({ error: 'Image analysis not found' });
    }

    const enriched = await enrichWithNodeName([analysis]);
    res.json(enriched[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;