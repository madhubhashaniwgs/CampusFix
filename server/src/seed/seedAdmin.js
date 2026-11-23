import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import connectDB from '../config/database.js';
import User from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'Seed failed: ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.'
    );
    process.exit(1);
  }

  const email = ADMIN_EMAIL.trim().toLowerCase();

  await connectDB();

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`Admin account already exists: ${email}`);
      } else {
        console.error(`Seed failed: ${email} is already registered as a ${existingUser.role}.`);
        process.exitCode = 1;
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await User.create({
      fullName: ADMIN_NAME.trim(),
      email,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });

    console.log(`Admin account created successfully: ${email}`);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
