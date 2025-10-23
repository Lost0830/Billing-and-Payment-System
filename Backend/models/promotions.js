import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  discountCode: { type: String, required: true },
  validFrom: Date,
  validTo: Date,
  isActive: { type: Boolean, default: true },
  targetAudience: String,
  bannerImage: String
}, { timestamps: true });

export default mongoose.model("Promotion", promotionSchema);
