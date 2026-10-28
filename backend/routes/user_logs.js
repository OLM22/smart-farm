const express = require('express');
const router = express.Router();
const UserLog = require('../models/UserLog');
const Node = require('../models/Node');

// POST - Create a new user log entry
router.post('/', async (req, res) => {
  const { node_name, activity } = req.body;

  try {
    if (!activity) {
      return res.status(400).json({ error: 'Activity is required' });
    }

    let node_id = null;

    if (node_name) {
      const node = await Node.findOne({ node_name });
      if (!node) {
        return res.status(400).json({ error: 'Invalid node_name - node does not exist' });
      }
      node_id = node.node_id;
    }

    const log = new UserLog({
      timestamp: new Date(),
      node_id,
      activity
    });
    const savedLog = await log.save();
    res.status(201).json(savedLog);
  } catch (err) {
    console.error('Error creating user log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Create a new user log entry with node_id
router.post('/with-node-id', async (req, res) => {
  const { node_id, activity } = req.body;

  try {
    if (!activity) {
      return res.status(400).json({ error: 'Activity is required' });
    }

    const log = new UserLog({
      timestamp: new Date(),
      node_id,
      activity
    });
    const savedLog = await log.save();
    res.status(201).json(savedLog);
  } catch (err) {
    console.error('Error creating user log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Get all user logs
router.get('/', async (req, res) => {
  try {
    const logs = await UserLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching user logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Get user logs by node_id
router.get('/node/:node_id', async (req, res) => {
  try {
    const logs = await UserLog.find({ node_id: req.params.node_id }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching user logs by node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Get user logs by date range
router.get('/date-range', async (req, res) => {
  const { start_date, end_date, node_id } = req.query;

  try {
    const filter = {};
    if (start_date) filter.timestamp = { ...filter.timestamp, $gte: new Date(start_date) };
    if (end_date) filter.timestamp = { ...filter.timestamp, $lte: new Date(end_date) };
    if (node_id) filter.node_id = node_id;

    const logs = await UserLog.find(filter).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching user logs by date range:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Get latest user logs (limit parameter)
router.get('/latest/:limit?', async (req, res) => {
  const limit = parseInt(req.params.limit) || 10;

  try {
    const logs = await UserLog.find().sort({ timestamp: -1 }).limit(limit);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching latest user logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Delete user log by ID
router.delete('/:log_id', async (req, res) => {
  try {
    const log = await UserLog.findByIdAndDelete(req.params.log_id);
    if (!log) {
      return res.status(404).json({ error: 'User log not found' });
    }
    res.json({ message: 'User log deleted successfully' });
  } catch (err) {
    console.error('Error deleting user log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
