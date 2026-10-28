const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
    node_id: { type: String, required: true, unique: true },
    node_name: { type: String, required: true },
    location: { type: String, default: '' },
    status: { type: String, default: 'active' },
    last_update: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('Node', nodeSchema);
