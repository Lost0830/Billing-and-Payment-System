import express from "express";
import Promotion from "../models/promotions.js";

const router = express.Router();

// ✅ GET all promotions
router.get("/", async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ createdAt: -1 });
    res.json({ success: true, count: promotions.length, data: promotions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ GET single promotion
router.get("/:id", async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo)
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });
    res.json({ success: true, data: promo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ CREATE promotion
router.post("/", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.discountCode)
      payload.discountCode = payload.discountCode.toUpperCase().trim();
    if (payload.validFrom) payload.validFrom = new Date(payload.validFrom);
    if (payload.validTo) payload.validTo = new Date(payload.validTo);

    const newPromo = new Promotion(payload);
    const saved = await newPromo.save();
    res.status(201).json({ success: true, message: "Promotion created", data: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ UPDATE promotion
router.put("/:id", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.discountCode)
      payload.discountCode = payload.discountCode.toUpperCase().trim();
    if (payload.validFrom) payload.validFrom = new Date(payload.validFrom);
    if (payload.validTo) payload.validTo = new Date(payload.validTo);

    const updated = await Promotion.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });
    res.json({ success: true, message: "Promotion updated", data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ DELETE promotion
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Promotion.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });
    res.json({
      success: true,
      message: "Promotion deleted",
      data: { id: req.params.id },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
