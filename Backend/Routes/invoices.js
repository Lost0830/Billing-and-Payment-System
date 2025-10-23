import express from "express";
import Billing from "../models/billing.js";

const router = express.Router();

// 🧾 GET all invoices
router.get("/", async (req, res) => {
  try {
    const invoices = await Billing.find().sort({ issuedDate: -1 });
    res.json({ success: true, data: invoices });
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).json({ success: false, message: "Error fetching invoices", error: err });
  }
});

// 💾 CREATE new invoice
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    const invoice = new Billing({
      invoiceNumber: data.number || data.invoiceNumber,
      patientId: data.patientId,
      patientName: data.patientName,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      discountType: data.discountType || "none",
      discountPercentage: data.discountPercentage || 0,
      tax: data.tax || 0,
      total: data.total || 0,
      status: data.status || "unpaid",
      issuedDate: data.date || new Date(),
      dueDate: data.dueDate || new Date(),
      generatedBy: data.generatedBy || "Billing Department",
      generatedAt: data.generatedAt || new Date(),
      notes: data.notes || ""
    });

    const saved = await invoice.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("Error saving invoice:", err);
    res.status(500).json({ success: false, message: "Error saving invoice", error: err });
  }
});

// ✏️ UPDATE invoice (used for marking paid, updating totals, etc.)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedInvoice = await Billing.findByIdAndUpdate(id, updates, { new: true });

    if (!updatedInvoice)
      return res.status(404).json({ success: false, message: "Invoice not found" });

    res.json({ success: true, message: "Invoice updated successfully", data: updatedInvoice });
  } catch (err) {
    console.error("Error updating invoice:", err);
    res.status(500).json({ success: false, message: "Error updating invoice", error: err });
  }
});

// 🗑️ DELETE invoice
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Billing.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, message: "Invoice deleted", data: deleted });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting invoice", error: err });
  }
});

export default router;