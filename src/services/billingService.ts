// Shared billing service to manage billing records across modules
// This connects Invoice Generation, Payment Processing, and Billing History
// - Invoices created in Invoice Generation appear in Payment Processing dropdown
// - Payments processed in Payment Processing appear in Billing History
// - All records are synchronized in real-time across modules

export interface BillingRecord {
  id: string;
  type: 'invoice' | 'payment' | 'pharmacy' | 'service';
  number: string;
  patientName: string;
  patientId: string;
  date: string;
  time?: string;
  amount: number;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  description: string;
  paymentMethod?: string;
  department?: string;
  reference?: string;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category?: string;
  }>;
  // Financial breakdown
  subtotal?: number;
  discount?: number;
  discountType?: string;
  discountPercentage?: number;
  tax?: number;
  taxRate?: number;
  totalBeforeTax?: number;
}

class BillingService {
  private records: BillingRecord[] = [];
  private listeners: Array<(records: BillingRecord[]) => void> = [];
  // When true, components should avoid fetching remote billing data
  private remoteSyncSuppressed: boolean = false;

  constructor() {
    // Start with no local demo records so local billing history is empty by default
    this.records = [];
    // By default do NOT suppress remote sync — allow fresh sessions to auto-fetch
    this.remoteSyncSuppressed = false;
    // Do not set the cleared flag on initialization — leave that to explicit user actions
    try { /* intentionally no-op: do not modify localStorage here */ } catch (e) { /* ignore when not available */ }
    // Start periodic automations (client-side): run every 5 minutes
    try {
      setInterval(() => {
        try {
          this.runAutomations();
        } catch (e) {
          console.warn('billingService: automation run failed', e);
        }
      }, 5 * 60 * 1000);
    } catch (e) { /* ignore timers in constrained environments */ }
  }

  // Subscribe to billing record changes
  subscribe(listener: (records: BillingRecord[]) => void) {
    this.listeners.push(listener);
    // Immediately call with current data
    listener(this.records);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.records]));
  }

  // Get all records
  getAllRecords(): BillingRecord[] {
    return [...this.records];
  }

  // Clear all records (useful for resetting demo or clearing transaction history)
  clearAllRecords(options?: { notify?: boolean }) {
    this.records = [];
    if (options?.notify === false) return;
    this.notifyListeners();
  }

  // Control suppression of remote sync globally. When suppressed, components
  // should not fetch remote invoices/payments until suppression is lifted.
  setRemoteSyncSuppressed(suppressed: boolean) {
    this.remoteSyncSuppressed = !!suppressed;
  }

  isRemoteSyncSuppressed() {
    return this.remoteSyncSuppressed;
  }

  // Add a new billing record (from payment processing)
  addRecord(record: BillingRecord) {
    this.records.push(record);
    this.notifyListeners();
  }

  // Add payment record specifically
  addPaymentRecord(payment: {
    invoiceNumber: string;
    patientName: string;
    patientId: string;
    amount: number;
    method: string;
    reference: string;
    date: string;
    time?: string;
    status: 'completed' | 'pending' | 'processing' | 'failed';
    transactionId?: string;
  }) {
    const paymentNumber = payment.transactionId || payment.reference || `PAY-${Date.now()}`;
    
    const record: BillingRecord = {
      id: Date.now().toString(),
      type: "payment",
      number: paymentNumber,
      patientName: payment.patientName,
      patientId: payment.patientId,
      date: payment.date,
      time: payment.time,
      amount: payment.amount,
      status: payment.status === 'processing' ? 'pending' : 
              payment.status === 'failed' ? 'cancelled' : 
              payment.status,
      description: `Payment for ${payment.invoiceNumber}`,
      paymentMethod: this.formatPaymentMethod(payment.method),
      reference: payment.reference
    };

    this.addRecord(record);
    // Attempt to mark matching invoice(s) as completed when a payment arrives
    try {
      if (payment.invoiceNumber) {
        const invoice = this.records.find(r => r.type === 'invoice' && (String(r.number) === String(payment.invoiceNumber) || (r.number || '').includes(String(payment.invoiceNumber))));
        if (invoice && invoice.status !== 'completed') {
          invoice.status = 'completed';
        }
      } else {
        // fallback: try to match by patientId and amount
        const invoice = this.records.find(r => r.type === 'invoice' && r.patientId === payment.patientId && Math.abs((r.amount || 0) - (payment.amount || 0)) < 0.01 && r.status === 'pending');
        if (invoice) invoice.status = 'completed';
      }
    } catch (e) {
      console.warn('billingService: auto-complete invoice on payment failed', e);
    }

    this.notifyListeners();
    return record;
  }

  // Run simple automations:
  // - Auto-complete invoices when matching payments exist
  // - Auto-void (cancel) pending invoices older than `autoVoidDays`
  private autoVoidDays: number = 30;

  setAutoVoidDays(days: number) {
    this.autoVoidDays = Number(days) || 0;
  }

  runAutomations() {
    const now = Date.now();

    // Auto-complete invoices using payments present in records
    try {
      const payments = this.records.filter(r => r.type === 'payment');
      const invoices = this.records.filter(r => r.type === 'invoice');
      payments.forEach(p => {
        invoices.forEach(inv => {
          if (inv.status !== 'completed') {
            // match by invoice number or by patient+amount
            if ((p.number && inv.number && String(p.number) === String(inv.number)) ||
                (p.description && inv.number && String(p.description).includes(String(inv.number))) ||
                (p.patientId && inv.patientId && String(p.patientId) === String(inv.patientId) && Math.abs((p.amount||0) - (inv.amount||0)) < 0.01)) {
              inv.status = 'completed';
            }
          }
        });
      });
    } catch (e) {
      console.warn('billingService: auto-complete failed', e);
    }

    // Auto-void old pending invoices
    try {
      if (this.autoVoidDays > 0) {
        const cutoff = now - (this.autoVoidDays * 24 * 60 * 60 * 1000);
        let changed = false;
        this.records.forEach(r => {
          if ((r.status === 'pending') && r.date) {
            const dt = new Date(r.date).getTime();
            if (!isNaN(dt) && dt < cutoff) {
              r.status = 'cancelled';
              changed = true;
            }
          }
        });
        if (changed) this.notifyListeners();
      }
    } catch (e) {
      console.warn('billingService: auto-void failed', e);
    }
    // Notify after automations in case anything changed
    this.notifyListeners();
  }

  // Add invoice record
  addInvoiceRecord(invoice: {
    invoiceNumber: string;
    patientName: string;
    patientId: string;
    amount: number;
    description: string;
    date: string;
    time?: string;
    department?: string;
    subtotal?: number;
    discount?: number;
    discountType?: string;
    discountPercentage?: number;
    tax?: number;
    taxRate?: number;
    totalBeforeTax?: number;
    items?: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      category?: string;
    }>;
  }) {
    const record: BillingRecord = {
      id: Date.now().toString(),
      type: "invoice",
      number: invoice.invoiceNumber,
      patientName: invoice.patientName,
      patientId: invoice.patientId,
      date: invoice.date,
      time: invoice.time,
      amount: invoice.amount,
      status: "pending",
      description: invoice.description,
      department: invoice.department,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      discountType: invoice.discountType,
      discountPercentage: invoice.discountPercentage,
      tax: invoice.tax,
      taxRate: invoice.taxRate,
      totalBeforeTax: invoice.totalBeforeTax,
      items: invoice.items
    };

    this.addRecord(record);
    return record;
  }

  // Update record status
  updateRecordStatus(id: string, status: 'completed' | 'pending' | 'cancelled' | 'refunded') {
    const recordIndex = this.records.findIndex(r => r.id === id);
    if (recordIndex !== -1) {
      this.records[recordIndex].status = status;
      this.notifyListeners();
    }
  }

  // Helper to format payment method names
  private formatPaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      'cash': 'Cash',
      'card': 'Credit Card',
      'gcash': 'GCash',
      'paymaya': 'PayMaya',
      'bank': 'Bank Transfer'
    };
    return methodMap[method] || method;
  }

  // Get records by patient ID
  getRecordsByPatient(patientId: string): BillingRecord[] {
    return this.records.filter(r => r.patientId === patientId);
  }

  // Get records by type
  getRecordsByType(type: 'invoice' | 'payment' | 'pharmacy' | 'service'): BillingRecord[] {
    return this.records.filter(r => r.type === type);
  }

  // Get records by date range
  getRecordsByDateRange(startDate: string, endDate: string): BillingRecord[] {
    return this.records.filter(r => r.date >= startDate && r.date <= endDate);
  }
}

// Export singleton instance
export const billingService = new BillingService();
