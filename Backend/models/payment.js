import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  patientName: { type: String, required: true },
  patientId: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  status: { type: String, default: "pending" }, // pending | processing | completed | failed
  date: { type: String },
  time: { type: String },
  reference: { type: String },
  processedBy: { type: String },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model("Payment", PaymentSchema);
