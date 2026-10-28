const mongoose = require('mongoose');

const deviceStatusLogSchema = new mongoose.Schema({
    device_name: { type: String, required: true },
    node_id: { type: String, default: null },
    status: { type: String, default: '' },
    control_mode: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    remark: { type: String, default: '' }
}, { timestamps: false });

deviceStatusLogSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.log_id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('DeviceStatusLog', deviceStatusLogSchema);
