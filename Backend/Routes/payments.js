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
    const computeNextTransId = async () => {
      const last = await Payment.findOne({ transactionId: { $exists: true } })
        .sort({ createdAt: -1, _id: -1 })
        .lean();
      let next = 1;
      if (last && last.transactionId) {
        const m = String(last.transactionId).match(/(\d+)$/);
        if (m) next = parseInt(m[1], 10) + 1;
      }
      return `TRANS-${String(next).padStart(3, "0")}`;
    };

    const body = { ...req.body };
    if (!body.transactionId) {
      body.transactionId = await computeNextTransId();
    }

    const payment = new Payment(body);
    const saved = await payment.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error creating payment", error });
  }
});

// 🔄 Backfill transactionId for existing payments
router.post("/backfill", async (req, res) => {
  try {
    const { reseed } = req.body || {};

    // Determine starting number based on existing highest, unless reseed requested
    let startNum = 1;
    if (!reseed) {
      const existing = await Payment.find({ transactionId: { $exists: true } })
        .select({ transactionId: 1 })
        .lean();
      const nums = (existing || [])
        .map(d => {
          const m = String(d.transactionId || "").match(/(\d+)$/);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => !isNaN(n));
      const max = nums.length > 0 ? Math.max(...nums) : 0;
      startNum = max + 1;
    }

    // Sort by creation time for stable ordering
    const query = reseed ? {} : { $or: [{ transactionId: { $exists: false } }, { transactionId: null }, { transactionId: "" }] };
    const list = await Payment.find(query).sort({ createdAt: 1, _id: 1 });

    let updated = 0;
    for (let i = 0; i < list.length; i++) {
      const next = reseed ? (i + 1) : (startNum + i);
      const tid = `TRANS-${String(next).padStart(3, "0")}`;
      const p = list[i];
      if (p.transactionId !== tid) {
        p.transactionId = tid;
        await p.save();
        updated++;
      }
    }

    res.json({ success: true, message: "Backfill complete", updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error backfilling transaction IDs", error });
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
