const mongoose = require('mongoose');

const cameraDataSchema = new mongoose.Schema({
    node_id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    set_data_record_time: { type: Number, default: null },
    image_path: { type: String, default: '' },
    image: { type: String, default: '' }
}, { timestamps: false });

cameraDataSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.image_id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('CameraData', cameraDataSchema);
