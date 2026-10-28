const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Node = require('../models/Node');
const Sensor = require('../models/Sensor');
const mongoose = require('mongoose');
const mqttRouter = require('./mqtt');
require('dotenv').config();

// Store sensor states with node_id as part of the key
const sensorStates = new Map();

// Function to check sensor data and create alerts
async function checkSensorDataAndCreateAlerts() {
    try {
        // Get all nodes
        const nodes = await Node.find();

        for (const node of nodes) {
            // Get all sensors for this node
            const sensors = await Sensor.find({ node_id: node.node_id });

            for (const sensor of sensors) {
                const collectionName = sensor.sensor_type;

                // Get the latest data from MongoDB collection for this specific node
                const latestData = await mongoose.connection.db
                    .collection(collectionName)
                    .findOne(
                        { device_id: node.node_name },
                        { sort: { timestamp: -1 } }
                    );

                if (!latestData) continue;

                const value = latestData.value;
                const sensorKey = `${node.node_id}_${sensor.sensor_id}`;
                const previousState = sensorStates.get(sensorKey) || 'NORMAL';
                const controlStatus = mqttRouter.getControlStatus ? mqttRouter.getControlStatus() : {};

                // Determine current state
                let currentState = 'NORMAL';
                if (sensor.par_threshold_min !== null && value < sensor.par_threshold_min) {
                    currentState = 'LOW';
                } else if (sensor.par_threshold_max !== null && value > sensor.par_threshold_max) {
                    currentState = 'HIGH';
                } else {
                    // Check Max Threshold based on sensor type and controlStatus
                    if (collectionName === 'sensor_temp') {
                        if (controlStatus.tempMaxLow !== null && value < controlStatus.tempMaxLow) {
                            currentState = 'MAX_LOW';
                        } else if (controlStatus.tempMaxHigh !== null && value > controlStatus.tempMaxHigh) {
                            currentState = 'MAX_HIGH';
                        }
                    } else if (collectionName === 'sensor_ph') {
                        if (controlStatus.phMaxLow !== null && value < controlStatus.phMaxLow) {
                            currentState = 'MAX_LOW';
                        } else if (controlStatus.phMaxHigh !== null && value > controlStatus.phMaxHigh) {
                            currentState = 'MAX_HIGH';
                        }
                    } else if (collectionName === 'sensor_co2') {
                        if (controlStatus.co2MaxLow !== null && value < controlStatus.co2MaxLow) {
                            currentState = 'MAX_LOW';
                        } else if (controlStatus.co2MaxHigh !== null && value > controlStatus.co2MaxHigh) {
                            currentState = 'MAX_HIGH';
                        }
                    }
                }

                // Only create alert if state has changed and is not returning to normal
                if (currentState !== previousState && currentState !== 'NORMAL') {
                    const sensorTypeDisplay = collectionName
                        .replace('sensor_', '')
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                    let alertType;
                    if (currentState === 'LOW') {
                        alertType = `${sensorTypeDisplay} Too Low (${value} ${sensor.unit || ''})`;
                    } else if (currentState === 'HIGH') {
                        alertType = `${sensorTypeDisplay} Too High (${value} ${sensor.unit || ''})`;
                    } else if (currentState === 'MAX_LOW') {
                        alertType = `${sensorTypeDisplay} Below Max Threshold Low (${value} ${sensor.unit || ''})`;
                    } else if (currentState === 'MAX_HIGH') {
                        alertType = `${sensorTypeDisplay} Above Max Threshold High (${value} ${sensor.unit || ''})`;
                    }

                    const alert = new Alert({
                        node_id: node.node_id,
                        sensor_id: sensor.sensor_id,
                        alert_type: alertType,
                        severity: 'high',
                        timestamp: new Date()
                    });
                    const savedAlert = await alert.save();

                    // Line alert notification removed
                }

                sensorStates.set(sensorKey, currentState);
            }
        }
    } catch (err) {
        console.error('\n❌ Error in checkSensorDataAndCreateAlerts:', err);
    }
}

// Schedule the check every minute
const cron = require('node-cron');
console.log('Setting up cron job to check sensor data every minute');
cron.schedule('* * * * *', () => {
    console.log('\n=== Starting new sensor check cycle ===');
    console.log('Cron job triggered at:', new Date().toISOString());
    checkSensorDataAndCreateAlerts();
});

// Track if we have already alerted about mainlocal.py stopping (keyed by node_id)
const mainlocalAlerted = new Map();

async function checkMainlocalStatus() {
    try {
        // Find active nodes (fallback to all nodes if none are active)
        const activeNodes = await Node.find({ status: 'active' });
        const nodesToCheck = activeNodes.length > 0 ? activeNodes : await Node.find();
        
        for (const node of nodesToCheck) {
            const sensors = await Sensor.find({ node_id: node.node_id });
            
            // Fallback to standard sensor collections if sensors collection is empty
            const sensorTypesToCheck = sensors.length > 0 
                ? sensors.map(s => s.sensor_type) 
                : ['sensor_ph_reactor', 'sensor_temp_reactor'];

            let mostRecentTimestamp = null;
            for (const type of sensorTypesToCheck) {
                const latestData = await mongoose.connection.db
                    .collection(type)
                    .findOne(
                        { device_id: node.node_name },
                        { sort: { timestamp: -1 } }
                    );
                if (latestData && latestData.timestamp) {
                    const ts = new Date(latestData.timestamp);
                    if (!mostRecentTimestamp || ts > mostRecentTimestamp) {
                        mostRecentTimestamp = ts;
                    }
                }
            }

            const now = new Date();
            const nodeId = node.node_id;
            
            // If data exists, check if the latest update is older than 5 minutes (300,000 ms)
            // If no data exists at all, we treat it as offline to be safe
            const isOffline = !mostRecentTimestamp || (now - mostRecentTimestamp) > 5 * 60 * 1000;

            if (isOffline) {
                if (!mainlocalAlerted.get(nodeId)) {
                    mainlocalAlerted.set(nodeId, true);
                    console.log(`🚨 mainlocal.py offline alert triggered for node ${node.node_name}!`);
                }
            } else {
                // Only recover if we actually have recent data
                if (mainlocalAlerted.get(nodeId)) {
                    mainlocalAlerted.set(nodeId, false);
                    console.log(`🟢 mainlocal.py online recovery alert triggered for node ${node.node_name}!`);
                }
            }
        }
    } catch (err) {
        console.error('Error checking mainlocal.py status:', err);
    }
}

// Check mainlocal status every 2 minutes
cron.schedule('*/2 * * * *', () => {
    console.log('Checking status of mainlocal.py...');
    checkMainlocalStatus();
});


// Helper: enrich alerts with node_name and sensor_type
async function enrichAlerts(alerts) {
    const enriched = [];
    for (const alert of alerts) {
        const alertObj = alert.toJSON ? alert.toJSON() : { ...alert };
        const node = await Node.findOne({ node_id: alertObj.node_id });
        const sensor = await Sensor.findOne({ sensor_id: alertObj.sensor_id });
        alertObj.node_name = node ? node.node_name : '';
        alertObj.sensor_type = sensor ? sensor.sensor_type : '';
        enriched.push(alertObj);
    }
    return enriched;
}

// Get all alerts
router.get('/', async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ timestamp: -1 });
        const enriched = await enrichAlerts(alerts);
        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get unread alerts
router.get('/unread', async (req, res) => {
    try {
        const alerts = await Alert.find({ is_read: false }).sort({ timestamp: -1 });
        const enriched = await enrichAlerts(alerts);
        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get alert by ID
router.get('/:id', async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const enriched = await enrichAlerts([alert]);
        res.json(enriched[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new alert
router.post('/', async (req, res) => {
    try {
        const { node_id, sensor_id, alert_type, severity, timestamp } = req.body;
        const alert = new Alert({
            node_id,
            sensor_id,
            alert_type,
            severity,
            timestamp: timestamp || new Date()
        });
        const savedAlert = await alert.save();

        // Line alert notification removed

        res.status(201).json(savedAlert);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update alert
router.put('/:id', async (req, res) => {
    try {
        const { node_id, sensor_id, alert_type, severity, timestamp, is_read } = req.body;
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { node_id, sensor_id, alert_type, severity, timestamp, is_read },
            { new: true }
        );
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json(alert);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete alert
router.delete('/:id', async (req, res) => {
    try {
        const alert = await Alert.findByIdAndDelete(req.params.id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json({ message: 'Alert deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark alert as read
router.patch('/:id/read', async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { is_read: true },
            { new: true }
        );
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json(alert);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;