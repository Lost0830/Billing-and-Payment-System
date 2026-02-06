import { Search, Receipt, Eye, CreditCard, Badge as BadgeIcon, AlertCircle, CheckCircle, Clock, Send, Bell } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner";
import axios from "axios";
import { useEffect, useState } from "react";
import { fetchInvoices, fetchPayments, fetchPatients } from "../services/api.js";
import { billingService } from "../services/billingService";
import { resolvePatientDisplay } from "../utils/patientId";
import { emrService } from "../services/emrIntegration";
import { pharmacyService } from "../services/pharmacyIntegration";
import { soundNotification } from "../utils/soundUtils";
import { TransactionRecord } from "./TransactionRecord";

interface CashierInvoiceViewProps {
  onNavigateToView: (view: string) => void;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  category: string;
}

interface Invoice {
  id: string;
  number: string;
  patientName: string;
  patientId: string;
  internalPatientId?: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'pending';
  subtotal: number;
  discount: number;
  discountType?: string;
  discountPercentage?: number;
  total: number;
  items: InvoiceItem[];
  generatedBy?: string;
  generatedAt?: string;
  notes?: string;
  tax?: number;
  _id?: string;
  accountId?: string;
  invoiceNumber?: string;
  createdAt?: string;
}

const API_BASE = "http://localhost:5002/api";

export function CashierInvoiceView({ onNavigateToView }: CashierInvoiceViewProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingEmrPharmacy, setFetchingEmrPharmacy] = useState(false);
  const [emrServices, setEmrServices] = useState<any[]>([]);
  const [pharmacyData, setPharmacyData] = useState<any[]>([]);
  const [sourceType, setSourceType] = useState<'admin' | 'emr' | 'pharmacy' | null>(null);
  const [previousInvoiceCount, setPreviousInvoiceCount] = useState(0);
  const [previousEmrCount, setPreviousEmrCount] = useState(0);
  const [previousPharmacyCount, setPreviousPharmacyCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'invoice' | 'emr' | 'pharmacy'; timestamp: Date }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchInvoicesData = async () => {
    try {
      // Try combined endpoint first (includes sales and appointments), fallback to regular invoices
      const [invRes, payRes, patRes] = await Promise.all([
        axios.get(`${API_BASE}/invoices/combined`).catch(() => 
          axios.get(`${API_BASE}/invoices`).catch(() => ({ data: [] }))
        ),
        axios.get(`${API_BASE}/payments`).catch(() => ({ data: [] })),
        fetchPatients().catch(() => [])
      ]);

      const invPayload: any = invRes?.data;
      const payPayload: any = payRes?.data;

      const paymentsArray: any[] = Array.isArray(payPayload) ? payPayload : (payPayload?.data || []);
      let invList: any[] = Array.isArray(invPayload) ? invPayload : (invPayload?.data || []);

      const normalized = invList.map((inv: any) => {
        const id = inv._id || inv.id;
        const number = inv.number || inv.invoiceNumber || `INV-${id?.toString().slice(-6) || Date.now()}`;

        const matchingPayment = paymentsArray.find((p: any) =>
          (p.invoiceId && id && String(p.invoiceId) === String(id)) ||
          (p.invoiceNumber && number && String(p.invoiceNumber) === String(number)) ||
          (p.invoiceNo && number && String(p.invoiceNo) === String(number))
        );

        // Determine status from invoice, checking for paid status
        let status = (inv.status || inv.state || "unpaid").toString().toLowerCase();
        
        // If there's a matching payment marked as completed/paid, mark invoice as paid
        if (matchingPayment && (matchingPayment.status === 'completed' || matchingPayment.status === 'paid')) {
          status = 'paid';
        }
        
        // If invoice status is still unpaid/draft/sent, show as pending
        const finalStatus = status === "paid" || status === "completed" ? "paid"
          : status === "draft" || status === "unpaid" || status === "sent" ? "pending"
          : status;

        // Use patientNumber if available, otherwise keep internal ID for matching but don't display it
        let displayPatientId = inv.patientNumber || inv.accountId || "N/A";
        
        // If patientNumber/accountId not set, try to generate a friendly one from the raw patientId
        if (displayPatientId === "N/A" && inv.patientId) {
          // Check if the patientId looks like a hash/ObjectID (not friendly like P001)
          if (!/^P\d{3,}$/i.test(inv.patientId)) {
            displayPatientId = ""; // Empty string to hide it
          } else {
            displayPatientId = inv.patientId;
          }
        }

        return {
          id,
          number,
          patientName: inv.patientName || inv.patient || "Unknown",
          patientId: displayPatientId,
          internalPatientId: inv.patientId, // Keep original for lookups
          date: inv.date || inv.issuedDate || new Date().toISOString(),
          dueDate: inv.dueDate || new Date().toISOString(),
          status: finalStatus,
          subtotal: inv.subtotal || (inv.total || 0) - (inv.tax || 0) - (inv.discount || 0) || 0,
          discount: inv.discount || 0,
          discountType: inv.discountType || "none",
          discountPercentage: inv.discountPercentage || 0,
          tax: inv.tax || inv.vat || 0,
          total: inv.total || inv.amount || 0,
          items: inv.items || [],
          generatedBy: inv.generatedBy || "Billing Department",
          generatedAt: inv.generatedAt || inv.date || new Date().toISOString(),
          notes: inv.notes || "",
          createdAt: inv.createdAt || new Date().toISOString(),
        } as Invoice;
      });

      // Keep patients for resolvePatientDisplay
      const patList = Array.isArray(patRes) ? patRes : (patRes as any)?.data || [];
      setPatients(patList);

      // Filter out archived invoices and paid invoices - only show pending ones for cashier
      // Paid invoices should only appear in Payment Processing section
      const activeInvoices = normalized.filter(inv => {
        const isNotArchived = !inv.createdAt || !inv.createdAt.includes('archived');
        const isPending = inv.status === 'pending' || inv.status === 'draft' || inv.status === 'sent';
        return isNotArchived && isPending;
      });
      
      // Enhance invoices with patient display names if available
      const enhancedInvoices = activeInvoices.map(inv => {
        // Try to find patient in the list and get display ID
        if (patList.length > 0 && (!inv.patientId || inv.patientId === "N/A")) {
          const patientObj = patList.find((p: any) => {
            const internalKey = p.id || p._id;
            return String(internalKey) === String(inv.patientId);
          });
          if (patientObj) {
            const displayId = patientObj.patientId || `P${patList.indexOf(patientObj) + 1}`;
            inv.patientId = displayId;
          }
        }
        return inv;
      });
      setInvoices(enhancedInvoices);
      
      // Check for new invoices from admin system
      if (previousInvoiceCount > 0 && activeInvoices.length > previousInvoiceCount) {
        const newCount = activeInvoices.length - previousInvoiceCount;
        const message = `${newCount} new invoice${newCount > 1 ? 's' : ''} received from Admin system`;
        
        // Play sound notification for new invoice
        soundNotification.playInvoiceAlert().catch(e => console.warn('Sound notification failed:', e));
        
        toast.success(`📄 ${message}`, { duration: 5000 });
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message,
          type: 'invoice',
          timestamp: new Date()
        }]);
      }
      setPreviousInvoiceCount(activeInvoices.length);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
      setLoading(false);
    }
  };

  const checkExternalInvoices = async () => {
    try {
      // Fetch EMR services
      let emrCount = 0;
      try {
        const emrSvcs = await emrService.getAppointments();
        emrCount = emrSvcs.filter((apt: any) => apt.status !== 'cancelled').length;
        
        if (previousEmrCount > 0 && emrCount > previousEmrCount) {
          const newCount = emrCount - previousEmrCount;
          const message = `${newCount} new service${newCount > 1 ? 's' : ''} available from EMR system`;
          
          // Play sound notification for new EMR service
          soundNotification.playInvoiceAlert().catch(e => console.warn('Sound notification failed:', e));
          
          toast.success(`🏥 ${message}`, { duration: 5000 });
          setNotifications(prev => [...prev, {
            id: Date.now().toString() + '-emr',
            message,
            type: 'emr',
            timestamp: new Date()
          }]);
        }
        setPreviousEmrCount(emrCount);
      } catch (e) {
        console.warn('Failed to check EMR services', e);
      }

      // Fetch Pharmacy transactions
      let pharmacyCount = 0;
      try {
        const pharmTxns = await pharmacyService.getTransactions('');
        pharmacyCount = Array.isArray(pharmTxns) ? pharmTxns.length : 0;
        
        if (previousPharmacyCount > 0 && pharmacyCount > previousPharmacyCount) {
          const newCount = pharmacyCount - previousPharmacyCount;
          const message = `${newCount} new transaction${newCount > 1 ? 's' : ''} available from Pharmacy system`;
          
          // Play sound notification for new pharmacy transaction
          soundNotification.playInvoiceAlert().catch(e => console.warn('Sound notification failed:', e));
          
          toast.success(`💊 ${message}`, { duration: 5000 });
          setNotifications(prev => [...prev, {
            id: Date.now().toString() + '-pharmacy',
            message,
            type: 'pharmacy',
            timestamp: new Date()
          }]);
        }
        setPreviousPharmacyCount(pharmacyCount);
      } catch (e) {
        console.warn('Failed to check pharmacy data', e);
      }
    } catch (error) {
      console.error("Error checking external systems:", error);
    }
  };

  useEffect(() => {
    fetchInvoicesData();
    checkExternalInvoices();

    // Listen for admin invoice creation events
    const handleAdminInvoiceCreated = (event: any) => {
      const { invoiceNumber, patientName, total } = event.detail;
      const notifMessage = `New invoice #${invoiceNumber} created for ${patientName} (₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
      
      // Add to notifications
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: notifMessage,
        type: 'invoice',
        timestamp: new Date()
      }]);
      
      // Play sound notification for new invoice
      soundNotification.playInvoiceAlert().catch(e => console.warn('Sound notification failed:', e));
      
      // Show toast
      toast.success(`📄 ${notifMessage}`, { duration: 5000 });
      
      // Refresh invoices immediately to show the new invoice
      fetchInvoicesData();
    };

    // Listen for events
    window.addEventListener('admin-invoice-created', handleAdminInvoiceCreated);

    // Also check localStorage for invoices created while cashier was on different page
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastAdminInvoiceCreated' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          const notifMessage = `New invoice #${data.invoiceNumber} created for ${data.patientName} (₱${data.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
          
          setNotifications(prev => [...prev, {
            id: Date.now().toString(),
            message: notifMessage,
            type: 'invoice',
            timestamp: new Date(data.timestamp)
          }]);
          
          // Play sound notification for new invoice
          soundNotification.playInvoiceAlert().catch(e => console.warn('Sound notification failed:', e));
          
          toast.success(`📄 ${notifMessage}`, { duration: 5000 });
          fetchInvoicesData();
        } catch (err) {
          console.warn('Error parsing invoice notification', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Check if there's a pending notification on mount
    try {
      const pending = localStorage.getItem('lastAdminInvoiceCreated');
      if (pending) {
        const data = JSON.parse(pending);
        const lastNotifId = localStorage.getItem('lastNotificationId');
        const newNotifId = `${data.timestamp}-${data.invoiceNumber}`;
        
        // Only show if we haven't shown this one before
        if (lastNotifId !== newNotifId) {
          const notifMessage = `New invoice #${data.invoiceNumber} created for ${data.patientName} (₱${data.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
          
          setNotifications(prev => [...prev, {
            id: Date.now().toString(),
            message: notifMessage,
            type: 'invoice',
            timestamp: new Date(data.timestamp)
          }]);
          
          localStorage.setItem('lastNotificationId', newNotifId);
          toast.success(`📄 ${notifMessage}`, { duration: 5000 });
          fetchInvoicesData();
        }
      }
    } catch (err) {
      console.warn('Error checking pending notifications', err);
    }

    // Set up periodic checking for new invoices (every 2 seconds)
    const invoiceCheckInterval = setInterval(() => {
      fetchInvoicesData();
      checkExternalInvoices();
    }, 2000);

    return () => {
      clearInterval(invoiceCheckInterval);
      window.removeEventListener('admin-invoice-created', handleAdminInvoiceCreated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleViewInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEmrServices([]);
    setPharmacyData([]);
    setSourceType(null);
    setFetchingEmrPharmacy(true);

    try {
      // Fetch from EMR
      try {
        const emrSvcs = await emrService.getAppointments();
        const filtered = emrSvcs.filter((apt: any) => {
          const patientMatch = String(apt.patientId || apt.patient || "").toLowerCase() ===
                               String(invoice.patientId).toLowerCase();
          return patientMatch;
        });
        if (filtered.length > 0) {
          setEmrServices(filtered);
          setSourceType('emr');
        }
      } catch (e) {
        console.warn('Failed to fetch EMR services', e);
      }

      // Fetch from Pharmacy - try sales endpoint first, then fallback to transactions
      try {
        // Try fetching from sales collection
        const salesResponse = await axios.get(`${API_BASE}/pharmacy/sales`, {
          params: { patientId: invoice.patientId }
        });
        
        if (salesResponse.data.success && Array.isArray(salesResponse.data.data) && salesResponse.data.data.length > 0) {
          // Transform sales data to match expected format
          const salesData = salesResponse.data.data.map((sale: any) => {
            // Transform items array to match invoice item format
            const transformedItems = (sale.items || sale.transformedItems || []).map((item: any, index: number) => ({
              id: item._id ? item._id.toString() : item.id || `item_${index}`,
              medicationId: item.medicine || item.medicationId || item._id?.toString() || '',
              medicationName: item.name || item.medicationName || item.medicineName || 'Unknown Medication',
              genericName: item.genericName || '',
              brand: item.brand || '',
              strength: item.strength || '',
              dosageForm: item.dosageForm || item.form || '',
              quantity: item.quantity || 0,
              unitPrice: item.price || item.unitPrice || 0,
              totalPrice: item.total || item.totalPrice || (item.quantity || 0) * (item.price || item.unitPrice || 0),
              prescriptionRequired: item.prescriptionRequired || false,
              batchNumber: item.batchNumber || '',
              expiryDate: item.expiryDate || '',
              // Map to invoice item format
              description: item.name || item.medicationName || item.medicineName || 'Unknown Medication',
              rate: item.price || item.unitPrice || 0,
              amount: item.total || item.totalPrice || (item.quantity || 0) * (item.price || item.unitPrice || 0),
              category: 'Pharmacy',
              ...item
            }));
            
            return {
              id: sale._id || sale.id,
              transactionId: sale.transactionId || sale._id?.toString() || sale.id,
              patientId: sale.patientId || (sale.patient ? sale.patient.toString() : null) || invoice.patientId,
              patientName: sale.patientName || invoice.patientName,
              transactionDate: sale.date || sale.transactionDate || sale.createdAt,
              items: transformedItems,
              subtotal: sale.totalAmount || sale.subtotal || sale.total || 0,
              tax: sale.tax || 0,
              discount: sale.discount || 0,
              totalAmount: sale.totalAmount || sale.total || sale.subtotal || 0,
              paymentMethod: sale.paymentMethod || 'Cash',
              paymentStatus: sale.paymentStatus || sale.status || 'Pending',
              syncStatus: sale.syncStatus || 'Pending',
              createdAt: sale.createdAt,
              ...sale
            };
          });
          
          setPharmacyData(salesData);
          if (!sourceType) setSourceType('pharmacy');
        } else {
          // Fallback to transactions endpoint
          const pharmTxns = await pharmacyService.getTransactions(invoice.patientId);
          if (Array.isArray(pharmTxns) && pharmTxns.length > 0) {
            setPharmacyData(pharmTxns);
            if (!sourceType) setSourceType('pharmacy');
          }
        }
      } catch (e) {
        console.warn('Failed to fetch pharmacy data, trying fallback:', e);
        // Fallback to original method
        try {
          const pharmTxns = await pharmacyService.getTransactions(invoice.patientId);
          if (Array.isArray(pharmTxns) && pharmTxns.length > 0) {
            setPharmacyData(pharmTxns);
            if (!sourceType) setSourceType('pharmacy');
          }
        } catch (fallbackError) {
          console.warn('Failed to fetch pharmacy data from fallback:', fallbackError);
        }
      }

      // If no EMR/Pharmacy data, mark as admin source
      if (emrServices.length === 0 && pharmacyData.length === 0) {
        setSourceType('admin');
      }
    } catch (e) {
      console.error('Error fetching EMR/Pharmacy data', e);
    } finally {
      setFetchingEmrPharmacy(false);
    }

    setShowInvoiceDetails(true);
  };

  const handleProcessInvoice = (invoice: Invoice) => {
    try {
      const selId = invoice.id || invoice._id || '';
      const selNumber = invoice.number || invoice.invoiceNumber || '';
      if (selId) window.localStorage.setItem('selectedInvoiceForProcessing', String(selId));
      if (selNumber) window.localStorage.setItem('selectedInvoiceForProcessingNumber', String(selNumber));
      try { window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'payment', invoiceId: selId, invoiceNumber: selNumber } })); } catch (e) { }
    } catch (e) { }
    
    if (onNavigateToView) {
      onNavigateToView('payment');
    } else {
      try { window.history.pushState({}, '', '/payment'); window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) { }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'sent': return <Send className="h-4 w-4 text-blue-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateLike?: string | Date | null) => {
    if (!dateLike) return "-";
    const d = new Date(dateLike as any);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getTimeDifference = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invoice': return '📄';
      case 'emr': return '🏥';
      case 'pharmacy': return '💊';
      default: return '📢';
    }
  };

  // Detect data sources based on invoice items
  const detectInvoiceDataSources = (invoice: Invoice) => {
    const sources: { emr: boolean; pharmacy: boolean } = { emr: false, pharmacy: false };
    
    if (!invoice.items || invoice.items.length === 0) return sources;
    
    invoice.items.forEach((item: InvoiceItem) => {
      const category = (item.category || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      
      // Check if it's a pharmacy/medicine item
      const pharmacyKeywords = ['pharmacy', 'medicine', 'medication', 'drug', 'pills', 'tablet', 'injection', 'iv fluids', 'injectable'];
      const isPharmacy = pharmacyKeywords.some(keyword => category.includes(keyword) || description.includes(keyword));
      
      // Check if it's an EMR/service item
      const emrKeywords = ['consultation', 'diagnostic', 'laboratory', 'service', 'procedure', 'surgery', 'therapy', 'test', 'scan', 'x-ray', 'ultrasound', 'endoscopy'];
      const isEmr = emrKeywords.some(keyword => category.includes(keyword) || description.includes(keyword));
      
      if (isPharmacy) sources.pharmacy = true;
      if (isEmr) sources.emr = true;
    });
    
    return sources;
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.patientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header Info */}
      <Card className="flex-shrink-0">
        <CardHeader className="bg-[#358E83] text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>Available Invoices</CardTitle>
              <CardDescription className="text-white/80">
                View invoices fetched from EMR and Pharmacy systems. Select an invoice and click Process to proceed with payment.
              </CardDescription>
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(true)}
                className="text-white hover:bg-white/20 relative ml-4"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getNotificationIcon(notif.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 break-words">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{getTimeDifference(notif.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotifications([])}
              className="flex-1"
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotifications(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search invoices by number, patient name, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Invoices List - Flashcard Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No invoices found</p>
              <p className="text-sm mt-2">
                {invoices.length === 0
                  ? "No invoices available for billing."
                  : "No invoices match your search criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-[#358E83] shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => handleViewInvoice(invoice)}
              >
                {/* Card Header with Status Badge */}
                <div className="relative h-32 bg-[#358E83] p-6 text-white">
                  <div className="absolute top-4 right-4">
                    <Badge className={`${getStatusColor(invoice.status)} text-xs font-semibold`}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(invoice.status)}
                        <span>{invoice.status.toUpperCase()}</span>
                      </span>
                    </Badge>
                  </div>
                  <p className="text-sm font-medium opacity-90">Invoice #{invoice.number.split('-')[1]?.slice(-6) || invoice.number}</p>
                  <p className="text-3xl font-bold mt-2">
                    ₱{invoice.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  {/* Patient Info */}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Patient</p>
                    <p className="text-lg font-semibold text-gray-900">{invoice.patientName}</p>
                    {invoice.patientId && (
                      <p className="text-sm text-gray-600">{invoice.patientId}</p>
                    )}
                  </div>

                  {/* Invoice Details Grid */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Items</p>
                      <p className="text-2xl font-bold text-[#358E83]">{invoice.items?.length || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(invoice.createdAt || invoice.date)}</p>
                    </div>
                  </div>

                  {/* Breakdown Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-medium">₱{invoice.subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">-₱{invoice.discount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {invoice.tax && invoice.tax > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tax:</span>
                        <span className="font-medium">₱{(invoice.tax || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer with Action Buttons */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleViewInvoice(invoice);
                    }}
                    className="flex-1 border-gray-300 hover:bg-gray-100 text-gray-700"
                  >
                    <Eye size={16} />
                    <span className="ml-1">View</span>
                  </Button>

                  <Button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleProcessInvoice(invoice);
                    }}
                    className="flex-1 bg-[#358E83] hover:bg-[#358E83]/90 text-white"
                    size="sm"
                  >
                    <CreditCard size={16} />
                    <span className="ml-1">Process</span>
                  </Button>
                </div>

                {/* Hover Overlay Indicator */}
                <div className="absolute inset-0 bg-[#358E83]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">{selectedInvoice?.number}</DialogTitle>
            <DialogDescription className="text-xs">
              Detailed invoice information
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="overflow-y-auto">
              <TransactionRecord
                transactionNumber={selectedInvoice.number || `INV-${selectedInvoice.id}`}
                transactionType="Invoice"
                transactionDate={selectedInvoice.date}
                status={(selectedInvoice.status as any) || 'Pending'}
                patientName={selectedInvoice.patientName}
                patientId={selectedInvoice.patientId}
                companyName="MEDICARE HOSPITAL"
                companyAddress="123 Health Street, Medical District, Philippines"
                items={selectedInvoice.items || []}
                subtotal={selectedInvoice.subtotal || 0}
                discount={selectedInvoice.discount || 0}
                discountPercentage={selectedInvoice.discountPercentage}
                tax={selectedInvoice.tax || 0}
                total={selectedInvoice.total}
                invoiceNumber={selectedInvoice.number || `INV-${selectedInvoice.id}`}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2 border-t mt-4">
            <Button variant="outline" onClick={() => setShowInvoiceDetails(false)} size="sm">
              Close
            </Button>
            <Button
              onClick={() => {
                handleProcessInvoice(selectedInvoice);
                setShowInvoiceDetails(false);
              }}
              size="sm"
              className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Process Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
