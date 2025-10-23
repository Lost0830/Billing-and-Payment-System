import mongoose from "mongoose";

const InvoiceItemSchema = new mongoose.Schema({
  description: String,
  quantity: Number,
  rate: Number,
  amount: Number,
  category: String,
});

const InvoiceSchema = new mongoose.Schema({
  number: String,
  patientName: String,
  patientId: String,
  date: String,
  dueDate: String,
  status: String,
  subtotal: Number,
  discount: Number,
  discountType: String,
  discountPercentage: Number,
  total: Number,
  taxableAmount: Number,
  exemptAmount: Number,
  tax: Number,
  items: [InvoiceItemSchema],
  generatedBy: String,
  generatedAt: String,
  notes: String,
});

export default mongoose.model("Invoice", InvoiceSchema);
