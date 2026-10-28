const express = require('express');
const router = express.Router();
const Node = require('../models/Node');

// Get all nodes
router.get('/', async (req, res) => {
  try {
    const nodes = await Node.find().sort({ node_id: 1 });
    res.json(nodes);
  } catch (err) {
    console.error('Error fetching nodes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all node names
router.get('/names', async (req, res) => {
  try {
    const nodes = await Node.find().sort({ node_id: 1 }).select('node_name');
    res.json(nodes.map(n => n.node_name));
  } catch (err) {
    console.error('Error fetching node names:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get node by ID
router.get('/:id', async (req, res) => {
  try {
    const node = await Node.findOne({ node_id: req.params.id });
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    res.json(node);
  } catch (err) {
    console.error('Error fetching node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new node
router.post('/', async (req, res) => {
  const { node_id, node_name, location, status } = req.body;
  try {
    const node = new Node({
      node_id,
      node_name,
      location,
      status,
      last_update: new Date()
    });
    const savedNode = await node.save();
    res.status(201).json(savedNode);
  } catch (err) {
    console.error('Error creating node:', err);
    if (err.code === 11000) { // Duplicate key
      res.status(400).json({ error: 'Node ID already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update node
router.put('/:id', async (req, res) => {
  const { node_name, location, status } = req.body;
  try {
    const node = await Node.findOneAndUpdate(
      { node_id: req.params.id },
      { node_name, location, status, last_update: new Date() },
      { new: true }
    );
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    res.json(node);
  } catch (err) {
    console.error('Error updating node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete node
router.delete('/:id', async (req, res) => {
  try {
    const node = await Node.findOneAndDelete({ node_id: req.params.id });
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    res.json({ message: 'Node deleted successfully' });
  } catch (err) {
    console.error('Error deleting node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;