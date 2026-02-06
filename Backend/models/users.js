import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: String, unique: true },
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

// Ensure userId exists to satisfy unique index if present
userSchema.pre('save', function(next) {
  if (!this.userId || String(this.userId).trim() === '') {
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 1000);
    this.userId = `USR${String(ts).slice(-6)}${String(rand).padStart(3, '0')}`;
  }
  next();
});

// Method to compare password for login (plain text comparison)
userSchema.methods.comparePassword = function(candidatePassword) {
  console.log('Comparing passwords for user:', this.email);
  console.log('Stored password:', this.password);
  console.log('Input password:', candidatePassword);
  const isMatch = this.password === candidatePassword;
  console.log('Password match result:', isMatch);
  return isMatch;
};

export default mongoose.model("User", userSchema);
