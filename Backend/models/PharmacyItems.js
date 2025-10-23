import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  invoiceNumber: String,
  patientName: String,
  patientId: String,
  amount: Number,
  method: String,
  status: { type: String, default: "completed" },
  date: { type: Date, default: Date.now },
  time: String,
  reference: String,
  discount: Number,
  discountType: String,
  discountPercentage: Number,
  subtotal: Number,
  taxableAmount: Number,
  tax: Number,
  exemptAmount: Number,
  cashReceived: Number,
  change: Number,
  processedBy: String,
});

export default mongoose.model("Payment", PaymentSchema);
