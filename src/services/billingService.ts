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
    // Initialize with some sample data
    this.records = [
      {
        id: "1",
        type: "invoice",
        number: "INV-2025-001",
        patientName: "Maria Santos",
        patientId: "P001",
        date: "2025-01-05",
        time: "10:30 AM",
        amount: 13800,
        status: "completed",
        description: "General Consultation, Blood Test, X-Ray",
        department: "Outpatient"
      },
      {
        id: "2",
        type: "payment",
        number: "PAY-2025-001",
        patientName: "Maria Santos",
        patientId: "P001",
        date: "2025-01-05",
        time: "10:45 AM",
        amount: 13800,
        status: "completed",
        description: "Payment for INV-2025-001",
        paymentMethod: "GCash",
        reference: "GCH-20250105-001"
      },
      {
        id: "3",
        type: "pharmacy",
        number: "PH-2025-001",
        patientName: "Juan Dela Cruz",
        patientId: "P002",
        date: "2025-01-04",
        time: "2:15 PM",
        amount: 2500,
        status: "completed",
        description: "Prescription Medications (Amoxicillin, Paracetamol)",
        department: "Pharmacy",
        items: [
          {
            id: "med1",
            description: "Amoxicillin 500mg Capsules x30",
            quantity: 30,
            unitPrice: 25,
            totalPrice: 750
          },
          {
            id: "med2",
            description: "Paracetamol 500mg Tablets x20",
            quantity: 20,
            unitPrice: 5,
            totalPrice: 100
          },
          {
            id: "med3",
            description: "Cough Syrup 120ml",
            quantity: 1,
            unitPrice: 150,
            totalPrice: 150
          }
        ]
      },
      {
        id: "4",
        type: "invoice",
        number: "INV-2025-002",
        patientName: "Juan Dela Cruz",
        patientId: "P002",
        date: "2025-01-05",
        time: "11:15 AM",
        amount: 7820,
        status: "pending",
        description: "Follow-up Consultation, Medication",
        department: "Outpatient"
      },
      {
        id: "5",
        type: "invoice",
        number: "INV-2025-003",
        patientName: "Anna Reyes",
        patientId: "P003",
        date: "2025-01-04",
        time: "9:30 AM",
        amount: 11040,
        status: "pending",
        description: "Laboratory Tests, Consultation",
        department: "Laboratory"
      },
      {
        id: "6",
        type: "invoice",
        number: "INV-2025-004",
        patientName: "Roberto Cruz",
        patientId: "P004",
        date: "2025-01-04",
        time: "3:45 PM",
        amount: 28000,
        status: "pending",
        description: "X-Ray, Physical Therapy Sessions",
        department: "Radiology"
      },
      {
        id: "7",
        type: "service",
        number: "SRV-2025-001",
        patientName: "Carmen Flores",
        patientId: "P005",
        date: "2025-01-03",
        time: "1:00 PM",
        amount: 15600,
        status: "pending",
        description: "CT Scan, Blood Chemistry Panel",
        department: "Radiology"
      },
      {
        id: "8",
        type: "invoice",
        number: "INV-2025-005",
        patientName: "Carlos Miguel",
        patientId: "P004",
        date: "2025-01-03",
        time: "8:30 AM",
        amount: 45000,
        status: "completed",
        description: "Minor Surgery, Anesthesia, Recovery Room",
        department: "Surgery"
      },
      {
        id: "9",
        type: "payment",
        number: "PAY-2025-002",
        patientName: "Carlos Miguel",
        patientId: "P004",
        date: "2025-01-03",
        time: "4:15 PM",
        amount: 45000,
        status: "completed",
        description: "Payment for INV-2025-005",
        paymentMethod: "Credit Card",
        reference: "CC-20250103-001"
      }
    ];
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
  }) {
    const paymentNumber = `PAY-${Date.now()}`;
    
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
    return record;
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