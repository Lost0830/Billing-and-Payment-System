export function getDisplayPatientId(p: any): string {
  if (!p) return "";
  // Prefer an explicit patientId (friendly P###). If absent, fall back to id/_id.
  return p.patientId || p.id || p._id || "";
}

export function getInternalPatientKey(p: any): string {
  if (!p) return "";
  return p.id || p._id || p.patientId || "";
}

export function normalizePatient(p: any): any {
  if (!p) return p;
  return { ...p, id: p.patientId || p.id || p._id || "", patientId: p.patientId || "" };
}

export function normalizePatients(arr: any[] = []): any[] {
  // Ensure every patient has a stable, human-friendly patientId (P001, P002, ...)
  // without overwriting any existing patientId coming from the backend.
  return (arr || []).map((p: any, idx: number) => {
    const base = normalizePatient(p || {});
    if (!base.patientId || String(base.patientId).trim() === "") {
      // Generate a friendly sequential id based on the array order: P001, P002, ...
      const seq = String(idx + 1).padStart(3, '0');
      base.patientId = `P${seq}`;
      // ensure id field is set too for internal lookups
      base.id = base.id || base._id || base.patientId;
    }
    return base;
  });
}

// Given an array of patients and a raw key (could be _id, id, or patientId),
// return a user-friendly string for display (e.g. "Maria Santos (P001)").
// If no match is found, prefer returning the raw if it already looks like a friendly id (P###),
// otherwise return 'N/A' to avoid exposing internal DB ids in the UI.
export function resolvePatientDisplay(patients: any[] = [], raw: any): string {
  if (!raw && raw !== 0) return 'N/A';
  const key = String(raw || '').toString();
  if (!Array.isArray(patients) || patients.length === 0) {
    // If raw already looks like a friendly patient id, return it, otherwise hide
    return /^P\d{3,}$/i.test(key) ? key : 'N/A';
  }
  const found = patients.find((p: any) => String(getInternalPatientKey(p)) === String(key) || getDisplayPatientId(p) === String(key));
  if (found) {
    const pid = getDisplayPatientId(found) || getInternalPatientKey(found) || '';
    const name = found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim() || '';
    return name ? `${name} (${pid})` : pid || 'N/A';
  }
  return /^P\d{3,}$/i.test(key) ? key : 'N/A';
}
