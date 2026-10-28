const mongoose = require('mongoose');

const cellAnalysisSchema = new mongoose.Schema({
    image_id: { type: String, required: true },
    label_name: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
    size: { type: Number, default: 0 },
    color: { type: String, default: '' },
    area_ratio: { type: Number, default: 0 },
    bbox: { type: mongoose.Schema.Types.Mixed, default: null },
    is_cell: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

cellAnalysisSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.analysis_id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('CellAnalysis', cellAnalysisSchema);
