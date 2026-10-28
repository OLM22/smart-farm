const mongoose = require('mongoose');

const userLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    node_id: { type: String, default: null },
    activity: { type: String, required: true }
}, { timestamps: false });

userLogSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.log_id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('UserLog', userLogSchema);
