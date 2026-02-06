import mongoose from "mongoose";
import User from "./models/users.js";
import bcrypt from "bcryptjs";

const BILLING_MONGO_URI = process.env.BILLING_MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URI || "";

async function createTestUser() {
  try {
    if (!BILLING_MONGO_URI) {
      console.error("❌ BILLING_MONGO_URI not set. Set it in your .env before running this script.");
      process.exit(1);
    }

    await mongoose.connect(BILLING_MONGO_URI);
    console.log("Connected to Billing MongoDB");

    // Delete existing test users
    await User.deleteMany({ email: "test@example.com" });

    // Create a new test user with known credentials
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("test123", salt);

    const testUser = new User({
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      role: "admin",
      department: "Test",
      status: "Active"
    });

    await testUser.save();
    console.log("Test user created successfully!");
    console.log("Email: test@example.com");
    console.log("Password: test123");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createTestUser();