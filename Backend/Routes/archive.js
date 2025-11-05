import express from "express";
import User from "../models/users.js";
import Patient from "../models/patient.js";
import Billing from "../models/billing.js";
import Payment from "../models/payment.js";

const router = express.Router();

// Get all archived items
router.get("/", async (req, res) => {
  try {
    const [users, patients, invoices] = await Promise.all([
      User.find({ isArchived: true }).select('-password'),
      Patient.find({ isArchived: true }),
      Billing.find({ isArchived: true })
    ]);

    res.json({
      success: true,
      data: {
        users,
        patients,
        invoices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching archived items", error: error.message });
  }
});

// Move item to archive
router.post("/:type/:id/archive", async (req, res) => {
  try {
    const { type, id } = req.params;
    const { archivedBy } = req.body;
    let updated;

    const archiveData = {
      isArchived: true,
      archivedAt: new Date(),
      archivedBy: archivedBy || 'system'
    };

    // Simple role enforcement: allow callers to provide a requester role via
    // the request body (`requesterRole`, `archivedByRole`) or an HTTP header
    // `x-user-role`. This is intentionally lightweight for demo/dev usage.
    const roleFromBody = (req.body.requesterRole || req.body.archivedByRole || '').toString().toLowerCase();
    const roleFromHeader = (req.headers['x-user-role'] || req.headers['x-role'] || '').toString().toLowerCase();
    const requesterRole = roleFromBody || roleFromHeader || '';

    // Enforce admin-only access for patient archive actions
    if (type === 'patients' && requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: only admin users may archive patients' });
    }

    switch (type) {
      case 'users':
        updated = await User.findByIdAndUpdate(
          id,
          archiveData,
          { new: true }
        ).select('-password');
        break;
      case 'patients':
        updated = await Patient.findByIdAndUpdate(
          id,
          archiveData,
          { new: true }
        );
        break;
      case 'invoices':
        updated = await Billing.findByIdAndUpdate(
          id,
          archiveData,
          { new: true }
        );
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid item type" });
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error archiving item", error: error.message });
  }
});

// Restore item from archive
router.post("/:type/:id/restore", async (req, res) => {
  try {
    const { type, id } = req.params;
    let updated;

    const restoreData = {
      isArchived: false,
      archivedAt: null,
      archivedBy: null
    };

    // Simple role enforcement for patient restore actions as well
    const roleFromBody = (req.body.requesterRole || req.body.archivedByRole || '').toString().toLowerCase();
    const roleFromHeader = (req.headers['x-user-role'] || req.headers['x-role'] || '').toString().toLowerCase();
    const requesterRole = roleFromBody || roleFromHeader || '';
    if (type === 'patients' && requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: only admin users may restore patients' });
    }

    switch (type) {
      case 'users':
        updated = await User.findByIdAndUpdate(
          id,
          restoreData,
          { new: true }
        ).select('-password');
        break;
      case 'patients':
        updated = await Patient.findByIdAndUpdate(
          id,
          restoreData,
          { new: true }
        );
        break;
      case 'invoices':
        updated = await Billing.findByIdAndUpdate(
          id,
          restoreData,
          { new: true }
        );
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid item type" });
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error restoring item", error: error.message });
  }
});

// Permanently delete archived item
router.delete("/:type/:id/permanent", async (req, res) => {
  try {
    const { type, id } = req.params;
    let deleted;

    // Enforce admin for patient permanent deletes as well
    const roleFromBody = (req.body && (req.body.requesterRole || req.body.archivedByRole) || '').toString().toLowerCase();
    const roleFromHeader = (req.headers['x-user-role'] || req.headers['x-role'] || '').toString().toLowerCase();
    const requesterRole = roleFromBody || roleFromHeader || '';
    if (type === 'patients' && requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: only admin users may permanently delete patients' });
    }

    switch (type) {
      case 'users':
        deleted = await User.findOneAndDelete({ _id: id, isArchived: true });
        break;
      case 'patients':
        deleted = await Patient.findOneAndDelete({ _id: id, isArchived: true });
        break;
      case 'invoices':
        deleted = await Billing.findOneAndDelete({ _id: id, isArchived: true });
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid item type" });
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Item not found or not archived" });
    }

    res.json({ success: true, message: "Item permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting item", error: error.message });
  }
});

// Bulk archive (soft-delete) all items of a type (invoices or payments)
router.post("/:type/clear-all", async (req, res) => {
  try {
    const { type } = req.params;
    const { archivedBy } = req.body;

    // simple role header/body support like other endpoints
    const roleFromBody = (req.body.requesterRole || req.body.archivedByRole || '').toString().toLowerCase();
    const roleFromHeader = (req.headers['x-user-role'] || req.headers['x-role'] || '').toString().toLowerCase();
    const requesterRole = roleFromBody || roleFromHeader || '';

    // restrict clearing patients (dangerous)
    if (type === 'patients' && requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: only admin users may clear patients' });
    }

    let result;
    const archiveData = { isArchived: true, archivedAt: new Date(), archivedBy: archivedBy || 'system' };

    switch (type) {
      case 'invoices':
        result = await Billing.updateMany({ isArchived: { $ne: true } }, archiveData);
        break;
      case 'payments':
        result = await Payment.updateMany({ isArchived: { $ne: true } }, archiveData);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid type for clear-all' });
    }

    res.json({ success: true, message: `Archived ${result.modifiedCount || result.nModified || 0} ${type}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing items', error: error.message });
  }
});

// Bulk restore all archived items of a type (invoices or payments)
router.post("/:type/restore-all", async (req, res) => {
  try {
    const { type } = req.params;

    const roleFromBody = (req.body.requesterRole || req.body.archivedByRole || '').toString().toLowerCase();
    const roleFromHeader = (req.headers['x-user-role'] || req.headers['x-role'] || '').toString().toLowerCase();
    const requesterRole = roleFromBody || roleFromHeader || '';

    if (type === 'patients' && requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: only admin users may restore patients' });
    }

    let result;
    const restoreData = { isArchived: false, archivedAt: null, archivedBy: null };

    switch (type) {
      case 'invoices':
        result = await Billing.updateMany({ isArchived: true }, restoreData);
        break;
      case 'payments':
        result = await Payment.updateMany({ isArchived: true }, restoreData);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid type for restore-all' });
    }

    res.json({ success: true, message: `Restored ${result.modifiedCount || result.nModified || 0} ${type}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error restoring items', error: error.message });
  }
});

export default router;
