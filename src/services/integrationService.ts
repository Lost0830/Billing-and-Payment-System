import { integrationManager } from "./integrationManager";

export class IntegrationService {
  static async initialize() {
    try {
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