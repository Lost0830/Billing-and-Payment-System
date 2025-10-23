import express from "express";
import Patient from "../models/patient.js"; // ensure this path is correct
const router = express.Router();

// GET /api/patients
router.get("/", async (req, res) => {
  try {
    const patients = await Patient.find({}).lean();
    res.json({ success: true, data: patients });
  } catch (err) {
    console.error("GET /api/patients error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/patients
router.post("/", async (req, res) => {
  try {
    const doc = new Patient(req.body);
    const saved = await doc.save();
    res.json({ success: true, data: saved });
  } catch (err) {
    console.error("POST /api/patients error", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create patient" });
  }
});

// PUT /api/patients/:id
router.put("/:id", async (req, res) => {
  try {
    const updated = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT /api/patients error", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update patient" });
  }
});

// DELETE /api/patients/:id
router.delete("/:id", async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/patients error", err);
    res.status(500).json({ success: false, message: err.message || "Failed to delete patient" });
  }
});

export default router;