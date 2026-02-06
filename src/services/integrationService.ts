import { integrationManager } from "./integrationManager";

export class IntegrationService {
  static async initialize() {
    try {
      // Fetch backend-provided integration config so frontend uses proxy endpoints
      try {
        const res = await fetch('/api/integration/config');
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.data) {
          const { emr, pharmacy } = body.data;
          // Point frontend services to backend proxy endpoints
          // API keys remain on backend; frontend only calls proxy
          const { configManager } = await import('./configManager');
          configManager.updateEMRConfig({ baseUrl: emr?.baseUrl || '/api/emr' });
          configManager.updatePharmacyConfig({ baseUrl: pharmacy?.baseUrl || '/api/pharmacy' });
        }
      } catch (e) {
        console.warn('IntegrationService: failed to load backend integration config', e);
      }

      await integrationManager.start();
      console.log('Integration services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize integration services:', error);
      throw error;
    }
  }

  static cleanup() {
    integrationManager.stop();
  }
}
