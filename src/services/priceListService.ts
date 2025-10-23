// Price List Service for Hospital Services
// This service maintains the standard pricing for all hospital services

export interface ServicePrice {
  service: string;
  category: string;
  price: number;
  unit: string;
}

export const PRICE_LIST: ServicePrice[] = [
  // Consultation Services
  { service: "General Consultation", category: "Consultation Services", price: 1500, unit: "session" },
  { service: "Specialist Consultation", category: "Consultation Services", price: 2500, unit: "session" },
  { service: "Emergency Consultation", category: "Consultation Services", price: 3000, unit: "session" },
  { service: "Telemedicine Consultation", category: "Consultation Services", price: 1200, unit: "session" },
  
  // Diagnostic Services
  { service: "Blood Test", category: "Diagnostic Services", price: 800, unit: "test" },
  { service: "X-Ray", category: "Diagnostic Services", price: 1500, unit: "image" },
  { service: "CT Scan", category: "Diagnostic Services", price: 8000, unit: "scan" },
  { service: "MRI", category: "Diagnostic Services", price: 12000, unit: "scan" },
  { service: "Ultrasound", category: "Diagnostic Services", price: 2500, unit: "scan" },
  { service: "ECG", category: "Diagnostic Services", price: 800, unit: "test" },
  { service: "Endoscopy", category: "Diagnostic Services", price: 5000, unit: "procedure" },
  
  // Laboratory Services
  { service: "Complete Blood Count", category: "Laboratory Services", price: 500, unit: "test" },
  { service: "Blood Chemistry", category: "Laboratory Services", price: 1200, unit: "test" },
  { service: "Urinalysis", category: "Laboratory Services", price: 300, unit: "test" },
  { service: "Microbiology", category: "Laboratory Services", price: 1500, unit: "test" },
  { service: "Pathology", category: "Laboratory Services", price: 2000, unit: "test" },
  
  // Surgical Services
  { service: "Minor Surgery", category: "Surgical Services", price: 15000, unit: "procedure" },
  { service: "Major Surgery", category: "Surgical Services", price: 50000, unit: "procedure" },
  { service: "Outpatient Surgery", category: "Surgical Services", price: 20000, unit: "procedure" },
  { service: "Emergency Surgery", category: "Surgical Services", price: 60000, unit: "procedure" },
  
  // Therapeutic Services
  { service: "Physical Therapy", category: "Therapeutic Services", price: 1000, unit: "session" },
  { service: "Occupational Therapy", category: "Therapeutic Services", price: 1200, unit: "session" },
  { service: "Speech Therapy", category: "Therapeutic Services", price: 1500, unit: "session" },
  { service: "Chemotherapy", category: "Therapeutic Services", price: 25000, unit: "session" },
  { service: "Dialysis", category: "Therapeutic Services", price: 3500, unit: "session" },
  
  // Room & Board
  { service: "Private Room", category: "Room & Board", price: 3500, unit: "day" },
  { service: "Semi-Private Room", category: "Room & Board", price: 2000, unit: "day" },
  { service: "ICU", category: "Room & Board", price: 8000, unit: "day" },
  { service: "Emergency Room", category: "Room & Board", price: 2500, unit: "day" },
  { service: "Day Care", category: "Room & Board", price: 1500, unit: "day" },
  
  // Pharmacy
  { service: "Prescription Medication", category: "Pharmacy", price: 500, unit: "item" },
  { service: "Over-the-Counter", category: "Pharmacy", price: 200, unit: "item" },
  { service: "Injectable Medication", category: "Pharmacy", price: 800, unit: "dose" },
  { service: "IV Fluids", category: "Pharmacy", price: 600, unit: "bag" },
  
  // Medical Equipment
  { service: "Wheelchair Rental", category: "Medical Equipment", price: 200, unit: "day" },
  { service: "Medical Device Rental", category: "Medical Equipment", price: 500, unit: "day" },
  { service: "Oxygen Tank", category: "Medical Equipment", price: 1000, unit: "day" },
  { service: "CPAP Machine", category: "Medical Equipment", price: 1500, unit: "day" },
];

export class PriceListService {
  // Get price for a specific service
  static getPrice(service: string, category?: string): number {
    const item = PRICE_LIST.find(
      p => p.service === service && (!category || p.category === category)
    );
    return item?.price || 0;
  }
  
  // Get all services in a category
  static getServicesByCategory(category: string): ServicePrice[] {
    return PRICE_LIST.filter(p => p.category === category);
  }
  
  // Search services by name
  static searchServices(query: string): ServicePrice[] {
    const lowerQuery = query.toLowerCase();
    return PRICE_LIST.filter(
      p => p.service.toLowerCase().includes(lowerQuery) ||
           p.category.toLowerCase().includes(lowerQuery)
    );
  }
  
  // Get all categories
  static getAllCategories(): string[] {
    return Array.from(new Set(PRICE_LIST.map(p => p.category)));
  }
  
  // Get formatted price
  static getFormattedPrice(service: string, category?: string): string {
    const price = this.getPrice(service, category);
    return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
