import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    department: { type: String, default: "General" },
    status: { type: String, default: "Active" },
    // Password reset fields (optional) - used for password reset tokens
    resetToken: { type: String },
    resetTokenExpires: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
