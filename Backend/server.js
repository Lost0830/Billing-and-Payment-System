import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import User from "./models/users.js";
import Patient from "./models/patient.js";
import Billing from "./models/billing.js";
import Payment from "./models/payment.js";

// ROUTES (correct file names — change paths if your filenames differ)
import discountRoutes from "./Routes/discountroutes.js";
import promotionRoutes from "./Routes/promotionsroutes.js";
import invoiceRoutes from "./Routes/invoices.js";
import paymentRoutes from "./Routes/payments.js";
import patientRoutes from "./Routes/patients.js";

dotenv.config();

// create express app
const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/Billing";

console.log("🔧 Starting Billing Backend Server...");

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// === Register API routes BEFORE any static / catch-all ===
app.use("/api/discounts", discountRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/patients", patientRoutes);

// (Optional) Serve frontend build only when you actually have a built frontend
// const path = await import('path'); // if needed
// const buildPath = path.resolve('.', '../frontend/dist'); // adjust to your build output
// if (fs.existsSync(buildPath)) {
//   app.use(express.static(buildPath));
//   app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
// }

// Attach routes AFTER app is created
app.use("/api/discounts", discountRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/patients", patientRoutes);

// Simple health & API endpoints (users, billing, payments, seed, auth)
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    success: true,
    message: "Billing Backend Server is running!",
    database: dbState === 1 ? "Connected" : "Disconnected",
    type: "Local MongoDB",
  });
});

// Seed example users (plain text passwords intentionally)
app.post("/api/seed", async (req, res) => {
  try {
    const sampleUsers = [
      { name: "Admin User", email: "admin@Billing.com", password: "admin123", role: "admin", department: "Administration", status: "Active" },
      { name: "Jane Accountant", email: "jane@Billing.com", password: "password123", role: "accountant", department: "Billing", status: "Active" },
      { name: "John Pharmacist", email: "john@pharmacy.com", password: "pharma123", role: "pharmacist", department: "Pharmacy", status: "Active" },
      { name: "Dr. Smith", email: "doctor@hospital.com", password: "doctor123", role: "doctor", department: "EMR", status: "Active" },
      { name: "Nurse Wilson", email: "nurse@hospital.com", password: "nurse123", role: "nurse", department: "EMR", status: "Active" }
    ];

    await User.deleteMany({});
    const users = await User.insertMany(sampleUsers);

    res.json({ success: true, message: "✅ Database seeded successfully!", inserted: users.length });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Seed example patients (useful to restore demo data if DB was cleared)
app.post("/api/seed-patients", async (req, res) => {
  try {
    const samplePatients = [
      {
        name: "Juan Santos",
        dateOfBirth: "1988-05-12",
        sex: "male",
        contactNumber: "09179876543",
        address: "123 Health Street, Manila",
        email: "juan.santos@example.com",
        bloodType: "O+",
        services: [],
        medicines: [],
        createdBy: "John",
        createdByRole: "admin"
      },
      {
        name: "Anna Reyes",
        dateOfBirth: "1992-09-03",
        sex: "female",
        contactNumber: "09171234567",
        address: "456 Wellness Ave, Manila",
        email: "anna.reyes@example.com",
        bloodType: "A+",
        services: [],
        medicines: [],
        createdBy: "John",
        createdByRole: "admin"
      },
      {
        name: "Maria Santos",
        dateOfBirth: "1975-02-20",
        sex: "female",
        contactNumber: "09170001111",
        address: "789 Care Blvd, Manila",
        email: "maria.santos@example.com",
        bloodType: "B+",
        services: [],
        medicines: [],
        createdBy: "Admin",
        createdByRole: "admin"
      }
    ];

    // clear existing demo patients (only for demo environments)
    await Patient.deleteMany({});
    const inserted = await Patient.insertMany(samplePatients);
    res.json({ success: true, message: 'Seeded patients', count: inserted.length, data: inserted });
  } catch (err) {
    console.error('Seed patients error', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Simple login endpoint (plain password compare)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.password !== password) return res.status(401).json({ success: false, message: "Invalid email or password" });

    res.json({ success: true, message: "✅ Login successful", user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, status: user.status } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login failed", error: err.message });
  }
});

// Users endpoints
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password, role, department, status } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: "User with this email already exists." });

    const newUser = new User({ name: name || email.split("@")[0], email: email.trim().toLowerCase(), password, role: (role || "user").toLowerCase(), department: department || "General", status: status || "Active", createdAt: new Date() });
    const saved = await newUser.save();
    res.status(201).json({ success: true, message: "User created successfully", data: saved });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ success: false, message: "Server error creating user", error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted", data: { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error deleting user", error: err.message });
  }
});

// Update user
app.patch("/api/users/:id", async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User updated", data: updated });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Server error updating user', error: err.message });
  }
});

// Billing & payments (basic)
app.get("/api/billing/invoices", async (req, res) => {
  try {
    const invoices = await Billing.find().sort({ invoiceDate: -1 });
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/billing/invoices", async (req, res) => {
  try {
    const invoice = new Billing(req.body);
    const saved = await invoice.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/billing/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ paymentDate: -1 });
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/billing/payments", async (req, res) => {
  try {
    const payment = new Payment(req.body);
    const saved = await payment.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================
// 🧾 Invoice + Payment CRUD for frontend
// ==========================

// ✅ Invoices CRUD
app.get("/api/invoices", async (req, res) => {
  try {
    const invoices = await Billing.find().sort({ issuedDate: -1 });
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching invoices", error: err.message });
  }
});

app.post("/api/invoices", async (req, res) => {
  try {
    const invoice = new Billing(req.body);
    const saved = await invoice.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error saving invoice", error: err.message });
  }
});

app.patch("/api/invoices/:id", async (req, res) => {
  try {
    const updated = await Billing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating invoice", error: err.message });
  }
});

app.delete("/api/invoices/:id", async (req, res) => {
  try {
    const deleted = await Billing.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, message: "Invoice deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting invoice", error: err.message });
  }
});

// ✅ Payments CRUD
app.get("/api/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching payments", error: err.message });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const payment = new Payment(req.body);
    const saved = await payment.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error saving payment", error: err.message });
  }
});

app.patch("/api/payments/:id", async (req, res) => {
  try {
    const updated = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Payment not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating payment", error: err.message });
  }
});

app.delete("/api/payments/:id", async (req, res) => {
  try {
    const deleted = await Payment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Payment not found" });
    res.json({ success: true, message: "Payment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting payment", error: err.message });
  }
});


// Dashboard root page (buttons to endpoints)
app.get("/", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const statusText = dbConnected ? "✅ Connected to Database & Backend" : "❌ Not Connected";

  res.send(`
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>Billing Backend Dashboard</title>
    <style>body{font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;color:#333;display:flex;flex-direction:column;align-items:center;padding:40px}h1{color:#358E83;margin-bottom:10px}.status{font-weight:bold;margin-bottom:30px;color:${dbConnected ? "#16a34a" : "#dc2626"}}.buttons{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}button{padding:10px 16px;border:none;border-radius:8px;background:#358E83;color:white;cursor:pointer;font-size:15px}button:hover{background:#2d776e}.footer{margin-top:40px;font-size:13px;color:#666}</style>
    </head><body>
      <h1>🏥 Hospital Information Management System</h1>
      <div class="status">${statusText}</div>
      <div class="buttons">
        <button onclick="location.href='/api/health'">🩺 Health Check</button>
        <button onclick="location.href='/api/users'">👥 Users</button>
        <button onclick="location.href='/api/billing/invoices'">📄 Invoices</button>
        <button onclick="location.href='/api/billing/payments'">💰 Payments</button>
        <button onclick="location.href='/api/discounts'">🏷️ Discounts</button>
        <button onclick="location.href='/api/promotions'">🎁 Promotions</button>
        <button onclick="location.href='/api/seed'">🌱 Seed Users</button>
      </div>
      <div class="footer"><p>© 2025 Billing Backend Dashboard</p></div>
    </body></html>
  `);
});

// DB connection & start
const connectDB = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ Connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`🚀 Server running at: http://localhost:${PORT}`));
};

startServer();