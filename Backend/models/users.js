import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    department: { type: String, default: "General" },
    status: { type: String, default: "Active" },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    // Password reset fields (optional) - used for password reset tokens
    resetToken: { type: String },
    resetTokenExpires: { type: Number },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    console.log('Password not modified, skipping hash');
    return next();
  }
  
  try {
    console.log('Hashing password for user:', this.email);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('Comparing passwords for user:', this.email);
  console.log('Stored password hash:', this.password);
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  console.log('Password match result:', isMatch);
  return isMatch;
};

export default mongoose.model("User", userSchema);
