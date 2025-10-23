import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patientId: String,
  patientName: String,
  doctorName: String,
  department: String,
  date: { type: Date, required: true },
  time: String,
  status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Appointment", appointmentSchema);
