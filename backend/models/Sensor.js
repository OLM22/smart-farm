const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
    sensor_id: { type: String, required: true, unique: true },
    node_id: { type: String, required: true },
    sensor_type: { type: String, required: true },
    position: { type: String, default: '' },
    par_threshold_min: { type: Number, default: null },
    par_threshold_max: { type: Number, default: null },
    set_data_record_time: { type: Number, default: null },
    unit: { type: String, default: '' },
    status: { type: String, default: 'active' },
    last_calibrated: { type: Date, default: null }
}, { timestamps: false });

module.exports = mongoose.model('Sensor', sensorSchema);
