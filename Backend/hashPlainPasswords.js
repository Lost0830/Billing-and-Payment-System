import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/users.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Billing';

const isBcryptHash = (pw) => typeof pw === 'string' && /^\$2[aby]\$/.test(pw);

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected. Scanning users for plain-text passwords...');

    const users = await User.find().lean();
    const toFix = users.filter(u => !isBcryptHash(u.password));

    console.log(`Found ${users.length} users, ${toFix.length} need password hashing.`);

    for (const u of toFix) {
      try {
        console.log(`Hashing password for user: ${u.email}`);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(u.password || '', salt);
        await User.updateOne({ _id: u._id }, { $set: { password: hash } });
        console.log('Password hashed successfully');
      } catch (err) {
        console.error('Failed to hash for', u.email, err.message);
      }
    }

    console.log('Done. Closing connection.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
};

run();
