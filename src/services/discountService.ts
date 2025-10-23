// Discount Service - Shared discount management across billing modules
// This service provides discount codes and promotions from the Discount Management module
// It pulls data from the DiscountManagementService (managed by admins)

import { DiscountManagementService, Discount } from './discountManagementService';

export interface DiscountOption {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  category: 'senior' | 'pwd' | 'employee' | 'insurance' | 'promotional' | 'seasonal';
  isActive: boolean;
  conditions?: string;
  applicableServices?: string[];
}

export class DiscountService {
  // Get all active discounts (from admin-managed discount database)
  static getActiveDiscounts(): DiscountOption[] {
    return DiscountManagementService.getActiveDiscounts().map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      type: d.type as 'percentage' | 'fixed',
      value: d.value,
      description: d.description,
      category: d.category,
      isActive: d.isActive,
      conditions: d.conditions,
      applicableServices: d.applicableServices
    }));
  }
  
  // Get discount by code
  static getDiscountByCode(code: string): DiscountOption | null {
    const discount = DiscountManagementService.getDiscountByCode(code);
    if (!discount || !discount.isActive) return null;
    
    return {
      id: discount.id,
      code: discount.code,
      name: discount.name,
      type: discount.type as 'percentage' | 'fixed',
      value: discount.value,
      description: discount.description,
      category: discount.category,
      isActive: discount.isActive,
      conditions: discount.conditions,
      applicableServices: discount.applicableServices
    };
  }
  
  // Get discount by ID
  static getDiscountById(id: string): DiscountOption | null {
    const discount = DiscountManagementService.getDiscountById(id);
    if (!discount || !discount.isActive) return null;
    
    return {
      id: discount.id,
      code: discount.code,
      name: discount.name,
      type: discount.type as 'percentage' | 'fixed',
      value: discount.value,
      description: discount.description,
      category: discount.category,
      isActive: discount.isActive,
      conditions: discount.conditions,
      applicableServices: discount.applicableServices
    };
  }
  
  // Search discounts by name, code, or category
  static searchDiscounts(query: string): DiscountOption[] {
    return DiscountManagementService.searchDiscounts(query)
      .filter(d => d.isActive)
      .map(d => ({
        id: d.id,
        code: d.code,
        name: d.name,
        type: d.type as 'percentage' | 'fixed',
        value: d.value,
        description: d.description,
        category: d.category,
        isActive: d.isActive,
        conditions: d.conditions,
        applicableServices: d.applicableServices
      }));
  }
  
  // Get discounts by category
  static getDiscountsByCategory(category: string): DiscountOption[] {
    return DiscountManagementService.getDiscountsByCategory(category)
      .filter(d => d.isActive)
      .map(d => ({
        id: d.id,
        code: d.code,
        name: d.name,
        type: d.type as 'percentage' | 'fixed',
        value: d.value,
        description: d.description,
        category: d.category,
        isActive: d.isActive,
        conditions: d.conditions,
        applicableServices: d.applicableServices
      }));
  }
  
  // Calculate discount amount
  static calculateDiscount(subtotal: number, discount: DiscountOption): number {
    if (discount.type === 'percentage') {
      return (subtotal * discount.value) / 100;
    } else {
      return discount.value;
    }
  }

  // Validate discount code
  static validateDiscount(code: string): { valid: boolean; message?: string; discount?: DiscountOption } {
    const validation = DiscountManagementService.validateDiscount(code);
    
    if (!validation.valid) {
      return { valid: false, message: validation.message };
    }

    if (validation.discount) {
      const discountOption: DiscountOption = {
        id: validation.discount.id,
        code: validation.discount.code,
        name: validation.discount.name,
        type: validation.discount.type as 'percentage' | 'fixed',
        value: validation.discount.value,
        description: validation.discount.description,
        category: validation.discount.category,
        isActive: validation.discount.isActive,
        conditions: validation.discount.conditions,
        applicableServices: validation.discount.applicableServices
      };
      return { valid: true, discount: discountOption };
    }

    return { valid: false, message: 'Unknown error' };
  }
  
  // Get all categories
  static getCategories(): { value: string; label: string; color: string }[] {
    return [
      { value: 'senior', label: 'Senior Citizen', color: 'bg-blue-100 text-blue-800' },
      { value: 'pwd', label: 'PWD', color: 'bg-green-100 text-green-800' },
      { value: 'employee', label: 'Employee', color: 'bg-purple-100 text-purple-800' },
      { value: 'insurance', label: 'Insurance', color: 'bg-orange-100 text-orange-800' },
      { value: 'promotional', label: 'Promotional', color: 'bg-pink-100 text-pink-800' },
      { value: 'seasonal', label: 'Seasonal', color: 'bg-yellow-100 text-yellow-800' }
    ];
  }
  
  // Get category info
  static getCategoryInfo(category: string): { value: string; label: string; color: string } | null {
    return this.getCategories().find(c => c.value === category) || null;
  }
}
