// Patient Service
// Manages patient records including services and pharmacy purchases

const STORAGE_KEY = 'hospital_patients';

// Initialize with some sample data
const INITIAL_PATIENTS = [
  {
    id: "P001",
    name: "Maria Santos",
    dateOfBirth: "1985-03-15",
    sex: "Female",
    contactNumber: "+63 917 123 4567",
    address: "123 Rizal Street, Quezon City, Metro Manila",
    email: "maria.santos@email.com",
    bloodType: "O+",
    emergencyContact: {
      name: "Juan Santos",
      relationship: "Husband",
      phone: "+63 917 234 5678"
    },
    services: [
      {
        id: "SVC001",
        date: "2025-10-15",
        description: "Clinical Laboratory - Complete Blood Count",
        category: "Laboratory",
        price: 1500,
        attendingPhysician: "Dr. Garcia",
        status: "Completed"
      },
      {
        id: "SVC002",
        date: "2025-10-16",
        description: "X-Ray - Chest PA",
        category: "Radiology",
        price: 2000,
        attendingPhysician: "Dr. Garcia",
        status: "Completed"
      },
      {
        id: "SVC003",
        date: "2025-10-16",
        description: "Consultation - General Medicine",
        category: "Consultation",
        price: 1000,
        attendingPhysician: "Dr. Garcia",
        status: "Completed"
      }
    ],
    medicines: [
      {
        id: "MED001",
        date: "2025-10-16",
        description: "Amoxicillin 500mg",
        quantity: 21,
        unitPrice: 15,
        totalPrice: 315,
        prescribedBy: "Dr. Garcia",
        status: "Dispensed"
      },
      {
        id: "MED002",
        date: "2025-10-16",
        description: "Paracetamol 500mg",
        quantity: 20,
        unitPrice: 5,
        totalPrice: 100,
        prescribedBy: "Dr. Garcia",
        status: "Dispensed"
      }
    ]
  },
  {
    id: "P002",
    name: "Juan Dela Cruz",
    dateOfBirth: "1978-08-22",
    sex: "Male",
    contactNumber: "+63 918 234 5678",
    address: "456 Bonifacio Avenue, Makati City, Metro Manila",
    email: "juan.delacruz@email.com",
    bloodType: "A+",
    emergencyContact: {
      name: "Ana Dela Cruz",
      relationship: "Wife",
      phone: "+63 918 345 6789"
    },
    services: [
      {
        id: "SVC004",
        date: "2025-10-14",
        description: "CT Scan - Brain",
        category: "Radiology",
        price: 5000,
        attendingPhysician: "Dr. Reyes",
        status: "Completed"
      },
      {
        id: "SVC005",
        date: "2025-10-14",
        description: "Room and Board - Private Room (3 days)",
        category: "Accommodation",
        price: 4500,
        attendingPhysician: "Dr. Reyes",
        status: "Completed"
      }
    ],
    medicines: [
      {
        id: "MED003",
        date: "2025-10-14",
        description: "Losartan 50mg",
        quantity: 30,
        unitPrice: 18,
        totalPrice: 540,
        prescribedBy: "Dr. Reyes",
        status: "Dispensed"
      }
    ]
  },
  {
    id: "P003",
    name: "Anna Reyes",
    dateOfBirth: "1992-05-10",
    sex: "Female",
    contactNumber: "+63 919 345 6789",
    address: "789 Luna Street, Manila City, Metro Manila",
    email: "anna.reyes@email.com",
    bloodType: "B+",
    emergencyContact: {
      name: "Pedro Reyes",
      relationship: "Father",
      phone: "+63 919 456 7890"
    },
    services: [
      {
        id: "SVC006",
        date: "2025-10-17",
        description: "Clinical Laboratory - Urinalysis",
        category: "Laboratory",
        price: 800,
        attendingPhysician: "Dr. Mendoza",
        status: "Completed"
      },
      {
        id: "SVC007",
        date: "2025-10-17",
        description: "Ultrasound - Abdomen",
        category: "Radiology",
        price: 2500,
        attendingPhysician: "Dr. Mendoza",
        status: "Completed"
      }
    ],
    medicines: [
      {
        id: "MED004",
        date: "2025-10-17",
        description: "Omeprazole 20mg",
        quantity: 14,
        unitPrice: 12,
        totalPrice: 168,
        prescribedBy: "Dr. Mendoza",
        status: "Dispensed"
      },
      {
        id: "MED005",
        date: "2025-10-17",
        description: "Buscopan 10mg",
        quantity: 10,
        unitPrice: 25,
        totalPrice: 250,
        prescribedBy: "Dr. Mendoza",
        status: "Dispensed"
      }
    ]
  }
];

class PatientService {
  constructor() {
    this.loadInitialData();
  }

  loadInitialData() {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
    }
  }

  getAllPatients() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  getPatient(patientId) {
    const patients = this.getAllPatients();
    return patients.find(p => p.id === patientId);
  }

  addPatient(patient) {
    const patients = this.getAllPatients();
    const newPatient = {
      ...patient,
      id: patient.id || `P${String(patients.length + 1).padStart(3, '0')}`,
      services: patient.services || [],
      medicines: patient.medicines || []
    };
    patients.push(newPatient);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    return newPatient;
  }

  updatePatient(patientId, updatedData) {
    const patients = this.getAllPatients();
    const index = patients.findIndex(p => p.id === patientId);
    if (index !== -1) {
      patients[index] = { ...patients[index], ...updatedData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
      return patients[index];
    }
    return null;
  }

  deletePatient(patientId) {
    const patients = this.getAllPatients();
    const filtered = patients.filter(p => p.id !== patientId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  addService(patientId, service) {
    const patient = this.getPatient(patientId);
    if (!patient) return null;

    const newService = {
      ...service,
      id: service.id || `SVC${String(Date.now()).slice(-6)}`,
      date: service.date || new Date().toISOString().split('T')[0],
      status: service.status || 'Completed'
    };

    patient.services = patient.services || [];
    patient.services.push(newService);
    this.updatePatient(patientId, patient);
    return newService;
  }

  addMedicine(patientId, medicine) {
    const patient = this.getPatient(patientId);
    if (!patient) return null;

    const newMedicine = {
      ...medicine,
      id: medicine.id || `MED${String(Date.now()).slice(-6)}`,
      date: medicine.date || new Date().toISOString().split('T')[0],
      status: medicine.status || 'Dispensed',
      totalPrice: medicine.totalPrice || (medicine.quantity * medicine.unitPrice)
    };

    patient.medicines = patient.medicines || [];
    patient.medicines.push(newMedicine);
    this.updatePatient(patientId, patient);
    return newMedicine;
  }

  getPatientTotalCharges(patientId) {
    const patient = this.getPatient(patientId);
    if (!patient) return { services: 0, medicines: 0, total: 0 };

    const servicesTotal = (patient.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
    const medicinesTotal = (patient.medicines || []).reduce((sum, m) => sum + (m.totalPrice || 0), 0);
    
    // Calculate VAT on medicines only (12%)
    const medicinesVAT = medicinesTotal * 0.12;

    return {
      services: servicesTotal,
      medicines: medicinesTotal,
      medicinesVAT: medicinesVAT,
      subtotal: servicesTotal + medicinesTotal,
      total: servicesTotal + medicinesTotal + medicinesVAT
    };
  }

  searchPatients(query) {
    const patients = this.getAllPatients();
    const lowerQuery = query.toLowerCase();
    return patients.filter(p => 
      p.id.toLowerCase().includes(lowerQuery) ||
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.contactNumber && p.contactNumber.includes(query))
    );
  }

  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}

export const patientService = new PatientService();
