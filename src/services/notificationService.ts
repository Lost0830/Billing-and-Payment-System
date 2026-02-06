// Notification Service for real-time notifications
export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source?: 'payment' | 'invoice' | 'integration' | 'system';
  actionUrl?: string;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private lastInvoiceCount: number = 0;
  private lastPaymentCount: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;

  // Subscribe to notification updates
  subscribe(callback: (notifications: Notification[]) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(callback => callback([...this.notifications]));
  }

  // Add a notification
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    
    this.notifications.unshift(newNotification); // Add to beginning
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
    
    this.notify();
    return newNotification.id;
  }

  // Mark notification as read
  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notify();
    }
  }

  // Mark all as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notify();
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.notify();
  }

  // Start polling for new invoices/payments
  startPolling(apiUrl: string = 'http://localhost:5002/api', interval: number = 5000) {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.pollingInterval = setInterval(async () => {
      try {
        // Check for new invoices
        const invoicesRes = await fetch(`${apiUrl}/invoices/combined`);
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          const currentInvoiceCount = invoicesData?.data?.length || 0;
          
          if (this.lastInvoiceCount > 0 && currentInvoiceCount > this.lastInvoiceCount) {
            const newCount = currentInvoiceCount - this.lastInvoiceCount;
            this.addNotification({
              type: 'info',
              title: 'New Invoice Available',
              message: `${newCount} new invoice${newCount > 1 ? 's' : ''} ${newCount > 1 ? 'are' : 'is'} available for processing.`,
              source: 'invoice',
              actionUrl: 'invoice',
            });
          }
          
          this.lastInvoiceCount = currentInvoiceCount;
        }

        // Check for new payments
        const paymentsRes = await fetch(`${apiUrl}/payments`);
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          const currentPaymentCount = Array.isArray(paymentsData) ? paymentsData.length : (paymentsData?.data?.length || 0);
          
          if (this.lastPaymentCount > 0 && currentPaymentCount > this.lastPaymentCount) {
            const newCount = currentPaymentCount - this.lastPaymentCount;
            this.addNotification({
              type: 'success',
              title: 'New Payment Recorded',
              message: `${newCount} new payment${newCount > 1 ? 's' : ''} ${newCount > 1 ? 'have' : 'has'} been recorded.`,
              source: 'payment',
              actionUrl: 'history',
            });
          }
          
          this.lastPaymentCount = currentPaymentCount;
        }

        // Check integration status
        await this.checkIntegrationStatus(apiUrl);
      } catch (error) {
        console.warn('Polling error:', error);
      }
    }, interval);
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  // Check integration status
  private async checkIntegrationStatus(apiUrl: string) {
    try {
      // Check EMR connection
      const emrRes = await fetch(`${apiUrl}/emr/appointments?limit=1`);
      if (emrRes.ok) {
        // EMR is connected
        const wasConnected = this.notifications.some(n => 
          n.message.includes('EMR system connected') && !n.read
        );
        if (!wasConnected) {
          this.addNotification({
            type: 'success',
            title: 'EMR System Connected',
            message: 'Successfully connected to EMR system. Appointments are now available.',
            source: 'integration',
          });
        }
      }

      // Check Pharmacy connection
      const pharmRes = await fetch(`${apiUrl}/pharmacy/sales?limit=1`);
      if (pharmRes.ok) {
        // Pharmacy is connected
        const wasConnected = this.notifications.some(n => 
          n.message.includes('Pharmacy system connected') && !n.read
        );
        if (!wasConnected) {
          this.addNotification({
            type: 'success',
            title: 'Pharmacy System Connected',
            message: 'Successfully connected to Pharmacy system. Sales data is now available.',
            source: 'integration',
          });
        }
      }
    } catch (error) {
      // Integration check failed - don't spam notifications
    }
  }

  // Initialize counts (call this when component mounts)
  async initializeCounts(apiUrl: string = 'http://localhost:5002/api') {
    try {
      const [invoicesRes, paymentsRes] = await Promise.all([
        fetch(`${apiUrl}/invoices/combined`),
        fetch(`${apiUrl}/payments`),
      ]);

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        this.lastInvoiceCount = invoicesData?.data?.length || 0;
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        this.lastPaymentCount = Array.isArray(paymentsData) ? paymentsData.length : (paymentsData?.data?.length || 0);
      }
    } catch (error) {
      console.warn('Failed to initialize counts:', error);
    }
  }
}

export const notificationService = new NotificationService();

