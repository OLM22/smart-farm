const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  sensor_type: { type: String, required: true },
  device_id: { type: String, required: true },
  unit: { type: String, required: true },
  location: { type: String, required: true },
  batch_no: { type: Number, required: true },
  value: { type: Number, required: true }
});

module.exports = mongoose.model('SensorData', sensorDataSchema); 