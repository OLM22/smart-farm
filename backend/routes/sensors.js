const express = require('express');
const router = express.Router();
const Sensor = require('../models/Sensor');
const Node = require('../models/Node');

// GET all sensors
router.get('/', async (req, res) => {
    try {
        const sensors = await Sensor.find();
        res.json(sensors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET sensors by node name
router.get('/node', async (req, res) => {
    try {
        const { node_name } = req.query;
        if (!node_name) {
            return res.status(400).json({ error: 'node_name query parameter is required' });
        }
        const node = await Node.findOne({ node_name });
        if (!node) {
            return res.json([]);
        }
        const sensors = await Sensor.find({ node_id: node.node_id });
        res.json(sensors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET sensor by ID
router.get('/:id', async (req, res) => {
    try {
        const sensor = await Sensor.findOne({ sensor_id: req.params.id });
        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }
        res.json(sensor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new sensor
router.post('/', async (req, res) => {
    try {
        const {
            sensor_id, node_id, sensor_type, position,
            par_threshold_min, par_threshold_max, set_data_record_time,
            unit, status, last_calibrated
        } = req.body;

        const sensor = new Sensor({
            sensor_id, node_id, sensor_type, position,
            par_threshold_min, par_threshold_max, set_data_record_time,
            unit, status, last_calibrated
        });
        const savedSensor = await sensor.save();
        res.status(201).json(savedSensor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update sensor
router.put('/:id', async (req, res) => {
    try {
        const {
            node_id, sensor_type, position,
            par_threshold_min, par_threshold_max, set_data_record_time,
            unit, status, last_calibrated
        } = req.body;

        const sensor = await Sensor.findOneAndUpdate(
            { sensor_id: req.params.id },
            {
                node_id, sensor_type, position,
                par_threshold_min, par_threshold_max, set_data_record_time,
                unit, status, last_calibrated
            },
            { new: true }
        );

        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }
        res.json(sensor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE sensor
router.delete('/:id', async (req, res) => {
    try {
        const sensor = await Sensor.findOneAndDelete({ sensor_id: req.params.id });
        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }
        res.json({ message: 'Sensor deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;