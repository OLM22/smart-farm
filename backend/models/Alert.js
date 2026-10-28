const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    node_id: { type: String, required: true },
    sensor_id: { type: String, required: true },
    alert_type: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    timestamp: { type: Date, default: Date.now },
    is_read: { type: Boolean, default: false }
}, { timestamps: false });

// Virtual field to mimic PG's alert_id (use _id as string)
alertSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.alert_id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Alert', alertSchema);
