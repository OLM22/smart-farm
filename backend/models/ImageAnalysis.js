const mongoose = require('mongoose');

const imageAnalysisSchema = new mongoose.Schema({
    image_id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    node_name: { type: String, default: '' },
    // Additional analysis fields stored as flexible mixed data
    results: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: false, strict: false });

imageAnalysisSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('ImageAnalysis', imageAnalysisSchema);
