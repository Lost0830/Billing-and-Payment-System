import express from "express";
import Discount from "../models/discounts.js";

const router = express.Router();

// ✅ GET all discounts
router.get("/", async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.json({ success: true, count: discounts.length, data: discounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ GET single discount by ID
router.get("/:id", async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    res.json({ success: true, data: discount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ CREATE a new discount
router.post("/", async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.code) payload.code = payload.code.toUpperCase().trim();
    if (payload.startDate) payload.startDate = new Date(payload.startDate);
    if (payload.endDate) payload.endDate = new Date(payload.endDate);

    const newDiscount = new Discount(payload);
    const saved = await newDiscount.save();
    res.status(201).json({ success: true, message: "Discount created", data: saved });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Discount code already exists" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ UPDATE discount
router.put("/:id", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.code) payload.code = payload.code.toUpperCase().trim();
    if (payload.startDate) payload.startDate = new Date(payload.startDate);
    if (payload.endDate) payload.endDate = new Date(payload.endDate);

    const updated = await Discount.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    res.json({ success: true, message: "Discount updated", data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ DELETE discount
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Discount.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    res.json({
      success: true,
      message: "Discount deleted",
      data: { id: req.params.id },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
