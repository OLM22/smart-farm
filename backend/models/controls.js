const mongoose = require('mongoose');

const controlsSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
});

module.exports = mongoose.model('Control', controlsSchema); 