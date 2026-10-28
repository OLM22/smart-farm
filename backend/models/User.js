const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'user' },
    created_at: { type: Date, default: Date.now }
}, { timestamps: false });

userSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.user_id = ret._id.toString();
        delete ret.password;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
