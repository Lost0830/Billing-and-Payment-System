import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  description: String,
  category: String,
  quantity: Number,
  rate: Number,
  amount: Number,
});

const billingSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  patientId: String,
  patientNumber: String,
  patientName: String,
  items: [itemSchema],
  subtotal: Number,
  discount: Number,
  discountType: String,
  discountPercentage: Number,
  tax: Number,
  total: Number,
  status: { type: String, default: "unpaid" },
  issuedDate: { type: Date, default: Date.now },
  dueDate: Date,
  generatedBy: String,
  generatedAt: Date,
  notes: String,
});

export default mongoose.model("Billing", billingSchema);