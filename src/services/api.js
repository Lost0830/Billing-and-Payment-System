const API_URL = (import.meta?.env?.VITE_API_URL) || "http://localhost:5000/api";

async function safeJson(res) {
  const text = await res.text();
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    console.error("safeJson non-json response:", res.status, text.slice(0, 200));
    throw new Error(`Non-JSON response (${res.status})`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("safeJson parse error:", e, text.slice(0, 200));
    throw e;
  }
}

export async function fetchPatients() {
  const res = await fetch(`${API_URL}/patients`);
  const body = await safeJson(res);
  // Accept either the new { success: true, data: [...] } shape or a plain array/object
  if (!res.ok) throw new Error(body?.message || "Failed to load patients");
  const data = Array.isArray(body) ? body : (body?.data || []);
  if (!body?.success && !Array.isArray(body) && !body?.data) {
    // tolerate servers that return a 200 with an object that doesn't include success/data
    console.warn('fetchPatients: response missing success flag — returning available data (if any)');
  }
  return data || [];
}

export async function fetchInvoices() {
  const res = await fetch(`${API_URL}/invoices`);
  const body = await safeJson(res);
  if (!res.ok) throw new Error(body?.message || "Failed to load invoices");
  const data = Array.isArray(body) ? body : (body?.data || []);
  if (!body?.success && !Array.isArray(body) && !body?.data) {
    console.warn('fetchInvoices: response missing success flag — returning available data (if any)');
  }
  return data || [];
}

export async function fetchPayments() {
  const res = await fetch(`${API_URL}/payments`);
  const body = await safeJson(res);
  if (!res.ok) throw new Error(body?.message || "Failed to load payments");
  const data = Array.isArray(body) ? body : (body?.data || []);
  if (!body?.success && !Array.isArray(body) && !body?.data) {
    console.warn('fetchPayments: response missing success flag — returning available data (if any)');
  }
  return data || [];
}

export async function fetchInvoice(id) {
  const res = await fetch(`${API_URL}/invoices/${id}`);
  const body = await safeJson(res);
  if (!res.ok) throw new Error(body?.message || "Failed to load invoice");
  // Accept either { success:true, data: {...} } or a plain object for the invoice
  if (body?.data) return body.data;
  if (body?.success && body?.invoice) return body.invoice;
  // fallback: return body itself (server may return the invoice object directly)
  return body;
}

export async function updateInvoice(id, payload) {
  const res = await fetch(`${API_URL}/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to update invoice");
  return body.data;
}

export async function createPayment(payload) {
  const res = await fetch(`${API_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to create payment");
  return body.data;
}