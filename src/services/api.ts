const API_URL = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000/api";

async function safeJson(res: Response) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  try {
    if (!ct.includes("application/json")) {
      // attempt parse anyway for better debugging
      console.error("safeJson non-json response:", res.status, text.slice(0, 1000));
      throw new Error("Non-JSON response from server");
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("safeJson parse error:", e, "raw:", text.slice(0, 1000));
    throw e;
  }
}

export async function fetchPatients(): Promise<any[]> {
  const res = await fetch(`${API_URL}/patients`);
  const body = await safeJson(res);
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to load patients");
  return body.data || [];
}

export async function fetchInvoices(): Promise<any[]> {
  const res = await fetch(`${API_URL}/invoices`);
  const body = await safeJson(res);
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to load invoices");
  return body.data || [];
}

export async function fetchPayments(): Promise<any[]> {
  const res = await fetch(`${API_URL}/payments`);
  const body = await safeJson(res);
  if (!res.ok || !body?.success) throw new Error(body?.message || "Failed to load payments");
  return body.data || [];
}