import express from "express";
import Payment from "../models/payment.js";

const router = express.Router();

// ✅ Get all payments
router.get("/", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ date: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching payments", error });
  }
});

// ✅ Create new payment
router.post("/", async (req, res) => {
  try {
    const payment = new Payment(req.body);
    const saved = await payment.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error creating payment", error });
  }
});

// ✅ Delete payment
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Payment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Payment not found" });
    res.json({ success: true, message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting payment", error });
  }
});

export default router;