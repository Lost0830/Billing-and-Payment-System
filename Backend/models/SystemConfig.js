import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  description: String,
  category: String,
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model("SystemConfig", systemConfigSchema);
