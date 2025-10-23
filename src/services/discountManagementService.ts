// Discount Management Service - Admin-only discount CRUD operations
// This service manages the master discount database that cashiers can apply

export interface Discount {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed' | 'service';
  value: number;
  description: string;
  category: 'senior' | 'pwd' | 'employee' | 'insurance' | 'promotional' | 'seasonal';
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  applicableServices?: string[];
  conditions?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountCode: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  targetAudience: string;
  bannerImage?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiscountApplication {
  id: string;
  discountCode: string;
  patientId: string;
  patientName: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedDate: string;
  invoiceNumber: string;
  status: 'pending' | 'approved' | 'applied';
  appliedBy?: string;
}

const STORAGE_KEY_DISCOUNTS = 'hospital_discounts';
const STORAGE_KEY_PROMOTIONS = 'hospital_promotions';
const STORAGE_KEY_APPLICATIONS = 'hospital_discount_applications';

// Default/Initial discounts
const DEFAULT_DISCOUNTS: Discount[] = [
  {
    id: "1",
    code: "SENIOR20",
    name: "Senior Citizen Discount",
    type: "percentage",
    value: 20,
    description: "20% discount for senior citizens (60 years and above)",
    category: "senior",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    isActive: true,
    usageCount: 145,
    conditions: "Valid ID required. Cannot be combined with other offers.",
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "2",
    code: "PWD20",
    name: "PWD Discount",
    type: "percentage",
    value: 20,
    description: "20% discount for Persons with Disabilities",
    category: "pwd",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    isActive: true,
    usageCount: 89,
    conditions: "Valid PWD ID required.",
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "3",
    code: "EMP15",
    name: "Employee Discount",
    type: "percentage",
    value: 15,
    description: "15% discount for hospital employees and their families",
    category: "employee",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    isActive: true,
    usageCount: 67,
    conditions: "Valid employee ID required.",
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "4",
    code: "NEWYEAR2025",
    name: "New Year Health Check",
    type: "percentage",
    value: 30,
    description: "30% off all diagnostic tests for January",
    category: "seasonal",
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    isActive: true,
    usageCount: 23,
    maxUsage: 100,
    applicableServices: ["Blood Test", "X-Ray", "ECG", "Ultrasound"],
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "5",
    code: "INSURANCE",
    name: "Insurance Coverage",
    type: "percentage",
    value: 0,
    description: "Variable insurance coverage discount",
    category: "insurance",
    isActive: true,
    usageCount: 234,
    conditions: "Insurance company authorization required.",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "6",
    code: "CHARITY50",
    name: "Charity Care",
    type: "percentage",
    value: 50,
    description: "50% discount for charity care patients",
    category: "promotional",
    isActive: true,
    usageCount: 45,
    conditions: "Social worker approval required.",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "7",
    code: "PROMPT5",
    name: "Prompt Payment Discount",
    type: "percentage",
    value: 5,
    description: "5% discount for immediate payment",
    category: "promotional",
    isActive: true,
    usageCount: 178,
    conditions: "Payment must be made within 24 hours of invoice.",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  }
];

const DEFAULT_PROMOTIONS: Promotion[] = [
  {
    id: "1",
    title: "New Year Health Package",
    description: "Start your year right with our comprehensive health check package at 30% off!",
    discountCode: "NEWYEAR2025",
    validFrom: "2025-01-01",
    validTo: "2025-01-31",
    isActive: true,
    targetAudience: "General Public",
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  },
  {
    id: "2",
    title: "Valentine's Couple Checkup",
    description: "Bring your loved one for a health screening and save 25% on both consultations.",
    discountCode: "VALENTINE25",
    validFrom: "2025-02-01",
    validTo: "2025-02-28",
    isActive: false,
    targetAudience: "Couples",
    createdBy: "System",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  }
];

export class DiscountManagementService {
  // Initialize storage with default data if empty
  static initialize(): void {
    if (!localStorage.getItem(STORAGE_KEY_DISCOUNTS)) {
      localStorage.setItem(STORAGE_KEY_DISCOUNTS, JSON.stringify(DEFAULT_DISCOUNTS));
    }
    if (!localStorage.getItem(STORAGE_KEY_PROMOTIONS)) {
      localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(DEFAULT_PROMOTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEY_APPLICATIONS)) {
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify([]));
    }
  }

  // ========== DISCOUNT CRUD OPERATIONS ==========

  // Get all discounts
  static getAllDiscounts(): Discount[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEY_DISCOUNTS);
    return data ? JSON.parse(data) : [];
  }

  // Get discount by ID
  static getDiscountById(id: string): Discount | null {
    const discounts = this.getAllDiscounts();
    return discounts.find(d => d.id === id) || null;
  }

  // Get discount by code
  static getDiscountByCode(code: string): Discount | null {
    const discounts = this.getAllDiscounts();
    return discounts.find(d => d.code.toLowerCase() === code.toLowerCase()) || null;
  }

  // Get active discounts only
  static getActiveDiscounts(): Discount[] {
    return this.getAllDiscounts().filter(d => d.isActive);
  }

  // Create new discount
  static createDiscount(discount: Omit<Discount, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>, createdBy: string = 'Admin'): Discount {
    const discounts = this.getAllDiscounts();
    
    // Check if code already exists
    if (discounts.some(d => d.code.toLowerCase() === discount.code.toLowerCase())) {
      throw new Error(`Discount code "${discount.code}" already exists`);
    }

    const newDiscount: Discount = {
      ...discount,
      id: Date.now().toString(),
      usageCount: 0,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    discounts.push(newDiscount);
    localStorage.setItem(STORAGE_KEY_DISCOUNTS, JSON.stringify(discounts));
    // Notify listeners that discounts changed
    try {
      window.dispatchEvent(new CustomEvent('discounts-updated', { detail: { action: 'create', discount: newDiscount } }));
    } catch (e) {
      // server-side or non-window environment: ignore
    }
    return newDiscount;
  }

  // Update discount
  static updateDiscount(id: string, updates: Partial<Discount>, updatedBy: string = 'Admin'): Discount | null {
    const discounts = this.getAllDiscounts();
    const index = discounts.findIndex(d => d.id === id);
    
    if (index === -1) return null;

    // If updating code, check for duplicates
    if (updates.code && updates.code !== discounts[index].code) {
      if (discounts.some(d => d.id !== id && d.code.toLowerCase() === updates.code!.toLowerCase())) {
        throw new Error(`Discount code "${updates.code}" already exists`);
      }
    }

    discounts[index] = {
      ...discounts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY_DISCOUNTS, JSON.stringify(discounts));
    try {
      window.dispatchEvent(new CustomEvent('discounts-updated', { detail: { action: 'update', discount: discounts[index] } }));
    } catch (e) {}
    return discounts[index];
  }

  // Delete discount
  static deleteDiscount(id: string): boolean {
    const discounts = this.getAllDiscounts();
    const filteredDiscounts = discounts.filter(d => d.id !== id);
    
    if (filteredDiscounts.length === discounts.length) return false;
    
    localStorage.setItem(STORAGE_KEY_DISCOUNTS, JSON.stringify(filteredDiscounts));
    try {
      window.dispatchEvent(new CustomEvent('discounts-updated', { detail: { action: 'delete', id } }));
    } catch (e) {}
    return true;
  }

  // Toggle discount status
  static toggleDiscountStatus(id: string): Discount | null {
    const discount = this.getDiscountById(id);
    if (!discount) return null;
    
    return this.updateDiscount(id, { isActive: !discount.isActive });
    // toggleDiscountStatus will trigger update event via updateDiscount
  }

  // Increment usage count
  static incrementUsageCount(code: string): void {
    const discounts = this.getAllDiscounts();
    const discount = discounts.find(d => d.code.toLowerCase() === code.toLowerCase());
    
    if (discount) {
      discount.usageCount = (discount.usageCount || 0) + 1;
      localStorage.setItem(STORAGE_KEY_DISCOUNTS, JSON.stringify(discounts));
    }
  }

  // Search discounts
  static searchDiscounts(query: string): Discount[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllDiscounts().filter(d => 
      d.name.toLowerCase().includes(lowerQuery) ||
      d.code.toLowerCase().includes(lowerQuery) ||
      d.category.toLowerCase().includes(lowerQuery) ||
      d.description.toLowerCase().includes(lowerQuery)
    );
  }

  // Filter by category
  static getDiscountsByCategory(category: string): Discount[] {
    if (category === 'all') return this.getAllDiscounts();
    return this.getAllDiscounts().filter(d => d.category === category);
  }

  // ========== PROMOTION CRUD OPERATIONS ==========

  // Get all promotions
  static getAllPromotions(): Promotion[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEY_PROMOTIONS);
    return data ? JSON.parse(data) : [];
  }

  // Get promotion by ID
  static getPromotionById(id: string): Promotion | null {
    const promotions = this.getAllPromotions();
    return promotions.find(p => p.id === id) || null;
  }

  // Get active promotions
  static getActivePromotions(): Promotion[] {
    return this.getAllPromotions().filter(p => p.isActive);
  }

  // Create new promotion
  static createPromotion(promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string = 'Admin'): Promotion {
    const promotions = this.getAllPromotions();
    
    const newPromotion: Promotion = {
      ...promotion,
      id: Date.now().toString(),
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    promotions.push(newPromotion);
    localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(promotions));
    
    return newPromotion;
  }

  // Update promotion
  static updatePromotion(id: string, updates: Partial<Promotion>): Promotion | null {
    const promotions = this.getAllPromotions();
    const index = promotions.findIndex(p => p.id === id);
    
    if (index === -1) return null;

    promotions[index] = {
      ...promotions[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(promotions));
    return promotions[index];
  }

  // Delete promotion
  static deletePromotion(id: string): boolean {
    const promotions = this.getAllPromotions();
    const filteredPromotions = promotions.filter(p => p.id !== id);
    
    if (filteredPromotions.length === promotions.length) return false;
    
    localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(filteredPromotions));
    return true;
  }

  // Toggle promotion status
  static togglePromotionStatus(id: string): Promotion | null {
    const promotion = this.getPromotionById(id);
    if (!promotion) return null;
    
    return this.updatePromotion(id, { isActive: !promotion.isActive });
  }

  // ========== DISCOUNT APPLICATION TRACKING ==========

  // Get all applications
  static getAllApplications(): DiscountApplication[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEY_APPLICATIONS);
    return data ? JSON.parse(data) : [];
  }

  // Record discount application
  static recordApplication(application: Omit<DiscountApplication, 'id' | 'appliedDate' | 'status'>, appliedBy: string = 'Cashier'): DiscountApplication {
    const applications = this.getAllApplications();
    
    const newApplication: DiscountApplication = {
      ...application,
      id: Date.now().toString(),
      appliedDate: new Date().toISOString(),
      status: 'applied',
      appliedBy
    };

    applications.push(newApplication);
    localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(applications));
    
    // Increment usage count
    this.incrementUsageCount(application.discountCode);
    
    return newApplication;
  }

  // Get applications by patient
  static getApplicationsByPatient(patientId: string): DiscountApplication[] {
    return this.getAllApplications().filter(a => a.patientId === patientId);
  }

  // Get applications by discount code
  static getApplicationsByCode(code: string): DiscountApplication[] {
    return this.getAllApplications().filter(a => a.discountCode.toLowerCase() === code.toLowerCase());
  }

  // ========== UTILITY FUNCTIONS ==========

  // Calculate discount amount
  static calculateDiscount(subtotal: number, discount: Discount): number {
    if (discount.type === 'percentage') {
      return (subtotal * discount.value) / 100;
    } else {
      return discount.value;
    }
  }

  // Validate discount (check if can be used)
  static validateDiscount(code: string): { valid: boolean; message?: string; discount?: Discount } {
    const discount = this.getDiscountByCode(code);
    
    if (!discount) {
      return { valid: false, message: 'Discount code not found' };
    }

    if (!discount.isActive) {
      return { valid: false, message: 'Discount code is inactive' };
    }

    const now = new Date();
    const startDate = new Date(discount.startDate);
    const endDate = new Date(discount.endDate);

    if (now < startDate) {
      return { valid: false, message: 'Discount not yet valid' };
    }

    if (now > endDate) {
      return { valid: false, message: 'Discount has expired' };
    }

    if (discount.maxUsage && discount.usageCount >= discount.maxUsage) {
      return { valid: false, message: 'Discount usage limit reached' };
    }

    return { valid: true, discount };
  }

  // Get statistics
  static getStatistics() {
    const discounts = this.getAllDiscounts();
    const promotions = this.getAllPromotions();
    const applications = this.getAllApplications();

    return {
      totalDiscounts: discounts.length,
      activeDiscounts: discounts.filter(d => d.isActive).length,
      inactiveDiscounts: discounts.filter(d => !d.isActive).length,
      totalPromotions: promotions.length,
      activePromotions: promotions.filter(p => p.isActive).length,
      totalUsage: discounts.reduce((sum, d) => sum + d.usageCount, 0),
      totalApplications: applications.length,
      totalDiscountAmount: applications.reduce((sum, a) => sum + a.discountAmount, 0)
    };
  }

  // Reset to defaults (for testing/demo)
  static resetToDefaults(): void {
    localStorage.setItem(STORAGE_KEY_DISCOUNTS, JSON.stringify(DEFAULT_DISCOUNTS));
    localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(DEFAULT_PROMOTIONS));
    localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify([]));
  }

  // Export data
  static exportData() {
    return {
      discounts: this.getAllDiscounts(),
      promotions: this.getAllPromotions(),
      applications: this.getAllApplications()
    };
  }
}

// Initialize on load
DiscountManagementService.initialize();
