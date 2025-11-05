import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
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
import archiveRoutes from "./Routes/archive.js";

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

// Simple API request logger to help debug proxy / CORS / network issues
app.use('/api', (req, res, next) => {
  try {
    console.log(`--> API ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'none'}`);
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      // Avoid printing sensitive data like passwords in production; this is dev-only
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '<<REDACTED>>';
      console.log('    body:', JSON.stringify(safeBody));
    }
  } catch (e) {}
  next();
});

// === Register API routes BEFORE any static / catch-all ===
app.use("/api/discounts", discountRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/archive", archiveRoutes);

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

// Create test user route
app.post("/api/create-test-user", async (req, res) => {
  try {
    await User.deleteMany({}); // Clear existing users
    
    const user = new User({
      name: 'Test Admin',
      email: 'test@admin.com',
      password: 'test123',
      role: 'admin'
    });
    
    await user.save();
    res.json({ success: true, message: 'Test user created successfully' });
  } catch (err) {
    console.error('Error creating test user:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

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
      // Primary demo accounts
      { name: "Admin User", email: "admin@Billing.com", password: "admin123", role: "admin", department: "Administration", status: "Active" },
      { name: "Jane Accountant", email: "jane@Billing.com", password: "password123", role: "accountant", department: "Billing", status: "Active" },
      { name: "John Pharmacist", email: "john@pharmacy.com", password: "pharma123", role: "pharmacist", department: "Pharmacy", status: "Active" },
      { name: "Dr. Smith", email: "doctor@hospital.com", password: "doctor123", role: "doctor", department: "EMR", status: "Active" },
      { name: "Nurse Wilson", email: "nurse@hospital.com", password: "nurse123", role: "nurse", department: "EMR", status: "Active" },
      // Common alternate domains used in the frontend/dev (aliases)
      { name: "Admin HIMS", email: "admin@hims.com", password: "admin123", role: "admin", department: "Administration", status: "Active" },
      { name: "Jane HIMS", email: "jane@hims.com", password: "password123", role: "accountant", department: "Billing", status: "Active" },
      { name: "Admin Hospital", email: "admin@hospital.com", password: "admin123", role: "admin", department: "Administration", status: "Active" }
    ];

    await User.deleteMany({});
    
    // Create users one by one to ensure password hashing middleware runs
    const users = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      const savedUser = await user.save();
      users.push(savedUser);
    }

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
        medicines: [
          {
            name: "Amoxicillin",
            strength: "500mg",
            quantity: 14,
            unitPrice: 25,
            totalPrice: 350,
            datePrescribed: "2025-01-05",
            prescribedBy: "Dr. Smith",
            instructions: "Take 1 capsule three times daily after meals"
          },
          {
            name: "Paracetamol",
            strength: "500mg",
            quantity: 10,
            unitPrice: 5,
            totalPrice: 50,
            datePrescribed: "2025-01-05",
            prescribedBy: "Dr. Smith",
            instructions: "Take 1 tablet every 6 hours as needed for pain"
          }
        ],
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
        medicines: [
          {
            name: "Ibuprofen",
            strength: "200mg",
            quantity: 20,
            unitPrice: 8,
            totalPrice: 160,
            datePrescribed: "2025-02-10",
            prescribedBy: "Dr. Lee",
            instructions: "Take 1 tablet every 8 hours with food"
          }
        ],
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
        medicines: [
          {
            name: "Amlodipine",
            strength: "5mg",
            quantity: 30,
            unitPrice: 12,
            totalPrice: 360,
            datePrescribed: "2025-03-01",
            prescribedBy: "Dr. Cruz",
            instructions: "Take 1 tablet daily in the morning"
          }
        ],
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
    console.log('=== LOGIN ATTEMPT START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      console.log('Error: Missing email or password');
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required",
        debug: { email: !!email, password: !!password }
      });
    }

    // Email normalization
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Normalized email:', normalizedEmail);
    
    // Database connection check
    if (mongoose.connection.readyState !== 1) {
      console.log('Error: Database not connected. State:', mongoose.connection.readyState);
      return res.status(503).json({ 
        success: false, 
        message: "Database connection error",
        debug: { mongoState: mongoose.connection.readyState }
      });
    }
    
  // Find user (case-insensitive match so stored email casing doesn't block login)
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await User.findOne({ email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' } });
    console.log('User search result:', user ? {
      id: user._id,
      email: user.email,
      name: user.name,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    } : 'No user found');
    
    if (!user) {
      console.log('Error: No user found with email:', normalizedEmail);
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password",
        debug: { email: normalizedEmail, reason: 'user_not_found' }
      });
    }
    
    // Password comparison
    console.log('Attempting password comparison...');
    try {
      const isMatch = await user.comparePassword(password);
      console.log('Password comparison result:', isMatch);
      
      if (!isMatch) {
        console.log('Error: Password mismatch');
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password",
          debug: { reason: 'password_mismatch' }
        });
      }
    } catch (pwError) {
      console.error('Password comparison error:', pwError);
      return res.status(500).json({ 
        success: false, 
        message: "Error verifying password",
        debug: { error: pwError.message }
      });
    }

    // Success response
    console.log('Login successful for:', user.email);
    res.json({ 
      success: true, 
      message: "✅ Login successful", 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        department: user.department, 
        status: user.status 
      }
    });
    console.log('=== LOGIN ATTEMPT END ===');
  
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login failed", error: err.message });
  }
});

// Users endpoints
app.post("/api/seed", async (req, res) => {
  try {
    const sampleUsers = [
      { name: "Admin User", email: "admin@Billing.com", password: "admin123", role: "admin", department: "Administration", status: "Active" },
      { name: "Jane Accountant", email: "jane@Billing.com", password: "password123", role: "accountant", department: "Billing", status: "Active" },
      { name: "John Pharmacist", email: "john@pharmacy.com", password: "pharma123", role: "pharmacist", department: "Pharmacy", status: "Active" },
      { name: "Dr. Smith", email: "doctor@hospital.com", password: "doctor123", role: "doctor", department: "EMR", status: "Active" },
      { name: "Nurse Wilson", email: "nurse@hospital.com", password: "nurse123", role: "nurse", department: "EMR", status: "Active" }
    ];

    // Use User.create so mongoose pre-save middleware (password hashing) runs for each document
    await User.deleteMany({});
    const users = await User.create(
      sampleUsers.map(u => ({
        ...u,
        email: u.email.trim().toLowerCase(),
        role: (u.role || 'user').toLowerCase(),
        department: u.department || 'General',
        status: u.status || 'Active'
      }))
    );

    res.json({ success: true, message: "✅ Database seeded successfully!", inserted: users.length });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// Users endpoints
app.get("/api/users", async (req, res) => {
  try {
    // By default exclude archived users unless explicitly requested
    const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true';
    const filter = includeArchived ? {} : { isArchived: { $ne: true } };
    const users = await User.find(filter);
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password, role, department, status } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: "User with this email already exists." });

    const newUser = new User({
      name: name || (email ? email.split("@")[0] : ""),
      email: email.trim().toLowerCase(),
      password, // will be hashed by pre-save middleware
      role: (role || "user").toLowerCase(),
      department: department || "General",
      status: status || "Active",
      createdAt: new Date()
    });
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

// Password reset endpoint - sends an email with a reset token/link
app.post("/api/users/:id/reset", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // generate token and expiry (1 hour)
    const token = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 3600 * 1000; // 1 hour

    user.resetToken = token;
    user.resetTokenExpires = expires;
    await user.save();

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendBase}/reset-password?token=${token}&id=${user._id}`;

    // Configure transporter - prefer explicit SMTP from env, otherwise use Ethereal test account
    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // create a disposable test account (Ethereal) so developers can preview email in local dev
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"HIMS" <no-reply@hims.local>',
      to: user.email,
      subject: "Password Reset Request",
      text: `You requested a password reset. Use this link to reset your password: ${resetUrl}`,
      html: `<p>You requested a password reset. Click the link below to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    // Provide test preview URL when using Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    console.log(`Password reset email attempt for ${user.email}. previewUrl=${previewUrl}`);

    res.json({ success: true, message: "Password reset email sent", previewUrl });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ success: false, message: err.message });
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