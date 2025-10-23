// Integration configuration for external systems
export interface IntegrationConfig {
  emr: {
    baseUrl: string;
    apiKey: string;
    version: string;
    endpoints: {
      patients: string;
      appointments: string;
      medicalRecords: string;
      treatments: string;
      diagnoses: string;
    };
    syncInterval: number; // in minutes
    timeout: number; // in milliseconds
  };
  pharmacy: {
    baseUrl: string;
    apiKey: string;
    version: string;
    endpoints: {
      transactions: string;
      inventory: string;
      prescriptions: string;
      pricing: string;
    };
    syncInterval: number;
    timeout: number;
  };
  billing: {
    currency: string;
    taxRate: number;
    defaultPaymentMethods: string[];
  };
}

// Helper function to safely get environment variables in browser
const getEnvVar = (key: string, defaultValue: string): string => {
  // In a real application, you might use import.meta.env for Vite
  // or process environment variables set during build time
  try {
    return (window as any).__ENV__?.[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

// Default configuration (can be overridden by environment variables)
export const defaultConfig: IntegrationConfig = {
  emr: {
    baseUrl: getEnvVar("EMR_API_URL", "https://api.emr-system.hospital.ph"),
    apiKey: getEnvVar("EMR_API_KEY", ""),
    version: "v1",
    endpoints: {
      patients: "/patients",
      appointments: "/appointments", 
      medicalRecords: "/medical-records",
      treatments: "/treatments",
      diagnoses: "/diagnoses"
    },
    syncInterval: 15, // 15 minutes
    timeout: 30000 // 30 seconds
  },
  pharmacy: {
    baseUrl: getEnvVar("PHARMACY_API_URL", "https://api.pharmacy-system.hospital.ph"),
    apiKey: getEnvVar("PHARMACY_API_KEY", ""), 
    version: "v1",
    endpoints: {
      transactions: "/transactions",
      inventory: "/inventory",
      prescriptions: "/prescriptions",
      pricing: "/pricing"
    },
    syncInterval: 5, // 5 minutes for faster pharmacy sync
    timeout: 20000 // 20 seconds
  },
  billing: {
    currency: "PHP",
    taxRate: 0.12, // 12% VAT in Philippines
    defaultPaymentMethods: ["Cash", "Credit Card", "GCash", "PayMaya", "Bank Transfer"]
  }
};

// Integration status tracking
export interface IntegrationStatus {
  emr: {
    connected: boolean;
    lastSync: Date | null;
    lastError: string | null;
    totalSynced: number;
  };
  pharmacy: {
    connected: boolean;
    lastSync: Date | null;
    lastError: string | null;
    totalSynced: number;
  };
}

// Initial status
export const initialIntegrationStatus: IntegrationStatus = {
  emr: {
    connected: false,
    lastSync: null,
    lastError: null,
    totalSynced: 0
  },
  pharmacy: {
    connected: false,
    lastSync: null,
    lastError: null,
    totalSynced: 0
  }
};