import { IntegrationConfig, defaultConfig } from './integrationConfig';

// Configuration Manager for runtime updates
export class ConfigManager {
  private config: IntegrationConfig = { ...defaultConfig };
  private listeners: ((config: IntegrationConfig) => void)[] = [];

  constructor() {
    // Load configuration from localStorage if available
    this.loadFromStorage();

    // Ensure default integration endpoints use backend proxy when not explicitly configured
    // This lets front-end "Test Connection" use /api/emr and /api/pharmacy by default.
    try {
      if (!this.config.emr?.baseUrl || this.config.emr.baseUrl.trim() === '') {
        this.config.emr.baseUrl = '/api/emr';
      }
      if (!this.config.pharmacy?.baseUrl || this.config.pharmacy.baseUrl.trim() === '') {
        this.config.pharmacy.baseUrl = '/api/pharmacy';
      }
    } catch (e) {
      // ignore and keep existing defaults
    }
  }

  // Get current configuration
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  // Update EMR configuration
  updateEMRConfig(updates: Partial<IntegrationConfig['emr']>): void {
    this.config.emr = { ...this.config.emr, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  // Update Pharmacy configuration
  updatePharmacyConfig(updates: Partial<IntegrationConfig['pharmacy']>): void {
    this.config.pharmacy = { ...this.config.pharmacy, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  // Update Billing configuration
  updateBillingConfig(updates: Partial<IntegrationConfig['billing']>): void {
    this.config.billing = { ...this.config.billing, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  // Reset to default configuration
  resetToDefaults(): void {
    this.config = { ...defaultConfig };
    this.saveToStorage();
    this.notifyListeners();
  }

  // Validate configuration
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // EMR validation
    if (!this.config.emr.baseUrl) {
      errors.push('EMR Base URL is required');
    } else if (!this.isValidUrl(this.config.emr.baseUrl)) {
      errors.push('EMR Base URL is not valid');
    }

    // When using backend proxy endpoints (baseUrl starts with /api), API key is managed server-side
    if (!this.config.emr.baseUrl.startsWith('/api')) {
      if (!this.config.emr.apiKey || this.config.emr.apiKey === 'YOUR_EMR_API_KEY_HERE') {
        errors.push('EMR API Key is required');
      }
    }

    // Pharmacy validation
    if (!this.config.pharmacy.baseUrl) {
      errors.push('Pharmacy Base URL is required');
    } else if (!this.isValidUrl(this.config.pharmacy.baseUrl)) {
      errors.push('Pharmacy Base URL is not valid');
    }

    if (!this.config.pharmacy.baseUrl.startsWith('/api')) {
      if (!this.config.pharmacy.apiKey || this.config.pharmacy.apiKey === 'YOUR_PHARMACY_API_KEY_HERE') {
        errors.push('Pharmacy API Key is required');
      }
    }

    // Billing validation
    if (this.config.billing.taxRate < 0 || this.config.billing.taxRate > 1) {
      errors.push('Tax rate must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Test configuration by attempting connections
  async testConfiguration(): Promise<{
    emr: { success: boolean; error?: string };
    pharmacy: { success: boolean; error?: string };
  }> {
    const results = {
      emr: { success: false, error: undefined as string | undefined },
      pharmacy: { success: false, error: undefined as string | undefined }
    };

    // Helper: fetch with timeout using AbortController (compatible fallback)
    const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = 10000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(id);
      }
    };

    // Test EMR connection
    try {
      const emrUrl = `${this.config.emr.baseUrl.replace(/\/$/, '')}/health`;
      const emrResponse = await fetchWithTimeout(emrUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.emr.apiKey}`,
          'Content-Type': 'application/json'
        }
      }, this.config.emr.timeout);
      
      results.emr.success = emrResponse.ok;
      if (!emrResponse.ok) {
        results.emr.error = `HTTP ${emrResponse.status}: ${emrResponse.statusText}`;
      }
    } catch (error) {
      results.emr.error = error instanceof Error ? error.message : 'Connection failed';
    }

    // Test Pharmacy connection
    try {
      const pharmacyUrl = `${this.config.pharmacy.baseUrl.replace(/\/$/, '')}/health`;
      const pharmacyResponse = await fetchWithTimeout(pharmacyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.pharmacy.apiKey}`,
          'Content-Type': 'application/json'
        }
      }, this.config.pharmacy.timeout);
      
      results.pharmacy.success = pharmacyResponse.ok;
      if (!pharmacyResponse.ok) {
        results.pharmacy.error = `HTTP ${pharmacyResponse.status}: ${pharmacyResponse.statusText}`;
      }
    } catch (error) {
      results.pharmacy.error = error instanceof Error ? error.message : 'Connection failed';
    }

    return results;
  }

  // Add configuration change listener
  addListener(callback: (config: IntegrationConfig) => void): void {
    this.listeners.push(callback);
  }

  // Remove configuration change listener
  removeListener(callback: (config: IntegrationConfig) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Export configuration for backup
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // Import configuration from backup
  importConfig(configJson: string): { success: boolean; error?: string } {
    try {
      const importedConfig = JSON.parse(configJson) as IntegrationConfig;
      
      // Validate structure
      if (!this.isValidConfigStructure(importedConfig)) {
        return { success: false, error: 'Invalid configuration structure' };
      }

      this.config = importedConfig;
      this.saveToStorage();
      this.notifyListeners();
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to parse configuration' 
      };
    }
  }

  // Private methods
  private saveToStorage(): void {
    try {
      localStorage.setItem('hims_integration_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save configuration to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('hims_integration_config');
      if (stored) {
        const parsedConfig = JSON.parse(stored) as IntegrationConfig;
        if (this.isValidConfigStructure(parsedConfig)) {
          this.config = parsedConfig;
        }
      }
    } catch (error) {
      console.warn('Failed to load configuration from localStorage:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getConfig());
      } catch (error) {
        console.error('Error in configuration listener:', error);
      }
    });
  }

  private isValidUrl(url: string): boolean {
    if (!url) return false;
    // Accept relative proxy paths (e.g. /api/...) and absolute URLs
    if (url.startsWith('/')) return true;
    try {
      // Try parsing absolute URL
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidConfigStructure(config: any): boolean {
    return (
      config &&
      typeof config === 'object' &&
      config.emr &&
      config.pharmacy &&
      config.billing &&
      typeof config.emr.baseUrl === 'string' &&
      typeof config.emr.apiKey === 'string' &&
      typeof config.pharmacy.baseUrl === 'string' &&
      typeof config.pharmacy.apiKey === 'string' &&
      typeof config.billing.currency === 'string'
    );
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
