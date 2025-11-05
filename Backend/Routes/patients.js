import express from "express";
import Patient from "../models/patient.js"; // ensure this path is correct
const router = express.Router();

// GET /api/patients
// Treat missing `isArchived` field as not archived so older documents without the field are included
router.get("/", async (req, res) => {
  try {
    const patients = await Patient.find({ $or: [ { isArchived: false }, { isArchived: { $exists: false } } ] }).lean();
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

// Archive /api/patients/:id/archive
router.post("/:id/archive", async (req, res) => {
  try {
    const updated = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.body.userId // Assuming userId is passed in request body
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Patient not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("POST /api/patients/:id/archive error", err);
    res.status(500).json({ success: false, message: err.message || "Failed to archive patient" });
  }
});

// Restore /api/patients/:id/restore
router.post("/:id/restore", async (req, res) => {
  try {
    const updated = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: false,
        archivedAt: null,
        archivedBy: null
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Patient not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("POST /api/patients/:id/restore error", err);
    res.status(500).json({ success: false, message: err.message || "Failed to restore patient" });
  }
});

// GET /api/patients/archived
router.get("/archived", async (req, res) => {
  try {
    const archivedPatients = await Patient.find({ isArchived: true }).lean();
    res.json({ success: true, data: archivedPatients });
  } catch (err) {
    console.error("GET /api/patients/archived error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DEBUG: GET /api/patients/all  (returns all patients regardless of archive state)
router.get("/all", async (req, res) => {
  try {
    const allPatients = await Patient.find({}).lean();
    res.json({ success: true, data: allPatients });
  } catch (err) {
    console.error("GET /api/patients/all error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Permanent DELETE /api/patients/:id
router.delete("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    if (!patient.isArchived) {
      return res.status(400).json({ 
        success: false, 
        message: "Patient must be archived before permanent deletion" 
      });
    }
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/patients error", err);
    res.status(500).json({ success: false, message: err.message || "Failed to delete patient" });
  }
});

export default router;

// DEV: helper to add demo medicines to existing patients that lack them
// POST /api/patients/add-demo-medicines
router.post('/add-demo-medicines', async (req, res) => {
  try {
    const patients = await Patient.find({}).exec();
    const updates = [];
    for (const p of patients) {
      if (!Array.isArray(p.medicines) || p.medicines.length === 0) {
        // small set of demo medicines
        const demo = [
          {
            name: 'Amoxicillin',
            strength: '500mg',
            quantity: 14,
            unitPrice: 25,
            totalPrice: 350,
            datePrescribed: new Date().toISOString().split('T')[0],
            prescribedBy: 'Demo Doctor',
            instructions: 'Take 1 capsule three times daily after meals'
          },
          {
            name: 'Paracetamol',
            strength: '500mg',
            quantity: 10,
            unitPrice: 5,
            totalPrice: 50,
            datePrescribed: new Date().toISOString().split('T')[0],
            prescribedBy: 'Demo Doctor',
            instructions: 'Take 1 tablet every 6 hours as needed for pain'
          }
        ];
        p.medicines = demo;
        updates.push(p.save());
      }
    }
    await Promise.all(updates);
    res.json({ success: true, message: `Updated ${updates.length} patients with demo medicines` });
  } catch (err) {
    console.error('add-demo-medicines error', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to add demo medicines' });
  }
});