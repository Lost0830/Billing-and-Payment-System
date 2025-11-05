import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dateOfBirth: String,
  sex: String,
  contactNumber: String,
  address: String,
  email: String,
  bloodType: String,
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  services: { type: Array, default: [] },
  medicines: { type: Array, default: [] },
  createdBy: String,
  createdByRole: String,
  createdAt: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: String }
});

export default mongoose.models.Patient || mongoose.model("Patient", PatientSchema);