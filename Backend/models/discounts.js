import mongoose from "mongoose";

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["percentage", "fixed", "service"], default: "percentage" },
  value: { type: Number, required: true },
  description: String,
  category: String,
  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  maxUsage: Number,
  applicableServices: [String],
  conditions: String
}, { timestamps: true });

export default mongoose.model("Discount", discountSchema);
