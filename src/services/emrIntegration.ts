import { IntegrationStatus } from './integrationConfig';
import { configManager } from './configManager';

// EMR Data Types
export interface EMRPatient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactNumber: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  lastVisit: string;
  status: 'Active' | 'Inactive' | 'Deceased';
}

export interface EMRAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  department: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number; // in minutes
  type: 'Consultation' | 'Follow-up' | 'Emergency' | 'Surgery' | 'Lab Test';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  notes: string;
  cost: number;
}

export interface EMRTreatment {
  id: string;
  patientId: string;
  appointmentId: string;
  treatmentDate: string;
  diagnosis: string;
  treatment: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    cost: number;
  }[];
  procedures: {
    name: string;
    code: string;
    cost: number;
  }[];
  doctorNotes: string;
  totalCost: number;
  billable: boolean;
}

// EMR API Service Class
export class EMRIntegrationService {
  private get config() {
    return configManager.getConfig().emr;
  }
  private status: IntegrationStatus['emr'] = {
    connected: false,
    lastSync: null,
    lastError: null,
    totalSynced: 0
  };

  // Test connection to EMR system
  async testConnection(): Promise<boolean> {
    try {
      // Mock API call - replace with actual EMR API endpoint
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

  // Fetch patient data from EMR
  async getPatients(limit: number = 50, offset: number = 0): Promise<EMRPatient[]> {
    try {
      if (this.config.baseUrl && this.config.baseUrl.startsWith('/api')) {
        const resp = await this.makeRequest('/patients');
        this.status.lastSync = new Date();
        const arr = (resp?.data || resp) as EMRPatient[];
        this.status.totalSynced += Array.isArray(arr) ? arr.length : 0;
        return arr;
      }
      // Mock data - replace with actual API call
      const mockPatients: EMRPatient[] = [
        {
          id: "emr_001",
          patientId: "P001",
          firstName: "Maria",
          lastName: "Santos",
          dateOfBirth: "1985-03-15",
          gender: "Female",
          contactNumber: "+63917123456",
          email: "maria.santos@email.com",
          address: "123 Rizal Street, Quezon City, Metro Manila",
          emergencyContact: {
            name: "Juan Santos",
            relationship: "Spouse",
            phone: "+63917123457"
          },
          medicalHistory: ["Gastroenteritis", "Previous UTI"],
          allergies: ["None"],
          currentMedications: ["Paracetamol 500mg", "Amoxicillin 500mg", "Mefenamic Acid 500mg"],
          lastVisit: "2025-01-05",
          status: "Active"
        },
        {
          id: "emr_002", 
          patientId: "P004",
          firstName: "Roberto",
          lastName: "Cruz",
          dateOfBirth: "1990-06-12",
          gender: "Male",
          contactNumber: "+63918234567",
          email: "roberto.cruz@email.com",
          address: "456 EDSA, Makati City, Metro Manila",
          emergencyContact: {
            name: "Linda Cruz",
            relationship: "Wife",
            phone: "+63918234568"
          },
          medicalHistory: ["Appendicitis"],
          allergies: ["None"],
          currentMedications: ["Ceftriaxone 1g", "Metronidazole 500mg", "Tramadol 50mg"],
          lastVisit: "2025-01-02",
          status: "Active"
        }
      ];

      this.status.lastSync = new Date();
      this.status.totalSynced += mockPatients.length;
      return mockPatients;
    } catch (error) {
      this.status.lastError = `Failed to fetch patients: ${error}`;
      throw error;
    }
  }

  // Fetch appointments from EMR
  async getAppointments(patientId?: string, dateFrom?: string, dateTo?: string): Promise<EMRAppointment[]> {
    try {
      if (this.config.baseUrl && this.config.baseUrl.startsWith('/api')) {
        const qs = new URLSearchParams({ patientId: patientId || '' }).toString();
        const resp = await this.makeRequest(`/appointments${qs ? `?${qs}` : ''}`);
        return (resp?.data || resp) as EMRAppointment[];
      }
      // No mock data - return empty array if API is not configured
      console.warn('EMR API not configured, returning empty appointments');
      return [];
    } catch (error) {
      this.status.lastError = `Failed to fetch appointments: ${error}`;
      throw error;
    }
  }

  // Fetch treatment records for billing
  async getTreatments(patientId?: string, unbilledOnly: boolean = false): Promise<EMRTreatment[]> {
    try {
      if (this.config.baseUrl && this.config.baseUrl.startsWith('/api')) {
        const qs = new URLSearchParams({ patientId: patientId || '', unbilledOnly: String(unbilledOnly || '') }).toString();
        const resp = await this.makeRequest(`/treatments${qs ? `?${qs}` : ''}`);
        return (resp?.data || resp) as EMRTreatment[];
      }
      // Mock data - replace with actual API call  
      const mockTreatments: EMRTreatment[] = [
        {
          id: "treat_001",
          patientId: "P001",
          appointmentId: "appt_001",
          treatmentDate: "2025-01-03",
          diagnosis: "Acute Gastroenteritis (K52.9)",
          treatment: "Pain management and antibiotic therapy",
          medications: [
            {
              name: "Paracetamol 500mg",
              dosage: "500mg",
              frequency: "Every 6 hours",
              duration: "7 days",
              cost: 50
            },
            {
              name: "Amoxicillin 500mg",
              dosage: "500mg",
              frequency: "Three times daily",
              duration: "7 days",
              cost: 178.50
            },
            {
              name: "Mefenamic Acid 500mg",
              dosage: "500mg",
              frequency: "Three times daily",
              duration: "5 days",
              cost: 50
            }
          ],
          procedures: [
            {
              name: "Complete Blood Count",
              code: "85025",
              cost: 400
            },
            {
              name: "Abdominal Ultrasound", 
              code: "76700",
              cost: 2500
            }
          ],
          doctorNotes: "Patient diagnosed with gastroenteritis. Prescribed antibiotics and pain management. Follow-up in 1 week.",
          totalCost: 4678.50,
          billable: true
        }
      ];

      let filteredTreatments = mockTreatments;
      
      if (patientId) {
        filteredTreatments = filteredTreatments.filter(t => t.patientId === patientId);
      }
      
      if (unbilledOnly) {
        filteredTreatments = filteredTreatments.filter(t => t.billable);
      }

      return filteredTreatments;
    } catch (error) {
      this.status.lastError = `Failed to fetch treatments: ${error}`;
      throw error;
    }
  }

  // Mark treatment as billed in EMR system
  async markTreatmentAsBilled(treatmentId: string, invoiceId: string): Promise<boolean> {
    try {
      if (this.config.baseUrl && this.config.baseUrl.startsWith('/api')) {
        const resp = await this.makeRequest(`/treatments/${treatmentId}/mark-billed`, { method: 'POST', body: JSON.stringify({ invoiceId }), headers: { 'Content-Type': 'application/json' } });
        return !!resp;
      }
      console.log(`Marking treatment ${treatmentId} as billed with invoice ${invoiceId}`);
      return true;
    } catch (error) {
      this.status.lastError = `Failed to mark treatment as billed: ${error}`;
      return false;
    }
  }

  // Get integration status
  getStatus(): IntegrationStatus['emr'] {
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
      throw new Error(`EMR API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Sync data with EMR system
  async syncData(): Promise<void> {
    try {
      console.log('Starting EMR data synchronization...');
      
      // Test connection first
      const connected = await this.testConnection();
      if (!connected) {
        throw new Error('Cannot connect to EMR system');
      }

      // Sync patients, appointments, and treatments
      await this.getPatients();
      await this.getAppointments();
      await this.getTreatments();

      console.log('EMR data synchronization completed successfully');
    } catch (error) {
      console.error('EMR synchronization failed:', error);
      this.status.lastError = `Sync failed: ${error}`;
      throw error;
    }
  }
}

// Export singleton instance
export const emrService = new EMRIntegrationService();
