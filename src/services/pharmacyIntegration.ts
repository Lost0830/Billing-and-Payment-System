import { IntegrationStatus } from './integrationConfig';
import { configManager } from './configManager';

// Pharmacy Data Types
export interface PharmacyTransaction {
  id: string;
  transactionId: string;
  patientId: string;
  patientName: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  transactionDate: string;
  transactionTime: string;
  prescriptionId?: string;
  doctorId?: string;
  doctorName?: string;
  items: PharmacyItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid' | 'Partial' | 'Cancelled';
  syncStatus: 'Pending' | 'Synced' | 'Failed';
  syncedAt?: string;
  notes?: string;
}

export interface PharmacyItem {
  id: string;
  medicationId: string;
  medicationName: string;
  genericName: string;
  brand: string;
  strength: string;
  dosageForm: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  prescriptionRequired: boolean;
  batchNumber: string;
  expiryDate: string;
}

export interface PharmacyInventory {
  id: string;
  medicationId: string;
  medicationName: string;
  genericName: string;
  brand: string;
  strength: string;
  dosageForm: string;
  unitPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: string;
}

export interface PharmacyPrescription {
  id: string;
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  prescriptionDate: string;
  medications: {
    medicationId: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions: string;
  }[];
  status: 'Active' | 'Filled' | 'Expired' | 'Cancelled';
  filledAt?: string;
  filledBy?: string;
}

// Pharmacy API Service Class
export class PharmacyIntegrationService {
  private get config() {
    return configManager.getConfig().pharmacy;
  }
  private status: IntegrationStatus['pharmacy'] = {
    connected: false,
    lastSync: null,
    lastError: null,
    totalSynced: 0
  };

  // Test connection to pharmacy system
  async testConnection(): Promise<boolean> {
    try {
      // Mock API call - replace with actual pharmacy API endpoint
      const response = await this.makeRequest('/health');
      this.status.connected = true;
      this.status.lastError = null;
      return true;
    } catch (error) {
      this.status.connected = false;
      this.status.lastError = `Connection failed: ${error}`;
      return false;
    }
  }

  // Fetch pharmacy transactions
  async getTransactions(
    patientId?: string, 
    dateFrom?: string, 
    dateTo?: string, 
    unsyncedOnly: boolean = false
  ): Promise<PharmacyTransaction[]> {
    try {
      // Mock data - replace with actual API call
      const mockTransactions: PharmacyTransaction[] = [
        {
          id: "pharm_001",
          transactionId: "PH-TXN-2025-001",
          patientId: "P001",
          patientName: "Maria Santos",
          pharmacyId: "PHARM-001",
          pharmacyName: "MedPlus Pharmacy",
          pharmacyAddress: "Ground Floor, Medical Center Building, Quezon City",
          transactionDate: "2025-01-04",
          transactionTime: "15:30",
          prescriptionId: "RX-2025-001",
          doctorId: "DOC-001",
          doctorName: "Dr. Juan Reyes",
          items: [
            {
              id: "item_001",
              medicationId: "MED-001",
              medicationName: "Paracetamol",
              genericName: "Paracetamol",
              brand: "Biogesic",
              strength: "500mg",
              dosageForm: "Tablet",
              quantity: 20,
              unitPrice: 2.50,
              totalPrice: 50,
              prescriptionRequired: false,
              batchNumber: "PC250104",
              expiryDate: "2026-12-31"
            },
            {
              id: "item_002",
              medicationId: "MED-002", 
              medicationName: "Amoxicillin",
              genericName: "Amoxicillin",
              brand: "Amoxil",
              strength: "500mg",
              dosageForm: "Capsule",
              quantity: 21,
              unitPrice: 8.50,
              totalPrice: 178.50,
              prescriptionRequired: true,
              batchNumber: "AMX250104",
              expiryDate: "2026-11-30"
            },
            {
              id: "item_003",
              medicationId: "MED-003",
              medicationName: "Mefenamic Acid",
              genericName: "Mefenamic Acid",
              brand: "Dolfenal",
              strength: "500mg",
              dosageForm: "Capsule",
              quantity: 10,
              unitPrice: 5.00,
              totalPrice: 50,
              prescriptionRequired: false,
              batchNumber: "MF250104",
              expiryDate: "2026-10-31"
            }
          ],
          subtotal: 278.50,
          tax: 33.42,
          discount: 0,
          totalAmount: 311.92,
          paymentMethod: "Cash",
          paymentStatus: "Paid",
          syncStatus: "Synced",
          syncedAt: "2025-01-04T15:45:00Z",
          notes: "Pain medication and antibiotics for abdominal pain treatment"
        },
        {
          id: "pharm_002",
          transactionId: "PH-TXN-2025-002", 
          patientId: "P004",
          patientName: "Roberto Cruz",
          pharmacyId: "PHARM-001",
          pharmacyName: "MedPlus Pharmacy",
          pharmacyAddress: "Ground Floor, Medical Center Building, Quezon City",
          transactionDate: "2025-01-01",
          transactionTime: "11:15",
          prescriptionId: "RX-2025-002",
          doctorId: "DOC-002",
          doctorName: "Dr. Pedro Gonzales",
          items: [
            {
              id: "item_004",
              medicationId: "MED-004",
              medicationName: "Ceftriaxone Sodium",
              genericName: "Ceftriaxone",
              brand: "Rocephin",
              strength: "1g",
              dosageForm: "Injectable",
              quantity: 6,
              unitPrice: 95,
              totalPrice: 570,
              prescriptionRequired: true,
              batchNumber: "CFT250101",
              expiryDate: "2026-12-31"
            },
            {
              id: "item_005",
              medicationId: "MED-005",
              medicationName: "Metronidazole",
              genericName: "Metronidazole",
              brand: "Flagyl",
              strength: "500mg",
              dosageForm: "Tablet",
              quantity: 21,
              unitPrice: 6.50,
              totalPrice: 136.50,
              prescriptionRequired: true,
              batchNumber: "MTZ250101",
              expiryDate: "2026-11-30"
            },
            {
              id: "item_006",
              medicationId: "MED-006",
              medicationName: "Tramadol Hydrochloride",
              genericName: "Tramadol",
              brand: "Tramal",
              strength: "50mg",
              dosageForm: "Capsule",
              quantity: 20,
              unitPrice: 12,
              totalPrice: 240,
              prescriptionRequired: true,
              batchNumber: "TRM250101",
              expiryDate: "2026-09-30"
            }
          ],
          subtotal: 946.50,
          tax: 113.58,
          discount: 0,
          totalAmount: 1060.08,
          paymentMethod: "PhilHealth",
          paymentStatus: "Paid",
          syncStatus: "Synced",
          syncedAt: "2025-01-01T11:30:00Z",
          notes: "Post-operative medications for appendectomy"
        },
        {
          id: "pharm_003",
          transactionId: "PH-TXN-2025-003", 
          patientId: "P007",
          patientName: "Sofia Garcia",
          pharmacyId: "PHARM-001",
          pharmacyName: "MedPlus Pharmacy",
          pharmacyAddress: "Ground Floor, Medical Center Building, Quezon City",
          transactionDate: "2025-01-03",
          transactionTime: "09:45",
          prescriptionId: "RX-2025-003",
          doctorId: "DOC-003",
          doctorName: "Dr. Carlos Mendoza",
          items: [
            {
              id: "item_007",
              medicationId: "MED-007",
              medicationName: "Omeprazole",
              genericName: "Omeprazole",
              brand: "Losec",
              strength: "20mg",
              dosageForm: "Capsule",
              quantity: 30,
              unitPrice: 8,
              totalPrice: 240,
              prescriptionRequired: true,
              batchNumber: "OMP250103",
              expiryDate: "2026-12-31"
            },
            {
              id: "item_008",
              medicationId: "MED-008",
              medicationName: "Ondansetron",
              genericName: "Ondansetron",
              brand: "Zofran",
              strength: "4mg",
              dosageForm: "Tablet",
              quantity: 10,
              unitPrice: 25,
              totalPrice: 250,
              prescriptionRequired: true,
              batchNumber: "OND250103",
              expiryDate: "2026-10-31"
            }
          ],
          subtotal: 490,
          tax: 58.80,
          discount: 0,
          totalAmount: 548.80,
          paymentMethod: "GCash",
          paymentStatus: "Paid",
          syncStatus: "Synced",
          syncedAt: "2025-01-03T10:00:00Z",
          notes: "Post-operative medications for gallbladder surgery"
        }
      ];

      let filteredTransactions = mockTransactions;

      if (patientId) {
        filteredTransactions = filteredTransactions.filter(t => t.patientId === patientId);
      }

      if (dateFrom) {
        filteredTransactions = filteredTransactions.filter(t => t.transactionDate >= dateFrom);
      }

      if (dateTo) {
        filteredTransactions = filteredTransactions.filter(t => t.transactionDate <= dateTo);
      }

      if (unsyncedOnly) {
        filteredTransactions = filteredTransactions.filter(t => t.syncStatus === 'Pending');
      }

      this.status.lastSync = new Date();
      this.status.totalSynced += filteredTransactions.length;
      return filteredTransactions;
    } catch (error) {
      this.status.lastError = `Failed to fetch transactions: ${error}`;
      throw error;
    }
  }

  // Fetch pharmacy inventory
  async getInventory(medicationId?: string): Promise<PharmacyInventory[]> {
    try {
      // Mock data - replace with actual API call
      const mockInventory: PharmacyInventory[] = [
        {
          id: "inv_001",
          medicationId: "MED-001",
          medicationName: "Paracetamol",
          genericName: "Paracetamol", 
          brand: "Biogesic",
          strength: "500mg",
          dosageForm: "Tablet",
          unitPrice: 2.50,
          stockQuantity: 500,
          reorderLevel: 100,
          status: "In Stock",
          lastUpdated: "2025-01-08T08:00:00Z"
        },
        {
          id: "inv_002",
          medicationId: "MED-002",
          medicationName: "Amoxicillin",
          genericName: "Amoxicillin",
          brand: "Amoxil", 
          strength: "500mg",
          dosageForm: "Capsule",
          unitPrice: 8.50,
          stockQuantity: 25,
          reorderLevel: 30,
          status: "Low Stock",
          lastUpdated: "2025-01-08T08:00:00Z"
        }
      ];

      return medicationId 
        ? mockInventory.filter(item => item.medicationId === medicationId)
        : mockInventory;
    } catch (error) {
      this.status.lastError = `Failed to fetch inventory: ${error}`;
      throw error;
    }
  }

  // Fetch prescriptions
  async getPrescriptions(patientId?: string, status?: string): Promise<PharmacyPrescription[]> {
    try {
      // Mock data - replace with actual API call
      const mockPrescriptions: PharmacyPrescription[] = [
        {
          id: "presc_001",
          prescriptionId: "RX-2025-001",
          patientId: "P001",
          doctorId: "DOC-001",
          prescriptionDate: "2025-01-04",
          medications: [
            {
              medicationId: "MED-001",
              medicationName: "Paracetamol 500mg",
              dosage: "500mg",
              frequency: "Every 6 hours as needed",
              duration: "7 days",
              quantity: 20,
              instructions: "Take with food for pain relief"
            },
            {
              medicationId: "MED-002",
              medicationName: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "Three times daily",
              duration: "7 days",
              quantity: 21,
              instructions: "Complete the full course"
            }
          ],
          status: "Filled",
          filledAt: "2025-01-04T15:30:00Z",
          filledBy: "PharmTech-001"
        }
      ];

      let filteredPrescriptions = mockPrescriptions;

      if (patientId) {
        filteredPrescriptions = filteredPrescriptions.filter(p => p.patientId === patientId);
      }

      if (status) {
        filteredPrescriptions = filteredPrescriptions.filter(p => p.status === status);
      }

      return filteredPrescriptions;
    } catch (error) {
      this.status.lastError = `Failed to fetch prescriptions: ${error}`;
      throw error;
    }
  }

  // Mark transaction as synced in billing system
  async markTransactionAsSynced(transactionId: string): Promise<boolean> {
    try {
      // Mock API call - replace with actual pharmacy API
      console.log(`Marking pharmacy transaction ${transactionId} as synced`);
      return true;
    } catch (error) {
      this.status.lastError = `Failed to mark transaction as synced: ${error}`;
      return false;
    }
  }

  // Create billing entry from pharmacy transaction
  async createBillingEntry(transaction: PharmacyTransaction): Promise<boolean> {
    try {
      // This would integrate with the billing system to create invoice entries
      const billingEntry = {
        patientId: transaction.patientId,
        serviceType: 'Pharmacy',
        description: `Pharmacy Purchase - ${transaction.pharmacyName}`,
        items: transaction.items.map(item => ({
          description: `${item.medicationName} (${item.strength}) x${item.quantity}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.totalPrice
        })),
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        total: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod,
        paymentStatus: transaction.paymentStatus,
        externalReference: transaction.transactionId,
        notes: transaction.notes
      };

      console.log('Creating billing entry for pharmacy transaction:', billingEntry);
      return true;
    } catch (error) {
      this.status.lastError = `Failed to create billing entry: ${error}`;
      return false;
    }
  }

  // Get integration status
  getStatus(): IntegrationStatus['pharmacy'] {
    return this.status;
  }

  // Private method to make API requests
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}${this.config.endpoints.transactions || endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: this.config.timeout
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      throw new Error(`Pharmacy API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Sync data with pharmacy system
  async syncData(): Promise<void> {
    try {
      console.log('Starting pharmacy data synchronization...');
      
      // Test connection first
      const connected = await this.testConnection();
      if (!connected) {
        throw new Error('Cannot connect to pharmacy system');
      }

      // Get unsynced transactions
      const unsyncedTransactions = await this.getTransactions(undefined, undefined, undefined, true);
      
      // Create billing entries for unsynced transactions
      for (const transaction of unsyncedTransactions) {
        try {
          const success = await this.createBillingEntry(transaction);
          if (success) {
            await this.markTransactionAsSynced(transaction.id);
          }
        } catch (error) {
          console.error(`Failed to sync transaction ${transaction.id}:`, error);
        }
      }

      console.log(`Pharmacy data synchronization completed. Synced ${unsyncedTransactions.length} transactions`);
    } catch (error) {
      console.error('Pharmacy synchronization failed:', error);
      this.status.lastError = `Sync failed: ${error}`;
      throw error;
    }
  }
}

// Export singleton instance
export const pharmacyService = new PharmacyIntegrationService();