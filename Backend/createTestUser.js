import mongoose from "mongoose";
import User from "./models/users.js";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/Billing";

async function createTestUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

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