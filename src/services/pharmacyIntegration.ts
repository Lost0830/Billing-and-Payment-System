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
      // When configured to use backend proxy, call real API via backend
      if (this.config.baseUrl && this.config.baseUrl.startsWith('/api')) {
        const qs = new URLSearchParams({
          patientId: patientId || '',
          dateFrom: dateFrom || '',
          dateTo: dateTo || '',
          unsyncedOnly: String(unsyncedOnly || '')
        }).toString();
        const resp = await this.makeRequest(`/transactions${qs ? `?${qs}` : ''}`);
        this.status.lastSync = new Date();
        this.status.totalSynced += Array.isArray(resp?.data) ? resp.data.length : (Array.isArray(resp) ? resp.length : 0);
        return (resp?.data || resp) as PharmacyTransaction[];
      }

      // No mock data - return empty array if API is not configured
      console.warn('Pharmacy API not configured, returning empty transactions');
      return [];
    } catch (error) {
      this.status.lastError = `Failed to fetch transactions: ${error}`;
      throw error;
    }
  }

  // Fetch pharmacy inventory
  async getInventory(medicationId?: string): Promise<PharmacyInventory[]> {
    try {
      if (this.config.baseUrl && this.config.baseUrl.startsWith('/api')) {
        const qs = new URLSearchParams({ medicationId: medicationId || '' }).toString();
        const resp = await this.makeRequest(`/inventory${qs ? `?${qs}` : ''}`);
        return (resp?.data || resp) as PharmacyInventory[];
      }
      // No mock data - return empty array if API is not configured
      console.warn('Pharmacy API not configured, returning empty inventory');
      return [];
    } catch (error) {
      this.status.lastError = `Failed to fetch inventory: ${error}`;
      throw error;
    }
  }

  // Fetch prescriptions
  async getPrescriptions(patientId?: string, status?: string): Promise<PharmacyPrescription[]> {
    try {
      if (this.config.baseUrl && this.config.baseUrl.startsWith('/api')) {
        const qs = new URLSearchParams({
          patientId: patientId || '',
          status: status || ''
        }).toString();
        const resp = await this.makeRequest(`/prescriptions${qs ? `?${qs}` : ''}`);
        return (resp?.data || resp) as PharmacyPrescription[];
      }
      // No mock data - return empty array if API is not configured
      console.warn('Pharmacy API not configured, returning empty prescriptions');
      return [];
    } catch (error) {
      this.status.lastError = `Failed to fetch prescriptions: ${error}`;
      throw error;
    }
  }

  // Mark transaction as synced in billing system
  async markTransactionAsSynced(transactionId: string): Promise<boolean> {
    try {
      if (this.config.baseUrl && this.config.baseUrl.startsWith('/api')) {
        const resp = await this.makeRequest(`/transactions/${transactionId}/mark-synced`, { method: 'POST' });
        return !!resp;
      }
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
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : undefined,
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
