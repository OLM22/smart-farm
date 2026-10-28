const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const sensorDataSchema = require("../models/sensorData").schema;

// List of all sensor collections
const SENSOR_COLLECTIONS = [
  "sensor_co2_inflow_tank_1",
  "sensor_co2_inflow_tank_2",
  "sensor_co2_outflow_tank_1",
  "sensor_co2_outflow_tank_2",
  "sensor_co2_inflow_tube_1",
  "sensor_co2_inflow_tube_2",
  "sensor_co2_outflow_tube_1",
  "sensor_co2_outflow_tube_2",
  "sensor_co2_inflow",
  "sensor_co2_water",
  "sensor_co2_outflow",
  "sensor_co2_outside",
  "sensor_co2_inflow_n30",
  "sensor_co2_outflow_n31",
  "sensor_co2_inflow_n7",
  "sensor_co2_outflow_n8",
  "sensor_co2_flow_rate",
  "sensor_co2_flow_rate_acc",
  "sensor_do_intube1",
  "sensor_ec_reactor",
  "sensor_humid_inflow",
  "sensor_humid_outflow",
  "sensor_o2_inflow",
  "sensor_o2_outflow",
  "sensor_orp_reactor",
  "sensor_ph_reactor",

  "sensor_tds_reactor",
  "sensor_temp_inflow",
  "sensor_temp_outflow",
  "sensor_temp_reactor",
  "sensor_pressure_reactor",
  "sensor_co2_inflow_temp",
  "sensor_co2_inflow_humid",
  "sensor_co2_outflow_temp",
  "sensor_co2_outflow_humid",
  "sensor_ppfd_reactor",
  "sensor_lux_reactor",
];

// Helper to get model for any collection
function getSensorModel(collectionName) {
  return mongoose.model(collectionName, sensorDataSchema, collectionName);
}

// GET all collections
router.get("/collections", async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionNames = collections.map((collection) => collection.name);
    res.json(collectionNames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all documents from a collection
router.get("/:collection", async (req, res) => {
  try {
    const Model = getSensorModel(req.params.collection);
    const data = await Model.find({});
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET latest document from a collection
router.get("/:collection/latest", async (req, res) => {
  try {
    const Model = getSensorModel(req.params.collection);
    const latest = await Model.findOne({}).sort({ timestamp: -1 });
    if (!latest) {
      return res.status(404).json({ error: "No data found" });
    }
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET documents by date-time range and device_id
// Example: /api/sensors/sensor_co2_inflow/filter?start=2025-05-01T00:00:00Z&end=2025-05-10T23:59:59Z&device_id=Chlorella_40L_001&batch_no=1
router.get("/:collection/filter", async (req, res) => {
  try {
    const { start, end, device_id, batch_no } = req.query;
    const Model = getSensorModel(req.params.collection);
    const filter = {};

    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = new Date(start);
      if (end) filter.timestamp.$lte = new Date(end);
    }
    if (device_id) {
      filter.device_id = device_id;
    }
    if (batch_no !== undefined && batch_no !== null && batch_no !== "") {
      const batchNumber = Number(batch_no);
      if (!isNaN(batchNumber)) {
        filter.batch_no = batchNumber;
      }
    }

    const data = await Model.find(filter);
    res.json(data);
  } catch (err) {
    console.error("Error in filter route:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET latest sensor data for all collections for a given device_id (node)
router.get("/latest-all/:device_id", async (req, res) => {
  const deviceId = req.params.device_id;

  try {
    const promises = SENSOR_COLLECTIONS.map(async (collection) => {
      const Model = getSensorModel(collection);
      const latest = await Model.findOne({ device_id: deviceId })
        .sort({ timestamp: -1 })
        .lean(); // ใช้ lean() เพื่อ performance

      return latest
        ? {
          collection,
          data: {
            value: latest.value,
            unit: latest.unit,
            timestamp: latest.timestamp,
          },
        }
        : null;
    });

    const results = await Promise.all(promises);

    // สร้าง object ตามชื่อ collection
    const response = {};
    results.forEach((entry) => {
      if (entry) {
        response[entry.collection] = entry.data;
      }
    });

    res.json(response);
  } catch (err) {
    console.error("Error in /latest-all/:device_id:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET documents by date-time range and device_id for multiple collections
// Example: /api/sensors/filter-multi/sensor_co2_inflow,sensor_temp_reactor?start=2025-05-01T00:00:00Z&end=2025-05-10T23:59:59Z&device_id=Chlorella_40L_001&batch_no=1
router.get("/filter-multi/:collections", async (req, res) => {
  try {
    const { start, end, device_id, batch_no } = req.query;
    const collectionNames = req.params.collections.split(",");
    const result = {};

    // Build filter object
    const filter = {};
    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = new Date(start);
      if (end) filter.timestamp.$lte = new Date(end);
    }
    if (device_id) {
      filter.device_id = device_id;
    }
    if (batch_no !== undefined && batch_no !== null && batch_no !== "") {
      const batchNumber = Number(batch_no);
      if (!isNaN(batchNumber)) {
        filter.batch_no = batchNumber;
      }
    }

    // Query each collection
    for (const collectionName of collectionNames) {
      const Model = getSensorModel(collectionName);
      const data = await Model.find(filter);
      result[collectionName] = data;
    }

    res.json(result);
  } catch (err) {
    console.error("Error in filter-multi route:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST insert sensor data into a specific collection (for simulation/testing)
router.post("/:collection", async (req, res) => {
  try {
    const { timestamp, sensor_type, device_id, unit, location, batch_no, value } = req.body;
    const Model = getSensorModel(req.params.collection);

    const doc = new Model({
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      sensor_type: sensor_type || req.params.collection.replace(/^sensor_/, ""),
      device_id: device_id || "Chlorella_40L_001",
      unit: unit || "",
      location: location || "reactor",
      batch_no: batch_no !== undefined ? batch_no : 1,
      value: value,
    });

    const saved = await doc.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error in POST /:collection:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
