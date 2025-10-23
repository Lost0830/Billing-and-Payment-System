import { emrService, EMRPatient, EMRAppointment, EMRTreatment } from './emrIntegration';
import { pharmacyService, PharmacyTransaction } from './pharmacyIntegration';
import { IntegrationStatus } from './integrationConfig';
import { configManager } from './configManager';

// Integration events
export type IntegrationEvent = 
  | 'emr_sync_started'
  | 'emr_sync_completed' 
  | 'emr_sync_failed'
  | 'pharmacy_sync_started'
  | 'pharmacy_sync_completed'
  | 'pharmacy_sync_failed'
  | 'patient_data_updated'
  | 'new_pharmacy_transaction'
  | 'billing_entry_created';

export interface IntegrationEventData {
  event: IntegrationEvent;
  timestamp: Date;
  data?: any;
  error?: string;
}

// Integration Manager Class
export class IntegrationManager {
  private eventListeners: { [event: string]: ((data: IntegrationEventData) => void)[] } = {};
  private syncIntervals: { [key: string]: NodeJS.Timeout } = {};
  private isRunning: boolean = false;

  // Start integration services
  async start(): Promise<void> {
    try {
      console.log('Starting Integration Manager...');
      this.isRunning = true;

      // Test connections
      const emrConnected = await emrService.testConnection();
      const pharmacyConnected = await pharmacyService.testConnection();

      console.log(`EMR Connection: ${emrConnected ? 'Success' : 'Failed'}`);
      console.log(`Pharmacy Connection: ${pharmacyConnected ? 'Success' : 'Failed'}`);

      // Start periodic sync if connections are successful
      if (emrConnected) {
        this.startPeriodicEMRSync();
      }

      if (pharmacyConnected) {
        this.startPeriodicPharmacySync();
      }

      console.log('Integration Manager started successfully');
    } catch (error) {
      console.error('Failed to start Integration Manager:', error);
      throw error;
    }
  }

  // Stop integration services
  stop(): void {
    console.log('Stopping Integration Manager...');
    this.isRunning = false;

    // Clear all intervals
    Object.values(this.syncIntervals).forEach(interval => {
      clearInterval(interval);
    });
    this.syncIntervals = {};

    console.log('Integration Manager stopped');
  }

  // Start periodic EMR synchronization
  private startPeriodicEMRSync(): void {
    const config = configManager.getConfig();
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        this.emitEvent('emr_sync_started', {});
        await emrService.syncData();
        this.emitEvent('emr_sync_completed', {});
      } catch (error) {
        this.emitEvent('emr_sync_failed', { error: error.toString() });
      }
    }, config.emr.syncInterval * 60 * 1000); // Convert minutes to milliseconds

    this.syncIntervals.emr = interval;
  }

  // Start periodic pharmacy synchronization
  private startPeriodicPharmacySync(): void {
    const config = configManager.getConfig();
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        this.emitEvent('pharmacy_sync_started', {});
        await pharmacyService.syncData();
        this.emitEvent('pharmacy_sync_completed', {});
      } catch (error) {
        this.emitEvent('pharmacy_sync_failed', { error: error.toString() });
      }
    }, config.pharmacy.syncInterval * 60 * 1000); // Convert minutes to milliseconds

    this.syncIntervals.pharmacy = interval;
  }

  // Manual sync triggers
  async syncEMRData(): Promise<void> {
    this.emitEvent('emr_sync_started', {});
    try {
      await emrService.syncData();
      this.emitEvent('emr_sync_completed', {});
    } catch (error) {
      this.emitEvent('emr_sync_failed', { error: error.toString() });
      throw error;
    }
  }

  async syncPharmacyData(): Promise<void> {
    this.emitEvent('pharmacy_sync_started', {});
    try {
      await pharmacyService.syncData();
      this.emitEvent('pharmacy_sync_completed', {});
    } catch (error) {
      this.emitEvent('pharmacy_sync_failed', { error: error.toString() });
      throw error;
    }
  }

  // Get patient data with integrated information
  async getPatientData(patientId: string): Promise<{
    patient: EMRPatient | null;
    appointments: EMRAppointment[];
    treatments: EMRTreatment[];
    pharmacyTransactions: PharmacyTransaction[];
  }> {
    try {
      const [patients, appointments, treatments, pharmacyTransactions] = await Promise.all([
        emrService.getPatients(),
        emrService.getAppointments(patientId),
        emrService.getTreatments(patientId),
        pharmacyService.getTransactions(patientId)
      ]);

      const patient = patients.find(p => p.patientId === patientId) || null;

      return {
        patient,
        appointments,
        treatments,
        pharmacyTransactions
      };
    } catch (error) {
      console.error('Failed to get integrated patient data:', error);
      throw error;
    }
  }

  // Get unbilled items for patient
  async getUnbilledItems(patientId: string): Promise<{
    treatments: EMRTreatment[];
    pharmacyTransactions: PharmacyTransaction[];
  }> {
    try {
      const [treatments, pharmacyTransactions] = await Promise.all([
        emrService.getTreatments(patientId, true), // unbilled only
        pharmacyService.getTransactions(patientId, undefined, undefined, true) // unsynced only
      ]);

      return {
        treatments,
        pharmacyTransactions
      };
    } catch (error) {
      console.error('Failed to get unbilled items:', error);
      throw error;
    }
  }

  // Create integrated invoice
  async createIntegratedInvoice(patientId: string, includePharmacy: boolean = true): Promise<{
    invoiceData: any;
    success: boolean;
  }> {
    try {
      const { patient, treatments, pharmacyTransactions } = await this.getUnbilledItems(patientId);

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Build invoice items from treatments
      const treatmentItems = treatments.map(treatment => ({
        type: 'treatment',
        id: treatment.id,
        description: treatment.diagnosis,
        date: treatment.treatmentDate,
        doctor: treatment.id, // Would get doctor info from treatment
        items: [
          ...treatment.medications.map(med => ({
            description: `${med.name} - ${med.dosage}`,
            quantity: 1,
            unitPrice: med.cost,
            amount: med.cost
          })),
          ...treatment.procedures.map(proc => ({
            description: `${proc.name} (${proc.code})`,
            quantity: 1,
            unitPrice: proc.cost,
            amount: proc.cost
          }))
        ],
        subtotal: treatment.totalCost
      }));

      // Build invoice items from pharmacy transactions if included
      const pharmacyItems = includePharmacy ? pharmacyTransactions.map(transaction => ({
        type: 'pharmacy',
        id: transaction.id,
        description: `Pharmacy Purchase - ${transaction.pharmacyName}`,
        date: transaction.transactionDate,
        items: transaction.items.map(item => ({
          description: `${item.medicationName} (${item.strength}) x${item.quantity}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.totalPrice
        })),
        subtotal: transaction.subtotal,
        tax: transaction.tax
      })) : [];

      const invoiceData = {
        patientId: patient.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        treatmentItems,
        pharmacyItems,
        totalTreatments: treatmentItems.reduce((sum, item) => sum + item.subtotal, 0),
        totalPharmacy: pharmacyItems.reduce((sum, item) => sum + item.subtotal, 0),
        totalTax: pharmacyItems.reduce((sum, item) => sum + (item.tax || 0), 0)
      };

      invoiceData.grandTotal = invoiceData.totalTreatments + invoiceData.totalPharmacy + invoiceData.totalTax;

      // Mark items as billed (this would be called after invoice is confirmed)
      // for (const treatment of treatments) {
      //   await emrService.markTreatmentAsBilled(treatment.id, 'INVOICE_ID');
      // }
      // 
      // for (const transaction of pharmacyTransactions) {
      //   await pharmacyService.markTransactionAsSynced(transaction.id);
      // }

      return {
        invoiceData,
        success: true
      };
    } catch (error) {
      console.error('Failed to create integrated invoice:', error);
      return {
        invoiceData: null,
        success: false
      };
    }
  }

  // Get integration status
  getIntegrationStatus(): IntegrationStatus {
    return {
      emr: emrService.getStatus(),
      pharmacy: pharmacyService.getStatus()
    };
  }

  // Event management
  addEventListener(event: IntegrationEvent, callback: (data: IntegrationEventData) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  removeEventListener(event: IntegrationEvent, callback: (data: IntegrationEventData) => void): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emitEvent(event: IntegrationEvent, data: any): void {
    const eventData: IntegrationEventData = {
      event,
      timestamp: new Date(),
      data
    };

    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Utility methods
  isConnected(): boolean {
    const status = this.getIntegrationStatus();
    return status.emr.connected || status.pharmacy.connected;
  }

  getLastSyncTimes(): { emr: Date | null; pharmacy: Date | null } {
    const status = this.getIntegrationStatus();
    return {
      emr: status.emr.lastSync,
      pharmacy: status.pharmacy.lastSync
    };
  }

  getConnectionErrors(): { emr: string | null; pharmacy: string | null } {
    const status = this.getIntegrationStatus();
    return {
      emr: status.emr.lastError,
      pharmacy: status.pharmacy.lastError
    };
  }
}

// Export singleton instance
export const integrationManager = new IntegrationManager();