const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'cru-smartfarm',
        });
        console.log('Connected to MongoDB');

        const usersToSeed = [
            {
                username: 'admin',
                password: '1234',
                email: 'admin@cru.local',
                role: 'admin'
            },
            {
                username: 'aiotchlorella',
                password: 'P@$$w0rd2025',
                email: 'aiotchlorella@admin.local',
                role: 'admin'
            }
        ];

        for (const u of usersToSeed) {
            // Check if user already exists
            const existing = await User.findOne({ username: u.username });
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(u.password, salt);

            if (existing) {
                // Update the password and role
                existing.password = hashedPassword;
                existing.role = u.role;
                existing.email = u.email;
                await existing.save();
                console.log(`User "${u.username}" already existed — password and role updated.`);
            } else {
                const user = new User({
                    username: u.username,
                    password: hashedPassword,
                    email: u.email,
                    role: u.role,
                    created_at: new Date(),
                });
                await user.save();
                console.log(`Admin user "${u.username}" created successfully.`);
            }
        }

        await mongoose.disconnect();
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
}

seedAdmin();
