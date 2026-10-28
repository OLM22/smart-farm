const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    node_id: { type: String, required: true, unique: true },
    node_name: { type: String, default: '' },
    telegram_token: { type: String, default: '' },
    email: { type: String, default: '' }
}, { timestamps: false });

systemSettingSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
