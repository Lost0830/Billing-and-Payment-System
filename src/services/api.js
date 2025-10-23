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
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to load patients");
  return body.data || [];
}

export async function fetchInvoices() {
  const res = await fetch(`${API_URL}/invoices`);
  const body = await safeJson(res);
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to load invoices");
  return body.data || [];
}

export async function fetchPayments() {
  const res = await fetch(`${API_URL}/payments`);
  const body = await safeJson(res);
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to load payments");
  return body.data || [];
}

export async function fetchInvoice(id) {
  const res = await fetch(`${API_URL}/invoices/${id}`);
  const body = await safeJson(res);
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to load invoice");
  return body.data;
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