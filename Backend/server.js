import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from current directory (Backend folder) or parent directory
// Try multiple possible locations
const envPaths = [
  path.resolve(__dirname, ".env"),           // Backend/.env (current directory)
  path.resolve(process.cwd(), ".env"),      // Current working directory
  path.resolve(__dirname, "..", ".env")      // Root/.env (parent directory)
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (result.parsed && Object.keys(result.parsed).length > 0) {
    console.log(`✅ Loaded .env from: ${envPath}`);
    console.log(`   Loaded ${Object.keys(result.parsed).length} environment variables`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn("⚠️  No .env file found or empty. Using defaults.");
}

// create express app
const app = express();
const PORT = process.env.BILLING_PORT || process.env.PORT || 5002; // Use BILLING_PORT first, fallback to PORT, then default to 5002

// Prefer explicit billing DB URI, fall back to older env names if present
const BILLING_MONGO_URI = process.env.BILLING_MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URI || '';

// Keep other integration URIs as before
const EMR_API_URL = process.env.EMR_API_URL || process.env.EMR_URL || '';
const EMR_API_KEY = process.env.EMR_API_KEY || '';
const PHARMACY_API_URL = process.env.PHARMACY_API_URL || process.env.PHARMACY_URL || '';
const PHARMACY_API_KEY = process.env.PHARMACY_API_KEY || '';
const EMR_DB_URI = process.env.MONGO_URI || '';
const PHARMACY_DB_URI = process.env.PHARMACY_MONGO_URI || '';
const EMR_PATIENTS_COLLECTION = process.env.EMR_PATIENTS_COLLECTION || '';
const PHARMACY_PATIENTS_COLLECTION = process.env.PHARMACY_PATIENTS_COLLECTION || '';

console.log("🔧 Starting Billing Backend Server...");
console.log("   BILLING_PORT from env:", process.env.BILLING_PORT || 'NOT SET');
console.log("   PORT from env:", process.env.PORT || 'NOT SET');
console.log("   Using PORT:", PORT);
console.log("   BILLING_MONGO_URI:", BILLING_MONGO_URI ? `${BILLING_MONGO_URI.substring(0, 30)}...` : 'NOT SET');

// Middleware
// CORS must be configured before other middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5174"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json());

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

// === Integration config endpoint (do NOT expose raw keys) ===
app.get('/api/integration/config', (req, res) => {
  res.json({
    success: true,
    data: {
      emr: { baseUrl: '/api/emr', configured: !!EMR_API_URL },
      pharmacy: { baseUrl: '/api/pharmacy', configured: !!PHARMACY_API_URL }
    }
  });
});

// Helper: proxy fetch with Bearer header
function isValidUrl(u) {
  try { new URL(u); return true; } catch { return false; }
}

function buildHeaders(apiKey) {
  const headers = { 'Accept': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
}

async function proxyGet(targetUrl, apiKey) {
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: buildHeaders(apiKey)
  });
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, body };
}

async function proxyPost(targetUrl, apiKey, payload) {
  const headers = buildHeaders(apiKey);
  headers['Content-Type'] = 'application/json';
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {})
  });
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, body };
}

// === EMR proxy endpoints ===
app.get('/api/emr/health', async (req, res) => {
  try {
    if (EMR_API_URL && isValidUrl(EMR_API_URL)) {
      const probes = ['/health', '/status', '/api/health', ''];
      for (const p of probes) {
        try {
          const target = `${EMR_API_URL}${p}`;
          const r = await proxyGet(target, EMR_API_KEY);
          if (r.ok) return res.json({ success: true, data: r.body });
        } catch {}
      }
    }
    if (EMR_DB_URI) {
      try {
        const conn = await mongoose.createConnection(EMR_DB_URI, { serverSelectionTimeoutMS: 2000 }).asPromise();
        const ping = await conn.db.command({ ping: 1 }).catch(() => ({ ok: 0 }));
        await conn.close();
        if (ping && (ping.ok === 1 || ping.ok === true)) return res.json({ success: true, data: { db: 'ok' } });
      } catch {}
    }
    return res.status(502).json({ success: false, message: 'EMR health check failed' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/emr/patients', async (req, res) => {
  try {
    if (!EMR_API_URL || !isValidUrl(EMR_API_URL)) {
      return res.status(400).json({ success: false, message: 'EMR API URL is not configured or invalid' });
    }
    const target = `${EMR_API_URL}/patients`;
    const r = await proxyGet(target, EMR_API_KEY);
    if (!r.ok) return res.status(r.status).json({ success: false, message: 'Failed to fetch EMR patients', data: r.body });
    res.json({ success: true, data: Array.isArray(r.body) ? r.body : (r.body?.data || r.body) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/emr/appointments', async (req, res) => {
  try {
    // Try API first if configured
    if (EMR_API_URL && isValidUrl(EMR_API_URL)) {
      try {
        const q = new URLSearchParams({ patientId: req.query.patientId || '' }).toString();
        const target = `${EMR_API_URL}/appointments${q ? `?${q}` : ''}`;
        const r = await proxyGet(target, EMR_API_KEY);
        if (r.ok) {
          return res.json({ success: true, data: Array.isArray(r.body) ? r.body : (r.body?.data || r.body) });
        }
      } catch (apiError) {
        console.warn('EMR API call failed, falling back to database:', apiError.message);
      }
    }
    
    // Fallback to database - check archiveappointments collection
    if (EMR_DB_URI) {
      try {
        const patientId = req.query.patientId;
        const limit = parseInt(req.query.limit) || 1000;
        
        const conn = await mongoose.createConnection(EMR_DB_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
        const db = conn.db;
        const appointmentsCollection = db.collection('archiveappointments');
        const patientsCollection = db.collection('patients');
        
        // Build query - if no patientId, return all appointments
        const query = {};
        if (patientId && patientId.trim() !== '') {
          try {
            // Try to match patient ObjectId
            if (mongoose.Types.ObjectId.isValid(patientId)) {
              query.$or = [
                { patient: new mongoose.Types.ObjectId(patientId) },
                { patientId: patientId }
              ];
            } else {
              // Find patient by patientId field first
              const patient = await patientsCollection.findOne({
                $or: [
                  { patientId: patientId },
                  { _id: mongoose.Types.ObjectId.isValid(patientId) ? new mongoose.Types.ObjectId(patientId) : null }
                ]
              });
              if (patient) {
                query.$or = [
                  { patient: patient._id },
                  { patientId: patient.patientId || patient._id.toString() }
                ];
              } else {
                query.patientId = patientId;
              }
            }
          } catch (err) {
            console.warn('Error matching patient:', err);
            query.patientId = patientId;
          }
        }
        
        // Fetch appointments from archiveappointments collection
        const appointments = await appointmentsCollection
          .find(query)
          .limit(limit)
          .sort({ date: -1, createdAt: -1 })
          .toArray();
        
        // Populate patient information
        const appointmentsWithPatientInfo = await Promise.all(appointments.map(async (apt) => {
          let patientInfo = null;
          if (apt.patient) {
            try {
              patientInfo = await patientsCollection.findOne({ _id: apt.patient });
            } catch (err) {
              console.warn('Error fetching patient info:', err);
            }
          } else if (apt.patientId) {
            try {
              patientInfo = await patientsCollection.findOne({
                $or: [
                  { patientId: apt.patientId },
                  { _id: mongoose.Types.ObjectId.isValid(apt.patientId) ? new mongoose.Types.ObjectId(apt.patientId) : null }
                ]
              });
            } catch (err) {
              console.warn('Error fetching patient by patientId:', err);
            }
          }
          
          return {
            _id: apt._id,
            id: apt._id.toString(),
            appointmentId: apt.appointmentId || apt._id.toString(),
            patientId: apt.patientId || (apt.patient ? apt.patient.toString() : null),
            patient: apt.patient,
            patientName: patientInfo ? (patientInfo.name || `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim() || 'Unknown Patient') : (apt.patientName || 'Unknown Patient'),
            date: apt.date || apt.appointmentDate || apt.createdAt,
            appointmentDate: apt.date || apt.appointmentDate || apt.createdAt,
            time: apt.time || apt.appointmentTime,
            doctor: apt.doctor || apt.doctorName,
            doctorId: apt.doctorId,
            status: apt.status || 'completed',
            reason: apt.reason || apt.chiefComplaint || '',
            notes: apt.notes || apt.remarks || '',
            createdAt: apt.createdAt,
            updatedAt: apt.updatedAt,
            ...apt
          };
        }));
        
        await conn.close();
        
        return res.json({ success: true, data: appointmentsWithPatientInfo });
      } catch (dbError) {
        console.error('Database error in appointments endpoint:', dbError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch appointments from database',
          error: dbError.message 
        });
      }
    }
    
    return res.status(502).json({ success: false, message: 'EMR API not available and database fallback not configured' });
  } catch (e) {
    console.error('Error in EMR appointments endpoint:', e);
    res.status(500).json({ success: false, message: e.message, error: e.stack });
  }
});

app.get('/api/emr/treatments', async (req, res) => {
  try {
    const q = new URLSearchParams({ patientId: req.query.patientId || '', unbilledOnly: req.query.unbilledOnly || '' }).toString();
    const target = `${EMR_API_URL}/treatments${q ? `?${q}` : ''}`;
    const r = await proxyGet(target, EMR_API_KEY);
    if (!r.ok) return res.status(r.status).json({ success: false, message: 'Failed to fetch EMR treatments', data: r.body });
    res.json({ success: true, data: Array.isArray(r.body) ? r.body : (r.body?.data || r.body) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/emr/treatments/:id/mark-billed', async (req, res) => {
  try {
    const target = `${EMR_API_URL}/treatments/${req.params.id}/mark-billed`;
    const r = await proxyPost(target, EMR_API_KEY, { invoiceId: req.body.invoiceId });
    if (!r.ok) return res.status(r.status).json({ success: false, message: 'Failed to mark treatment billed', data: r.body });
    res.json({ success: true, data: r.body?.data || r.body });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// === Pharmacy proxy endpoints ===
app.get('/api/pharmacy/health', async (req, res) => {
  try {
    if (PHARMACY_API_URL && isValidUrl(PHARMACY_API_URL)) {
      const probes = ['/health', '/status', '/api/health', ''];
      for (const p of probes) {
        try {
          const target = `${PHARMACY_API_URL}${p}`;
          const r = await proxyGet(target, PHARMACY_API_KEY);
          if (r.ok) return res.json({ success: true, data: r.body });
        } catch {}
      }
    }
    if (PHARMACY_DB_URI) {
      try {
        const conn = await mongoose.createConnection(PHARMACY_DB_URI, { serverSelectionTimeoutMS: 2000 }).asPromise();
        const ping = await conn.db.command({ ping: 1 }).catch(() => ({ ok: 0 }));
        await conn.close();
        if (ping && (ping.ok === 1 || ping.ok === true)) return res.json({ success: true, data: { db: 'ok' } });
      } catch {}
    }
    return res.status(502).json({ success: false, message: 'Pharmacy health check failed' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/pharmacy/transactions', async (req, res) => {
  try {
    // If PHARMACY_API_URL is configured, try to proxy to it first
    if (PHARMACY_API_URL && isValidUrl(PHARMACY_API_URL)) {
      try {
        const q = new URLSearchParams({
          patientId: req.query.patientId || '',
          dateFrom: req.query.dateFrom || '',
          dateTo: req.query.dateTo || '',
          unsyncedOnly: req.query.unsyncedOnly || ''
        }).toString();
        const target = `${PHARMACY_API_URL}/transactions${q ? `?${q}` : ''}`;
        const r = await proxyGet(target, PHARMACY_API_KEY);
        if (r.ok) {
          return res.json({ success: true, data: Array.isArray(r.body) ? r.body : (r.body?.data || r.body) });
        }
      } catch (apiError) {
        console.warn('Pharmacy API call failed, falling back to sales collection:', apiError.message);
      }
    }
    
    // Fallback to sales collection from database
    if (PHARMACY_DB_URI) {
      // Use the same logic as /api/pharmacy/sales endpoint
      const patientId = req.query.patientId;
      const dateFrom = req.query.dateFrom;
      const dateTo = req.query.dateTo;
      const limit = parseInt(req.query.limit) || 1000;
      
      const conn = await mongoose.createConnection(PHARMACY_DB_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
      const db = conn.db;
      const salesCollection = db.collection('sales');
      const patientsCollection = db.collection('patients');
      
      const query = {};
      if (patientId) {
        try {
          if (mongoose.Types.ObjectId.isValid(patientId)) {
            query.patient = new mongoose.Types.ObjectId(patientId);
          } else {
            const patient = await patientsCollection.findOne({
              $or: [
                { patientId: patientId },
                { _id: mongoose.Types.ObjectId.isValid(patientId) ? new mongoose.Types.ObjectId(patientId) : null }
              ]
            });
            if (patient) {
              query.patient = patient._id;
            }
          }
        } catch (err) {
          console.warn('Error matching patient:', err);
        }
      }
      
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      const sales = await salesCollection
        .find(query)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();
      
      const salesWithPatientInfo = await Promise.all(sales.map(async (sale) => {
        let patientInfo = null;
        if (sale.patient) {
          try {
            patientInfo = await patientsCollection.findOne({ _id: sale.patient });
          } catch (err) {
            console.warn('Error fetching patient info:', err);
          }
        }
        
        return {
          _id: sale._id,
          id: sale._id.toString(),
          transactionId: sale._id.toString(),
          patientId: sale.patient ? sale.patient.toString() : null,
          patientName: patientInfo ? (patientInfo.name || `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim() || 'Unknown Patient') : 'Unknown Patient',
          totalAmount: sale.totalAmount || 0,
          items: sale.items || [],
          transactionDate: sale.createdAt ? new Date(sale.createdAt).toISOString().split('T')[0] : null,
          createdAt: sale.createdAt,
          paymentStatus: 'Pending',
          syncStatus: 'Pending'
        };
      }));
      
      await conn.close();
      
      return res.json({ success: true, data: salesWithPatientInfo });
    }
    
    return res.status(502).json({ success: false, message: 'Pharmacy API not available and database fallback not configured' });
  } catch (e) {
    console.error('Error in pharmacy transactions endpoint:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/pharmacy/transactions/:id/mark-synced', async (req, res) => {
  try {
    const target = `${PHARMACY_API_URL}/transactions/${req.params.id}/mark-synced`;
    const r = await proxyPost(target, PHARMACY_API_KEY, {});
    if (!r.ok) return res.status(r.status).json({ success: false, message: 'Failed to mark transaction synced', data: r.body });
    res.json({ success: true, data: r.body?.data || r.body });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Combined invoices endpoint - fetches from billing, pharmacy sales, and EMR appointments
// Groups by patient and combines their data
app.get('/api/invoices/combined', async (req, res) => {
  try {
    const allInvoices = [];
    const patientDataMap = new Map(); // Map to group by patient
    
    // Helper function to normalize patient identifier
    const getPatientKey = (patientId, patientName) => {
      const normalizedId = patientId ? String(patientId).toLowerCase().trim() : '';
      const normalizedName = patientName ? String(patientName).toLowerCase().trim() : '';
      return normalizedId || normalizedName || 'unknown';
    };
    
    // Helper function to add invoice to patient group
    const addToPatientGroup = (invoice) => {
      const key = getPatientKey(invoice.patientId, invoice.patientName);
      
      if (!patientDataMap.has(key)) {
        patientDataMap.set(key, {
          id: invoice.id || `combined_${key}`,
          patientId: invoice.patientId,
          patientName: invoice.patientName,
          items: [],
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          sources: new Set(),
          dates: [],
          status: 'pending',
          invoices: []
        });
      }
      
      const group = patientDataMap.get(key);
      group.items.push(...(invoice.items || []));
      
      // Calculate subtotal from items if not provided
      let invoiceSubtotal = invoice.subtotal || 0;
      if (invoiceSubtotal === 0 && invoice.items && invoice.items.length > 0) {
        invoiceSubtotal = invoice.items.reduce((sum, item) => {
          return sum + (item.amount || item.totalPrice || item.total || (item.quantity || 0) * (item.rate || item.unitPrice || item.price || 0));
        }, 0);
      }
      // If still 0, use total minus tax and discount
      if (invoiceSubtotal === 0 && invoice.total) {
        invoiceSubtotal = invoice.total - (invoice.tax || 0) - (invoice.discount || 0);
      }
      
      group.subtotal += invoiceSubtotal;
      group.discount += invoice.discount || 0;
      group.tax += invoice.tax || 0;
      group.total += invoice.total || 0;
      group.sources.add(invoice.source || 'unknown');
      if (invoice.date) group.dates.push(new Date(invoice.date));
      group.invoices.push(invoice);
      
      // Use earliest date as invoice date
      if (group.dates.length > 0) {
        group.dates.sort((a, b) => a - b);
      }
    };
    
    // 1. Fetch from billing invoices (using Billing model)
    try {
      const billingInvoices = await Billing.find({ isArchived: { $ne: true } }).limit(1000).lean();
      
      // Try to fetch patients from billing DB to resolve names
      let billingPatients = [];
      try {
        const Patient = (await import('./models/patient.js')).default;
        billingPatients = await Patient.find({}).lean();
      } catch (err) {
        console.warn('Could not fetch billing patients:', err.message);
      }
      const billingPatientMap = new Map();
      billingPatients.forEach(p => {
        const key = p._id?.toString() || p.id?.toString();
        if (key) billingPatientMap.set(key, p);
        if (p.patientId) billingPatientMap.set(p.patientId, p);
        if (p.patientNumber) billingPatientMap.set(p.patientNumber, p);
      });
      
      billingInvoices.forEach(inv => {
        // Try to resolve patient name from billing patients
        let patientName = inv.patientName || 'Unknown';
        if (inv.patientId || inv.patientNumber) {
          const patientKey = (inv.patientId || inv.patientNumber)?.toString();
          const patient = billingPatientMap.get(patientKey);
          if (patient) {
            patientName = patient.name || 
                         `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 
                         patient.patientName || 
                         inv.patientName || 
                         'Unknown';
          }
        }
        
        const invoice = {
          id: inv._id.toString(),
          _id: inv._id,
          number: inv.invoiceNumber || inv.number || `INV-${inv._id.toString().slice(-6)}`,
          patientId: inv.patientId || inv.patientNumber,
          patientName: patientName,
          date: inv.issuedDate || inv.date || inv.createdAt,
          dueDate: inv.dueDate || inv.issuedDate || inv.date || inv.createdAt,
          status: inv.status || 'pending',
          subtotal: inv.subtotal || (inv.total || 0) - (inv.tax || 0) - (inv.discount || 0),
          discount: inv.discount || 0,
          tax: inv.tax || 0,
          total: inv.total || 0,
          items: inv.items || [],
          source: 'billing',
          createdAt: inv.createdAt
        };
        addToPatientGroup(invoice);
      });
    } catch (err) {
      console.warn('Error fetching billing invoices:', err.message);
    }
    
    // 2. Fetch from pharmacy sales and convert to invoices
    if (PHARMACY_DB_URI) {
      try {
        const conn = await mongoose.createConnection(PHARMACY_DB_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
        const db = conn.db;
        const salesCollection = db.collection('sales');
        const patientsCollection = db.collection('patients');
        
        const sales = await salesCollection
          .find({})
          .limit(1000)
          .sort({ createdAt: -1 })
          .toArray();
        
        // Pre-fetch all patients to avoid N+1 queries
        const allPharmacyPatients = await patientsCollection.find({}).toArray();
        const patientMap = new Map();
        allPharmacyPatients.forEach(p => {
          patientMap.set(p._id.toString(), p);
          if (p.patientId) patientMap.set(p.patientId, p);
        });
        
        for (const sale of sales) {
          let patientInfo = null;
          if (sale.patient) {
            const patientKey = sale.patient.toString();
            patientInfo = patientMap.get(patientKey) || patientMap.get(sale.patient);
            
            // If not found, try direct lookup
            if (!patientInfo) {
              try {
                patientInfo = await patientsCollection.findOne({ _id: sale.patient });
                if (patientInfo) {
                  patientMap.set(patientKey, patientInfo);
                }
              } catch (err) {
                console.warn('Error fetching patient info:', err);
              }
            }
          }
          
          const patientId = sale.patient ? sale.patient.toString() : null;
          let patientName = 'Unknown Patient';
          if (patientInfo) {
            patientName = patientInfo.name || 
                         `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim() || 
                         patientInfo.patientName || 
                         'Unknown Patient';
          } else if (sale.patientName) {
            patientName = sale.patientName;
          }
          
          // Transform items
          const items = (sale.items || []).map((item, index) => {
            const medicineRef = item.medicine || item.medication || item.medicationId;
            const medicationId = medicineRef ? (typeof medicineRef === 'object' ? medicineRef.toString() : medicineRef) : '';
            const quantity = item.quantity || 0;
            const price = item.price || item.unitPrice || item.cost || 0;
            const total = item.total || item.totalPrice || (quantity * price);
            
            return {
              id: item._id ? item._id.toString() : `pharmacy_item_${sale._id}_${index}`,
              description: item.name || item.medicationName || item.medicineName || 'Unknown Medication',
              quantity: quantity,
              rate: price,
              amount: total,
              category: 'Pharmacy',
              source: 'pharmacy'
            };
          });
          
          // Calculate subtotal from items if totalAmount is not available
          let subtotal = sale.totalAmount || sale.subtotal || 0;
          if (subtotal === 0 && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
          }
          
          const invoice = {
            id: `pharmacy_${sale._id.toString()}`,
            _id: sale._id,
            number: `PH-${sale._id.toString().slice(-6)}`,
            patientId: patientId,
            patientName: patientName,
            date: sale.createdAt,
            dueDate: sale.createdAt,
            status: 'pending',
            subtotal: subtotal,
            discount: sale.discount || 0,
            tax: sale.tax || 0,
            total: sale.totalAmount || subtotal,
            items: items,
            source: 'pharmacy',
            createdAt: sale.createdAt
          };
          addToPatientGroup(invoice);
        }
        
        await conn.close();
      } catch (err) {
        console.warn('Error fetching pharmacy sales:', err.message);
      }
    }
    
    // 3. Fetch from EMR appointments and convert to invoices
    if (EMR_DB_URI) {
      try {
        const conn = await mongoose.createConnection(EMR_DB_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
        const db = conn.db;
        const appointmentsCollection = db.collection('archiveappointments');
        const patientsCollection = db.collection('patients');
        
        const appointments = await appointmentsCollection
          .find({})
          .limit(1000)
          .sort({ createdAt: -1 })
          .toArray();
        
        // Pre-fetch all patients to avoid N+1 queries
        const allEmrPatients = await patientsCollection.find({}).toArray();
        const patientMap = new Map();
        allEmrPatients.forEach(p => {
          patientMap.set(p._id.toString(), p);
          if (p.patientId) patientMap.set(p.patientId, p);
        });
        
        for (const apt of appointments) {
          let patientInfo = null;
          if (apt.patient) {
            const patientKey = apt.patient.toString();
            patientInfo = patientMap.get(patientKey) || patientMap.get(apt.patient);
            
            // If not found, try direct lookup
            if (!patientInfo) {
              try {
                patientInfo = await patientsCollection.findOne({ _id: apt.patient });
                if (patientInfo) {
                  patientMap.set(patientKey, patientInfo);
                }
              } catch (err) {
                console.warn('Error fetching patient info:', err);
              }
            }
          }
          
          const patientId = apt.patientId || (apt.patient ? apt.patient.toString() : null);
          let patientName = apt.patientName || 'Unknown Patient';
          if (patientInfo) {
            patientName = patientInfo.name || 
                         `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim() || 
                         patientInfo.patientName || 
                         apt.patientName || 
                         'Unknown Patient';
          }
          
          const amount = apt.amount || apt.total || apt.cost || 0;
          const invoice = {
            id: `emr_${apt._id.toString()}`,
            _id: apt._id,
            number: `EMR-${apt._id.toString().slice(-6)}`,
            patientId: patientId,
            patientName: patientName,
            date: apt.date || apt.appointmentDate || apt.createdAt,
            dueDate: apt.date || apt.appointmentDate || apt.createdAt,
            status: 'pending',
            subtotal: amount,
            discount: 0,
            tax: 0,
            total: amount,
            items: [{
              id: `emr_item_${apt._id}`,
              description: apt.reason || apt.chiefComplaint || 'Medical Consultation',
              quantity: 1,
              rate: amount,
              amount: amount,
              category: 'EMR Services',
              source: 'emr'
            }],
            source: 'emr',
            createdAt: apt.createdAt
          };
          addToPatientGroup(invoice);
        }
        
        await conn.close();
      } catch (err) {
        console.warn('Error fetching EMR appointments:', err.message);
      }
    }
    
    // Get all paid invoice numbers/IDs from payments to filter them out
    let paidInvoiceNumbers = new Set();
    let paidInvoiceIds = new Set();
    try {
      const Payment = (await import('./models/payment.js')).default;
      const payments = await Payment.find({ status: { $in: ['completed', 'paid'] } }).lean();
      payments.forEach((p) => {
        if (p.invoiceNumber) paidInvoiceNumbers.add(p.invoiceNumber);
        if (p.invoiceId) paidInvoiceIds.add(String(p.invoiceId));
      });
    } catch (err) {
      console.warn('Error fetching payments to filter paid invoices:', err.message);
    }
    
    // Try to resolve patient names from billing database if still "Unknown"
    const billingPatientMap = new Map();
    try {
      const Patient = (await import('./models/patient.js')).default;
      const billingPatients = await Patient.find({}).lean();
      billingPatients.forEach(p => {
        const key = p._id?.toString() || p.id?.toString();
        if (key) billingPatientMap.set(key, p);
        if (p.patientId) billingPatientMap.set(p.patientId, p);
        if (p.patientNumber) billingPatientMap.set(p.patientNumber, p);
      });
    } catch (err) {
      console.warn('Could not fetch billing patients for name resolution:', err.message);
    }
    
    // Convert grouped data to invoice format and filter out paid invoices
    const combinedInvoices = Array.from(patientDataMap.values())
      .map((group, index) => {
        const sources = Array.from(group.sources);
        const sourceLabel = sources.length > 1 ? 'combined' : sources[0] || 'unknown';
        const invoiceDate = group.dates.length > 0 ? group.dates[0] : new Date();
        
        // Check if any of the source invoices are paid
        const isPaid = group.invoices.some(inv => {
          const invNumber = inv.number || inv.id || '';
          const invId = inv.id || inv._id?.toString() || '';
          return paidInvoiceNumbers.has(invNumber) || paidInvoiceIds.has(invId);
        });
        
        // Try to resolve patient name if still "Unknown" or "Unknown Patient"
        let resolvedPatientName = group.patientName;
        if ((resolvedPatientName === 'Unknown' || resolvedPatientName === 'Unknown Patient') && group.patientId) {
          const patientKey = group.patientId.toString();
          const patient = billingPatientMap.get(patientKey);
          if (patient) {
            resolvedPatientName = patient.name || 
                                 `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 
                                 patient.patientName || 
                                 resolvedPatientName;
          }
        }
        
        return {
          id: group.id || `combined_${index}`,
          number: `INV-${String(group.patientId || resolvedPatientName || index).slice(-6)}`,
          patientId: group.patientId,
          patientName: resolvedPatientName,
          date: invoiceDate,
          dueDate: invoiceDate,
          status: isPaid ? 'paid' : group.status,
          subtotal: group.subtotal || (group.total - group.tax - group.discount),
          discount: group.discount,
          tax: group.tax,
          total: group.total,
          items: group.items,
          source: sourceLabel,
          sourceCount: group.invoices.length,
          combinedFrom: group.invoices.map(inv => inv.number || inv.id),
          _ids: group.invoices.map(inv => inv.id || inv._id?.toString()).filter(Boolean)
        };
      })
      .filter(inv => inv.status !== 'paid'); // Filter out paid invoices
    
    res.json({
      success: true,
      data: combinedInvoices,
      count: combinedInvoices.length
    });
  } catch (e) {
    console.error('Error in combined invoices endpoint:', e);
    res.status(500).json({ success: false, message: e.message, error: e.stack });
  }
});

// === Direct DB patient fetch (EMR/Pharmacy) ===
async function fetchPatientsFromMongo(uri, collectionCandidates = ['patients', 'emr_patients', 'patient', 'customers']) {
  const out = [];
  if (!uri) return out;
  let conn;
  try {
    conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 2000 }).asPromise();
    const db = conn.db;
    let candidates = Array.from(new Set(collectionCandidates.filter(Boolean)));
    try {
      const cols = await db.listCollections().toArray();
      const names = (cols || []).map(c => String(c?.name || ''));
      const patientish = names.filter(n => /patient|customer|person/i.test(n));
      // prioritize collections that look like patient lists
      candidates = Array.from(new Set([...patientish, ...candidates]));
    } catch {}
    for (const name of candidates) {
      try {
        const coll = db.collection(name);
        const cursor = coll.find({}, { projection: { _id: 1, patientId: 1, id: 1, firstName: 1, lastName: 1, name: 1, dateOfBirth: 1, birthDate: 1, birthdate: 1, gender: 1, sex: 1, contactNumber: 1, phone: 1, email: 1, bloodType: 1, emergencyContact: 1 } }).limit(500);
        const arr = await cursor.toArray();
        if (arr && arr.length) {
          out.push(...arr.map(p => ({
            _id: p._id,
            id: p.id || p._id || p.patientId,
            patientId: p.patientId || '',
            name: p.name || `${(p.firstName||'').trim()} ${(p.lastName||'').trim()}`.trim(),
            dateOfBirth: p.dateOfBirth || p.birthDate || p.birthdate || '',
            sex: p.gender || p.sex || '',
            contactNumber: p.contactNumber || p.phone || '',
            email: p.email || '',
            bloodType: p.bloodType || '',
            emergencyContact: p.emergencyContact || null,
          })));
          break;
        }
      } catch (e) {
        // try next collection
      }
    }
  } catch (e) {
    console.warn('fetchPatientsFromMongo failed:', e?.message || e);
  } finally {
    try { await conn?.close(); } catch {}
  }
  return out;
}

app.get('/api/emr/patients-db', async (req, res) => {
  try {
    // Get patients from archiveappointments collection only
    if (EMR_DB_URI) {
      try {
        const conn = await mongoose.createConnection(EMR_DB_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
        const db = conn.db;
        const appointmentsCollection = db.collection('archiveappointments');
        const patientsCollection = db.collection('patients');
        
        // Fetch all appointments to extract unique patients
        const appointments = await appointmentsCollection
          .find({})
          .limit(10000)
          .toArray();
        
        // Extract unique patient IDs
        const patientIds = new Set();
        appointments.forEach(apt => {
          if (apt.patient) {
            patientIds.add(apt.patient.toString());
          }
          if (apt.patientId) {
            patientIds.add(apt.patientId.toString());
          }
        });
        
        // Fetch patient details from patients collection
        const patientList = [];
        for (const pid of patientIds) {
          try {
            let patient = null;
            // Try as ObjectId first
            if (mongoose.Types.ObjectId.isValid(pid)) {
              patient = await patientsCollection.findOne({ _id: new mongoose.Types.ObjectId(pid) });
            }
            // If not found, try by patientId field
            if (!patient) {
              patient = await patientsCollection.findOne({ patientId: pid });
            }
            if (patient) {
              // Normalize patient data
              patientList.push({
                _id: patient._id,
                id: patient._id.toString(),
                patientId: patient.patientId || patient._id.toString(),
                name: patient.name || `${patient.firstname || ''} ${patient.lastname || ''}`.trim() || 'Unknown',
                firstname: patient.firstname || '',
                lastname: patient.lastname || '',
                dateOfBirth: patient.dob || patient.dateOfBirth,
                dob: patient.dob || patient.dateOfBirth,
                sex: patient.gender || patient.sex || '',
                gender: patient.gender || patient.sex || '',
                contactNumber: patient.phone || patient.contactNumber || '',
                phone: patient.phone || patient.contactNumber || '',
                email: patient.email || '',
                address: patient.address || '',
                city: patient.city || '',
                barangay: patient.barangay || '',
                zipcode: patient.zipcode || '',
                insurance: patient.insurance || '',
                status: patient.status || 'Active',
                ...patient
              });
            }
          } catch (err) {
            console.warn(`Error fetching patient ${pid}:`, err);
          }
        }
        
        await conn.close();
        res.json({ success: true, data: patientList });
        return;
      } catch (dbError) {
        console.error('Database error in patients-db endpoint:', dbError);
        return res.status(500).json({ success: false, message: 'Failed to fetch patients from archiveappointments', error: dbError.message });
      }
    }
    
    // Fallback to original method if EMR_DB_URI not configured
    const preferred = EMR_PATIENTS_COLLECTION ? [EMR_PATIENTS_COLLECTION, 'patients', 'emr_patients', 'patient'] : ['patients', 'emr_patients', 'patient'];
    const list = await fetchPatientsFromMongo(EMR_DB_URI, preferred);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/pharmacy/patients-db', async (req, res) => {
  try {
    const preferred = PHARMACY_PATIENTS_COLLECTION ? [PHARMACY_PATIENTS_COLLECTION, 'patients', 'customers'] : ['patients', 'customers'];
    const list = await fetchPatientsFromMongo(PHARMACY_DB_URI, preferred);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Fetch sales data from pharmacy database
app.get('/api/pharmacy/sales', async (req, res) => {
  try {
    if (!PHARMACY_DB_URI) {
      return res.status(400).json({ success: false, message: 'PHARMACY_DB_URI is not configured' });
    }

    const patientId = req.query.patientId;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const limit = parseInt(req.query.limit) || 1000;
    
    // Create connection to pharmacy database
    const conn = await mongoose.createConnection(PHARMACY_DB_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const db = conn.db;
    const salesCollection = db.collection('sales');
    const patientsCollection = db.collection('patients');
    
    // Build query - sales collection uses 'patient' (ObjectId) not 'patientId'
    const query = {};
    if (patientId) {
      // Try to match patient ObjectId if patientId is provided
      try {
        // If patientId is an ObjectId string, convert it
        if (mongoose.Types.ObjectId.isValid(patientId)) {
          query.patient = new mongoose.Types.ObjectId(patientId);
        } else {
          // Otherwise, try to find patient by other fields and use their _id
          const patient = await patientsCollection.findOne({
            $or: [
              { patientId: patientId },
              { _id: mongoose.Types.ObjectId.isValid(patientId) ? new mongoose.Types.ObjectId(patientId) : null }
            ]
          });
          if (patient) {
            query.patient = patient._id;
          }
        }
      } catch (err) {
        console.warn('Error matching patient:', err);
      }
    }
    
    // Date filtering on createdAt
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // Fetch sales data with populated patient info
    const sales = await salesCollection
      .find(query)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
    
    // Populate patient information
    const salesWithPatientInfo = await Promise.all(sales.map(async (sale) => {
      let patientInfo = null;
      if (sale.patient) {
        try {
          patientInfo = await patientsCollection.findOne({ _id: sale.patient });
        } catch (err) {
          console.warn('Error fetching patient info:', err);
        }
      }
      
      return {
        _id: sale._id,
        id: sale._id.toString(),
        transactionId: sale._id.toString(),
        patientId: sale.patient ? sale.patient.toString() : null,
        patient: sale.patient,
        patientName: patientInfo ? (patientInfo.name || `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim() || 'Unknown Patient') : 'Unknown Patient',
        pharmacist: sale.pharmacist,
        totalAmount: sale.totalAmount || 0,
        items: sale.items || [],
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        date: sale.createdAt,
        transactionDate: sale.createdAt ? new Date(sale.createdAt).toISOString().split('T')[0] : null,
        // Transform items if they exist - handle items array structure from sales collection
        transformedItems: Array.isArray(sale.items) ? sale.items.map((item, index) => {
          // Handle different item structures - items may have medicine reference (ObjectId) or direct fields
          const itemId = item._id ? item._id.toString() : (item.id || `item_${index}`);
          const medicineRef = item.medicine || item.medication || item.medicationId;
          const quantity = item.quantity || 0;
          const price = item.price || item.unitPrice || item.cost || 0;
          const total = item.total || item.totalPrice || (quantity * price);
          
          // If medicine is an ObjectId reference, convert to string
          const medicationId = medicineRef ? (typeof medicineRef === 'object' ? medicineRef.toString() : medicineRef) : '';
          
          return {
            id: itemId,
            _id: item._id || itemId,
            medicationId: medicationId,
            medicationName: item.name || item.medicationName || item.medicineName || 'Unknown Medication',
            quantity: quantity,
            unitPrice: price,
            totalPrice: total,
            price: price,
            total: total,
            // Include all original item fields
            ...item
          };
        }) : []
      };
    }));
    
    await conn.close();
    
    res.json({
      success: true,
      data: salesWithPatientInfo,
      count: salesWithPatientInfo.length
    });
  } catch (e) {
    console.error('Error fetching pharmacy sales:', e);
    res.status(500).json({ success: false, message: e.message, error: e.stack });
  }
});

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
    console.log("🔧 Creating test user...");
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test@admin.com' });
    if (existingUser) {
      await User.deleteOne({ email: 'test@admin.com' });
      console.log("   Deleted existing test user");
    }
    
    const user = new User({
      name: 'Test Admin',
      email: 'test@admin.com',
      password: 'test123', // Will be hashed by pre-save hook
      role: 'admin',
      department: 'Administration',
      status: 'Active'
    });
    
    await user.save();
    console.log("   ✅ Test user created successfully");
    res.json({ 
      success: true, 
      message: 'Test user created successfully',
      user: {
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    console.error('❌ Error creating test user:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Hash all plain text passwords in database
app.post("/api/hash-all-passwords", async (req, res) => {
  try {
    console.log("🔧 Hashing all plain text passwords...");
    console.log("   Database connection:", mongoose.connection.readyState === 1 ? "Connected" : "Disconnected");
    
    const users = await User.find({});
    console.log(`   Found ${users.length} users in database`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, etc.)
      const isHashed = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$'));
      
      if (!isHashed && user.password) {
        console.log(`   Hashing password for: ${user.email}`);
        // Hash the plain text password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        updated++;
        console.log(`   ✅ Updated ${user.email}`);
      } else {
        skipped++;
        console.log(`   ⏭️  Skipped ${user.email} (already hashed)`);
      }
    }
    
    res.json({
      success: true,
      message: `Password hashing complete`,
      stats: {
        total: users.length,
        updated: updated,
        skipped: skipped
      }
    });
  } catch (err) {
    console.error('❌ Error hashing passwords:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Quick fix route to create/update juv@pogil.com user (matching the database)
app.post("/api/fix-user", async (req, res) => {
  try {
    // Use the email that exists in the database: juv@pogil.com
    const email = 'juv@pogil.com';
    const password = 'juvpogil'; // Matching the database
    
    console.log("🔧 Fixing user:", email);
    console.log("   Database connection:", mongoose.connection.readyState === 1 ? "Connected" : "Disconnected");
    
    // Find existing user
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (user) {
      console.log("   User exists, updating password...");
      // Force password to be re-hashed by setting it directly and marking as modified
      user.password = password;
      user.markModified('password'); // Force mongoose to treat it as modified
      await user.save();
      console.log("   ✅ User password updated");
    } else {
      console.log("   User does not exist, creating new user...");
      // Create new user with fresh password hash
      user = new User({
        name: 'Juv Admin',
        email: email.toLowerCase().trim(),
        password: password, // Will be hashed by pre-save hook
        role: 'admin',
        department: 'Administration',
        status: 'Active'
      });
      
      await user.save();
      console.log("   ✅ User created successfully");
    }
    
    // Verify the user was created
    const verifyUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (verifyUser) {
      console.log("   ✅ User verified in database");
      console.log("   Password stored:", verifyUser.password);
      
      // Test password comparison
      const testMatch = verifyUser.password === password;
      console.log("   Password test match:", testMatch);
    }
    
    res.json({
      success: true,
      message: 'User created/updated successfully',
      user: {
        email: user.email,
        role: user.role,
        name: user.name
      },
      login: {
        email: email,
        password: password,
        note: "Use these credentials to login"
      }
    });
  } catch (err) {
    console.error('❌ Error fixing user:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create admin user route
app.post("/api/create-admin", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    console.log("🔧 Creating/updating admin user:", email);
    console.log("   Database connection:", mongoose.connection.readyState === 1 ? "Connected" : "Disconnected");
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.log("   User exists, updating password and role...");
      // Update existing user - plain text password
      existingUser.password = password;
      existingUser.role = 'admin';
      if (name) existingUser.name = name;
      existingUser.status = 'Active';
      existingUser.isArchived = false;
      await existingUser.save();
      console.log("   ✅ Updated existing user to admin");
      
      return res.json({
        success: true,
        message: 'Admin user updated successfully',
        user: {
          email: existingUser.email,
          role: existingUser.role,
          name: existingUser.name
        }
      });
    }
    
    console.log("   Creating new user...");
    const user = new User({
      name: name || 'Admin User',
      email: email.toLowerCase().trim(),
      password: password, // Plain text password
      role: 'admin',
      department: 'Administration',
      status: 'Active'
    });
    
    await user.save();
    console.log("   ✅ Admin user created successfully");
    
    res.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    console.error('❌ Error creating admin user:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// === AUTHENTICATION ROUTES ===
app.post("/api/auth/login", async (req, res) => {
  console.log("🔐 Login attempt received");
  console.log("   Email:", req.body.email);
  console.log("   Database connection state:", mongoose.connection.readyState === 1 ? "Connected" : "Disconnected");
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const emailLower = email.toLowerCase().trim();
    console.log("   Searching for user with email:", emailLower);
    console.log("   Database name:", mongoose.connection.db?.databaseName);
    console.log("   Collection name:", User.collection.name);

    // Find user by email - try case-insensitive search
    let user = await User.findOne({ email: emailLower });
    
    // If not found, try searching without case conversion
    if (!user) {
      console.log("   Trying case-sensitive search...");
      user = await User.findOne({ email: email });
    }
    
    // If still not found, try regex search (case-insensitive)
    if (!user) {
      console.log("   Trying regex search...");
      user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    }
    
    console.log("   User found:", user ? `Yes (${user.email}, role: ${user.role})` : "No");

    if (!user) {
      console.log("   ❌ User not found in database");
      // List all users for debugging - try different queries
      try {
        const allUsers = await User.find({}, { email: 1, role: 1, name: 1 });
        console.log("   Total users in collection:", allUsers.length);
        console.log("   Available users in DB:", allUsers.map(u => `${u.email} (${u.role})`).join(", ") || "None");
        
        // Also try to get collection stats
        const stats = await mongoose.connection.db.collection('users').countDocuments();
        console.log("   Users collection document count:", stats);
      } catch (err) {
        console.log("   Error listing users:", err.message);
      }
      
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    console.log("   Comparing password...");
    // Plain text password comparison
    const isMatch = user.password === password;
    console.log("   Password match:", isMatch);

    if (!isMatch) {
      console.log("   ❌ Password does not match");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check if user is archived
    if (user.isArchived) {
      return res.status(403).json({
        success: false,
        message: "Account is archived. Please contact administrator."
      });
    }

    console.log("   ✅ Login successful for:", user.email);
    // Return success with user data (exclude password)
    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        status: user.status
      }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    console.error("   Error details:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: err.message
    });
  }
});

// Debug route to check database connection and list users
app.get("/api/auth/debug", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbName = mongoose.connection.db?.databaseName || "Unknown";
    const connectionString = mongoose.connection.host || "Unknown";
    
    const userCount = await User.countDocuments();
    const users = await User.find({}, { email: 1, role: 1, name: 1, _id: 0 }).limit(10);
    
    res.json({
      success: true,
      database: {
        connected: dbState === 1,
        state: dbState,
        name: dbName,
        host: connectionString,
        userCount: userCount
      },
      users: users,
      message: dbState === 1 ? "Database is connected" : "Database is not connected"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// === ROOT ROUTE ===
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Billing Backend API is running!",
    version: "1.0.0",
    port: PORT,
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    endpoints: {
      health: "/api/health",
      healthDb: "/api/health/db",
      login: "POST /api/auth/login",
      debug: "GET /api/auth/debug",
      createAdmin: "POST /api/create-admin",
      createTestUser: "POST /api/create-test-user"
    },
    timestamp: new Date().toISOString()
  });
});

// === HEALTH CHECK ENDPOINTS ===
// Test API is running
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  console.log("[/api/health] DB state:", dbState, "(0=disconnected, 1=connected, 2=connecting, 3=disconnecting)");
  res.json({
    success: true,
    message: "Billing Backend API is running!",
    database: dbState === 1 ? "Connected" : `Disconnected (state: ${dbState})`,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Test database connection directly
app.get("/api/health/db", async (req, res) => {
  try {
    console.log("[/api/health/db] Testing MongoDB Atlas connection...");
    
    if (!BILLING_MONGO_URI) {
      return res.status(400).json({
        success: false,
        message: "BILLING_MONGO_URI not configured",
        debug: "Check your .env file"
      });
    }

    // Create a test connection to verify Atlas is reachable
    const testConn = await mongoose.createConnection(BILLING_MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    }).asPromise();

    // Ping the database
    const pingResult = await testConn.db.admin().ping();
    console.log("[/api/health/db] Ping result:", pingResult);

    await testConn.close();

    res.json({
      success: true,
      message: "MongoDB Atlas connection successful",
      ping: pingResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[/api/health/db] Connection test failed:", error.message || error);
    res.status(503).json({
      success: false,
      message: "MongoDB Atlas connection failed",
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// DB connection & start
const connectDB = async () => {
  try {
    if (!BILLING_MONGO_URI || BILLING_MONGO_URI.trim() === '') {
      console.error("❌ BILLING_MONGO_URI is not set or empty.");
      console.error("   Please set BILLING_MONGO_URI in your .env to your MongoDB Atlas connection string.");
      process.exit(1);
    }

    console.log("🔄 Attempting to connect to Billing MongoDB Atlas...");
    console.log("   Connection string:", `${BILLING_MONGO_URI.substring(0, 50)}...`);
    
    // Ensure database name is specified in connection string
    let connectionUri = BILLING_MONGO_URI;
    
    // Parse the URI to check/replace database name
    // MongoDB URI format: mongodb+srv://user:pass@host/database?options
    // Handle cases: /database?, /?, or no database name
    
    // Check if URI has /? (no database name, just query params)
    if (connectionUri.includes('/?')) {
      // Replace /? with /BILLING?
      connectionUri = connectionUri.replace('/?', '/BILLING?');
      console.log("   Added database name 'BILLING' before query parameters");
    } 
    // Check if URI has /database? format
    else if (connectionUri.match(/\/[^\/\?]+\?/)) {
      // Replace existing database name with BILLING
      connectionUri = connectionUri.replace(/\/[^\/\?]+\?/, '/BILLING?');
      console.log("   Replaced database name with 'BILLING'");
    }
    // Check if URI ends with /database (no query params)
    else if (connectionUri.match(/\/[^\/]+$/)) {
      // Replace existing database name with BILLING
      connectionUri = connectionUri.replace(/\/[^\/]+$/, '/BILLING');
      console.log("   Replaced database name with 'BILLING'");
    }
    // No database name specified
    else {
      // Add /BILLING
      if (connectionUri.includes('?')) {
        connectionUri = connectionUri.replace('?', '/BILLING?');
      } else {
        connectionUri = (connectionUri.endsWith('/') ? connectionUri : connectionUri + '/') + 'BILLING';
      }
      console.log("   Added database name 'BILLING' to connection string");
    }
    
    console.log("   Final connection URI:", connectionUri.substring(0, 70) + "...");
    
    const startTime = Date.now();
    await mongoose.connect(connectionUri, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    
    const elapsed = Date.now() - startTime;
    const dbName = mongoose.connection.db?.databaseName || "Unknown";
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Connected to Billing MongoDB Atlas! (${elapsed}ms)`);
    console.log(`   Database name: ${dbName}`);
    console.log(`   Collections found: ${collections.map(c => c.name).join(', ')}`);
    console.log(`   Connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
  } catch (error) {
    const elapsed = Date.now() - (Date.now() - error.startTime || 0);
    console.error("❌ MongoDB Connection Failed!");
    console.error("   Error message:", error.message || String(error));
    console.error("   Error code:", error.code || 'N/A');
    console.error("   Elapsed time:", elapsed, "ms");
    console.error("");
    console.error("Troubleshooting steps:");
    console.error("1. Verify BILLING_MONGO_URI is set in .env");
    console.error("2. Check MongoDB Atlas cluster is running");
    console.error("3. Verify IP whitelist allows your connection");
    console.error("4. Test connection: http://localhost:5002/api/health/db");
    process.exit(1);
  }
};

const startServer = async () => {
  console.log("\n📋 Startup sequence:");
  console.log("1️⃣  Connecting to database...");
  await connectDB();
  
  console.log("2️⃣  Starting Express server...");
  app.listen(PORT, () => {
    console.log(`🚀 Billing Backend Server is READY!`);
    console.log(`   🌐 API URL: http://localhost:${PORT}`);
    console.log(`   🩺 Health: http://localhost:${PORT}/api/health`);
    console.log(`   📊 DB Test: http://localhost:${PORT}/api/health/db`);
    console.log(`   📝 Dashboard: http://localhost:${PORT}`);
  });
};

startServer().catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
