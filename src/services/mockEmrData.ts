// Mock EMR Data Service
// This simulates patient service data from the EMR system
// In production, this would integrate with the actual EMR Integration Service

export interface PatientService {
  serviceId: string;
  service: string;
  category: string;
  quantity: number;
  date: string;
  provider: string;
  notes?: string;
}

export interface PatientMedicine {
  medicineId: string;
  name: string;
  form?: string; // e.g., tablet, suspension, injection
  strength?: string; // e.g., 500mg
  quantity: number;
  datePrescribed: string;
  prescribedBy?: string;
  instructions?: string;
}

export interface PatientEmrData {
  patientId: string;
  patientName: string;
  admissionDate?: string;
  dischargeDate?: string;
  status: 'admitted' | 'discharged' | 'outpatient';
  services: PatientService[];
  medicines?: PatientMedicine[];
}

// Mock EMR database with realistic patient service data
const MOCK_EMR_DATABASE: Record<string, PatientEmrData> = {
  "P001": {
    patientId: "P001",
    patientName: "Juan Santos",
    admissionDate: "2025-01-03",
    status: "discharged",
    dischargeDate: "2025-01-05",
    services: [
      {
        serviceId: "S001",
        service: "General Consultation",
        category: "Consultation Services",
        quantity: 1,
        date: "2025-01-03",
        provider: "Dr. John",
        notes: "Routine checkup and medication review"
      },
      {
        serviceId: "S002",
        service: "Complete Blood Count",
        category: "Laboratory Services",
        quantity: 1,
        date: "2025-01-03",
        provider: "Lab Department",
        notes: "Routine blood work"
      },
      {
        serviceId: "S003",
        service: "Pharmacy - Medications",
        category: "Pharmacy",
        quantity: 1,
        date: "2025-01-04",
        provider: "Pharmacy",
        notes: "Paracetamol 500mg x10, Cetrizine 10mg x10"
      }
    ],
    medicines: [
      {
        medicineId: "M001",
        name: "Paracetamol",
        form: "tablet",
        strength: "500mg",
        quantity: 10,
        datePrescribed: "2025-01-04",
        prescribedBy: "Dr. John",
        instructions: "Take 1 tablet every 6 hours as needed for pain"
      },
      {
        medicineId: "M002",
        name: "Cetirizine",
        form: "tablet",
        strength: "10mg",
        quantity: 10,
        datePrescribed: "2025-01-04",
        prescribedBy: "Dr. John",
        instructions: "Take 1 tablet daily at night for allergies"
      }
    ]
  },
  "P002": {
    patientId: "P002",
    patientName: "Anna Reyes",
    admissionDate: "2025-01-02",
    status: "discharged",
    dischargeDate: "2025-01-04",
    services: [
      {
        serviceId: "S008",
        service: "CT Scan",
        category: "Diagnostic Services",
        quantity: 1,
        date: "2025-01-02",
        provider: "Radiology Department",
        notes: "Head CT scan for headache evaluation"
      },
      {
        serviceId: "S009",
        service: "Specialist Consultation",
        category: "Consultation Services",
        quantity: 1,
        date: "2025-01-02",
        provider: "Dr. Roberto Santos - Neurologist",
        notes: "Neurological evaluation"
      },
      {
        serviceId: "S010",
        service: "Pharmacy - Medications",
        category: "Pharmacy",
        quantity: 1,
        date: "2025-01-03",
        provider: "Pharmacy",
        notes: "Ibuprofen 400mg x15, Omeprazole 20mg x14"
      }
    ],
    medicines: [
      {
        medicineId: "M003",
        name: "Ibuprofen",
        form: "tablet",
        strength: "400mg",
        quantity: 15,
        datePrescribed: "2025-01-03",
        prescribedBy: "Dr. Roberto Santos",
        instructions: "Take 1 tablet every 8 hours as needed for pain"
      },
      {
        medicineId: "M004",
        name: "Omeprazole",
        form: "tablet",
        strength: "20mg",
        quantity: 14,
        datePrescribed: "2025-01-03",
        prescribedBy: "Dr. Roberto Santos",
        instructions: "Take 1 tablet daily before breakfast"
      }
    ]
  },
  "P003": {
    patientId: "P003",
    patientName: "Maria Santos",
    admissionDate: "2025-01-03",
    status: "discharged",
    dischargeDate: "2025-01-05",
    services: [
      {
        serviceId: "S011",
        service: "General Consultation",
        category: "Consultation Services",
        quantity: 1,
        date: "2025-01-03",
        provider: "Dr. John",
        notes: "Initial assessment for abdominal pain"
      },
      {
        serviceId: "S012",
        service: "Complete Blood Count",
        category: "Laboratory Services",
        quantity: 1,
        date: "2025-01-03",
        provider: "Lab Department",
        notes: "Routine blood work"
      },
      {
        serviceId: "S013",
        service: "Ultrasound",
        category: "Diagnostic Services",
        quantity: 1,
        date: "2025-01-03",
        provider: "Radiology Department",
        notes: "Abdominal ultrasound"
      },
      {
        serviceId: "S014",
        service: "Pharmacy - Medications",
        category: "Pharmacy",
        quantity: 1,
        date: "2025-01-04",
        provider: "Pharmacy",
        notes: "Paracetamol 500mg x20, Amoxicillin 500mg x21, Mefenamic Acid 500mg x10"
      }
    ],
    medicines: [
      {
        medicineId: "M005",
        name: "Paracetamol",
        form: "tablet",
        strength: "500mg",
        quantity: 20,
        datePrescribed: "2025-01-04",
        prescribedBy: "Dr. John",
        instructions: "Take 1-2 tablets every 4-6 hours as needed; do not exceed 8 tablets/day"
      },
      {
        medicineId: "M006",
        name: "Amoxicillin",
        form: "capsule",
        strength: "500mg",
        quantity: 21,
        datePrescribed: "2025-01-04",
        prescribedBy: "Dr. John",
        instructions: "Take 1 capsule every 8 hours for 7 days"
      },
      {
        medicineId: "M007",
        name: "Mefenamic Acid",
        form: "tablet",
        strength: "500mg",
        quantity: 10,
        datePrescribed: "2025-01-04",
        prescribedBy: "Dr. John",
        instructions: "Take 1 tablet every 8 hours as needed for pain; avoid if bleeding disorder present"
      }
    ]
  },
  "P004": {
    patientId: "P004",
    patientName: "Roberto Cruz",
    admissionDate: "2024-12-30",
    status: "discharged",
    dischargeDate: "2025-01-02",
    services: [
      {
        serviceId: "S010",
        service: "Minor Surgery",
        category: "Surgical Services",
        quantity: 1,
        date: "2024-12-31",
        provider: "Dr. Pedro Gonzales - Surgeon",
        notes: "Appendectomy"
      },
      {
        serviceId: "S011",
        service: "Semi-Private Room",
        category: "Room & Board",
        quantity: 3,
        date: "2024-12-30",
        provider: "Nursing Department",
        notes: "3 days hospitalization"
      },
      {
        serviceId: "S012",
        service: "Complete Blood Count",
        category: "Laboratory Services",
        quantity: 2,
        date: "2024-12-30",
        provider: "Lab Department",
        notes: "Pre-op and post-op blood work"
      },
      {
        serviceId: "S013",
        service: "Pharmacy - Medications",
        category: "Pharmacy",
        quantity: 1,
        date: "2025-01-01",
        provider: "Pharmacy",
        notes: "Ceftriaxone 1g Injectable x6, Metronidazole 500mg x21, Tramadol 50mg x20"
      }
    ]
  },
  "P005": {
    patientId: "P005",
    patientName: "Carmen Flores",
    admissionDate: "2025-01-05",
    status: "admitted",
    services: [
      {
        serviceId: "S014",
        service: "Emergency Consultation",
        category: "Consultation Services",
        quantity: 1,
        date: "2025-01-05",
        provider: "Dr. Sofia Martinez - ER Physician",
        notes: "Chest pain evaluation"
      },
      {
        serviceId: "S015",
        service: "ECG",
        category: "Diagnostic Services",
        quantity: 1,
        date: "2025-01-05",
        provider: "ER Department",
        notes: "Emergency ECG"
      },
      {
        serviceId: "S016",
        service: "Blood Chemistry",
        category: "Laboratory Services",
        quantity: 1,
        date: "2025-01-05",
        provider: "Lab Department",
        notes: "Cardiac enzymes"
      },
      {
        serviceId: "S017",
        service: "ICU",
        category: "Room & Board",
        quantity: 1,
        date: "2025-01-05",
        provider: "ICU Department",
        notes: "Intensive care observation"
      }
    ]
  },
  "P006": {
    patientId: "P006",
    patientName: "Miguel Torres",
    admissionDate: "2025-01-04",
    status: "outpatient",
    services: [
      {
        serviceId: "S018",
        service: "Physical Therapy",
        category: "Therapeutic Services",
        quantity: 5,
        date: "2025-01-04",
        provider: "Physical Therapy Department",
        notes: "Post-fracture rehabilitation sessions"
      },
      {
        serviceId: "S019",
        service: "X-Ray",
        category: "Diagnostic Services",
        quantity: 2,
        date: "2025-01-04",
        provider: "Radiology Department",
        notes: "Follow-up x-rays"
      }
    ]
  },
  "P007": {
    patientId: "P007",
    patientName: "Sofia Garcia",
    admissionDate: "2025-01-01",
    status: "discharged",
    dischargeDate: "2025-01-05",
    services: [
      {
        serviceId: "S020",
        service: "Major Surgery",
        category: "Surgical Services",
        quantity: 1,
        date: "2025-01-02",
        provider: "Dr. Carlos Mendoza - Surgeon",
        notes: "Gallbladder removal"
      },
      {
        serviceId: "S021",
        service: "Private Room",
        category: "Room & Board",
        quantity: 4,
        date: "2025-01-01",
        provider: "Nursing Department",
        notes: "4 days private room"
      },
      {
        serviceId: "S022",
        service: "Complete Blood Count",
        category: "Laboratory Services",
        quantity: 3,
        date: "2025-01-01",
        provider: "Lab Department",
        notes: "Pre-op and post-op monitoring"
      },
      {
        serviceId: "S023",
        service: "Ultrasound",
        category: "Diagnostic Services",
        quantity: 1,
        date: "2025-01-01",
        provider: "Radiology Department",
        notes: "Pre-operative imaging"
      },
      {
        serviceId: "S024",
        service: "Pharmacy - Medications",
        category: "Pharmacy",
        quantity: 1,
        date: "2025-01-03",
        provider: "Pharmacy",
        notes: "Omeprazole 20mg x30, Ondansetron 4mg x10 - Post-operative care"
      }
    ]
  },
  "P008": {
    patientId: "P008",
    patientName: "Pedro Gonzales",
    admissionDate: "2025-01-03",
    status: "outpatient",
    services: [
      {
        serviceId: "S025",
        service: "Telemedicine Consultation",
        category: "Consultation Services",
        quantity: 1,
        date: "2025-01-03",
        provider: "Dr. Elena Ramirez",
        notes: "Virtual follow-up for diabetes management"
      },
      {
        serviceId: "S026",
        service: "Blood Chemistry",
        category: "Laboratory Services",
        quantity: 1,
        date: "2025-01-03",
        provider: "Lab Department",
        notes: "HbA1c and glucose monitoring"
      }
    ]
  },
  "P009": {
    patientId: "P009",
    patientName: "Elena Ramirez",
    admissionDate: "2025-01-05",
    status: "admitted",
    services: [
      {
        serviceId: "S027",
        service: "Dialysis",
        category: "Therapeutic Services",
        quantity: 1,
        date: "2025-01-05",
        provider: "Nephrology Department",
        notes: "Regular dialysis session"
      },
      {
        serviceId: "S028",
        service: "Complete Blood Count",
        category: "Laboratory Services",
        quantity: 1,
        date: "2025-01-05",
        provider: "Lab Department",
        notes: "Pre-dialysis blood work"
      },
      {
        serviceId: "S029",
        service: "Day Care",
        category: "Room & Board",
        quantity: 1,
        date: "2025-01-05",
        provider: "Day Care Unit",
        notes: "Dialysis day care"
      }
    ]
  },
  "P010": {
    patientId: "P010",
    patientName: "Carlos Mendoza",
    admissionDate: "2025-01-04",
    status: "outpatient",
    services: [
      {
        serviceId: "S030",
        service: "MRI",
        category: "Diagnostic Services",
        quantity: 1,
        date: "2025-01-04",
        provider: "Radiology Department",
        notes: "Knee MRI for sports injury"
      },
      {
        serviceId: "S031",
        service: "Specialist Consultation",
        category: "Consultation Services",
        quantity: 1,
        date: "2025-01-04",
        provider: "Dr. Antonio Fernandez - Orthopedic",
        notes: "Orthopedic evaluation"
      }
    ]
  }
};

export class MockEmrService {
  // Get patient services from EMR
  static getPatientServices(patientId: string): PatientService[] {
    const pd = this.getPatientEmrData(patientId);
    if (!pd) return [];
    return pd.services || [];
  }
  
  // Get full patient EMR data
  static getPatientEmrData(patientId: string): PatientEmrData | null {
    if (!patientId) return null;
    const key = String(patientId).trim();
    // direct hit
    if (MOCK_EMR_DATABASE[key]) return MOCK_EMR_DATABASE[key];
    // try uppercase (P###) tolerant lookup
    const up = key.toUpperCase();
    if (MOCK_EMR_DATABASE[up]) return MOCK_EMR_DATABASE[up];

    // fallback: try to find by matching stored patientId case-insensitively
    const found = Object.values(MOCK_EMR_DATABASE).find((v) => String(v.patientId || '').toLowerCase() === key.toLowerCase() || String(v.patientId || '').toLowerCase() === up.toLowerCase());
    if (found) return found as PatientEmrData;

    // last-resort: try to match numeric suffix (e.g., passing db id that contains the P###)
    const suffixMatch = key.match(/p?(\d{1,})$/i);
    if (suffixMatch) {
      const pLike = `P${String(suffixMatch[1]).padStart(3, '0')}`;
      if (MOCK_EMR_DATABASE[pLike]) return MOCK_EMR_DATABASE[pLike];
    }

    return null;
  }
  
  // Check if patient has unbilled services
  static hasUnbilledServices(patientId: string): boolean {
    const services = this.getPatientServices(patientId);
    return Array.isArray(services) && services.length > 0;
  }
  
  // Get patient status
  static getPatientStatus(patientId: string): string {
    const patientData = MOCK_EMR_DATABASE[patientId];
    return patientData?.status || 'unknown';
  }
  
  // Get all patients with services
  static getAllPatientsWithServices(): string[] {
    return Object.keys(MOCK_EMR_DATABASE);
  }
}
