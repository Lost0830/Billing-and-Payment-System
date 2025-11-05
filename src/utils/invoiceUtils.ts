export function computeInvoiceSubtotal(inv: any): number {
  if (!inv) return 0;
  const tryNumber = (v: any) => {
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  // common scalar fields that many backends use
  const candidates = [
    inv.subtotal,
    inv.amount,
    inv.total,
    inv.totalAmount,
    inv.totalBeforeTax,
    inv.total_price,
    inv.price,
  ];
  for (const c of candidates) {
    const n = tryNumber(c);
    if (n !== undefined) return n;
  }

  // fallback: sum item/line amounts
  if (Array.isArray(inv.items) && inv.items.length > 0) {
    return inv.items.reduce((s: number, it: any) => s + Number(it.totalPrice ?? it.amount ?? it.price ?? it.unitPrice ?? 0), 0);
  }
  if (Array.isArray(inv.lines) && inv.lines.length > 0) {
    return inv.lines.reduce((s: number, it: any) => s + Number(it.totalPrice ?? it.amount ?? it.price ?? 0), 0);
  }

  return 0;
}
