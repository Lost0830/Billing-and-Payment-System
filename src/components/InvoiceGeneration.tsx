import { Plus, Search, Receipt, Edit, Eye, Trash2, Download, Calendar, User, CreditCard, CheckCircle, Clock, AlertCircle, Send, Printer, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { MockEmrService } from "../services/mockEmrData";
import { PriceListService } from "../services/priceListService";
import { toast } from "sonner";
import axios from "axios";
import { useEffect, useState } from "react";
import { Switch } from "./ui/switch";
import { fetchPatients } from "../services/api.js";
import { billingService } from "../services/billingService";
import { getDisplayPatientId, getInternalPatientKey, normalizePatients, resolvePatientDisplay } from "../utils/patientId";
import { pharmacyService } from "../services/pharmacyIntegration";
import { DiscountService, DiscountOption } from "../services/discountService";
import { patientService } from "../services/patientService";
import { TransactionRecord } from "./TransactionRecord";

interface InvoiceGenerationProps {
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
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  subtotal: number;
  discount: number;
  discountType?: string;
  discountPercentage?: number;
  total: number;
  items: InvoiceItem[];
  generatedBy?: string;
  generatedAt?: string;
  notes?: string;
  taxableAmount?: number; // Amount subject to VAT (medicines only)
  tax?: number; // VAT on medicines
  exemptAmount?: number; // Amount exempt from VAT (medical services)
  // Optional fields to support variable backend shapes
  _id?: string;
  accountId?: string;
  invoiceNumber?: string;
  patient?: any;
  createdAt?: string; // Date when invoice was created
}

const HOSPITAL_SERVICES = {
  "Consultation Services": ["General Consultation", "Specialist Consultation", "Emergency Consultation", "Telemedicine Consultation"],
  "Diagnostic Services": ["Blood Test", "X-Ray", "CT Scan", "MRI", "Ultrasound", "ECG", "Endoscopy"],
  "Laboratory Services": ["Complete Blood Count", "Blood Chemistry", "Urinalysis", "Microbiology", "Pathology"],
  "Surgical Services": ["Minor Surgery", "Major Surgery", "Outpatient Surgery", "Emergency Surgery"],
  "Therapeutic Services": ["Physical Therapy", "Occupational Therapy", "Speech Therapy", "Chemotherapy", "Dialysis"],
  "Room & Board": ["Private Room", "Semi-Private Room", "ICU", "Emergency Room", "Day Care"],
  "Pharmacy": ["Prescription Medication", "Over-the-Counter", "Injectable Medication", "IV Fluids"],
  "Medical Equipment": ["Wheelchair Rental", "Medical Device Rental", "Oxygen Tank", "CPAP Machine"]
};

const DISCOUNT_OPTIONS = [
  { label: "Senior Citizen (20%)", value: "senior", percentage: 20 },
  { label: "PWD (20%)", value: "pwd", percentage: 20 },
  { label: "Employee (15%)", value: "employee", percentage: 15 },
  { label: "Insurance Coverage (Variable)", value: "insurance", percentage: 0 },
  { label: "Charity Care (50%)", value: "charity", percentage: 50 },
  { label: "Prompt Payment (5%)", value: "prompt", percentage: 5 }
];

// Extended patient list for demonstration
const PREDEFINED_PATIENTS = [
  { id: "P001", name: "Maria Santos", fullDisplay: "Maria Santos (P001)" },
  { id: "P002", name: "Juan Dela Cruz", fullDisplay: "Juan Dela Cruz (P002)" },
  { id: "P003", name: "Anna Reyes", fullDisplay: "Anna Reyes (P003)" },
  { id: "P004", name: "Roberto Cruz", fullDisplay: "Roberto Cruz (P004)" },
  { id: "P005", name: "Carmen Flores", fullDisplay: "Carmen Flores (P005)" },
  { id: "P006", name: "Miguel Torres", fullDisplay: "Miguel Torres (P006)" },
  { id: "P007", name: "Sofia Garcia", fullDisplay: "Sofia Garcia (P007)" },
  { id: "P008", name: "Pedro Gonzales", fullDisplay: "Pedro Gonzales (P008)" },
  { id: "P009", name: "Elena Ramirez", fullDisplay: "Elena Ramirez (P009)" },
  { id: "P010", name: "Carlos Mendoza", fullDisplay: "Carlos Mendoza (P010)" },
  { id: "P011", name: "Isabella Lopez", fullDisplay: "Isabella Lopez (P011)" },
  { id: "P012", name: "Francisco Ramos", fullDisplay: "Francisco Ramos (P012)" },
  { id: "P013", name: "Gabriela Santos", fullDisplay: "Gabriela Santos (P013)" },
  { id: "P014", name: "Antonio Fernandez", fullDisplay: "Antonio Fernandez (P014)" },
  { id: "P015", name: "Valentina Castro", fullDisplay: "Valentina Castro (P015)" }
];

const API_BASE = "http://localhost:5002/api";

export function InvoiceGeneration({ onNavigateToView }: InvoiceGenerationProps) {
  // Local component state (was accidentally removed in a previous edit)
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [openPatientCombobox, setOpenPatientCombobox] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [pharmacyTransactions, setPharmacyTransactions] = useState<any[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<string>("");
  const [customDiscountAmount, setCustomDiscountAmount] = useState<string>("");
  const [dynamicDiscounts, setDynamicDiscounts] = useState<DiscountOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [autoAppliedDiscount, setAutoAppliedDiscount] = useState<string>("");

  // Fetch helper inside component so it can call setInvoices
  const fetchInvoices = async () => {
    try {
      // fetch invoices + payments in parallel (best-effort)
      const [invRes, payRes] = await Promise.all([
        axios.get(`${API_BASE}/invoices`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/payments`).catch(() => ({ data: [] }))
      ]);

      const invPayload: any = invRes?.data;
      const payPayload: any = payRes?.data;

      const paymentsArray: any[] = Array.isArray(payPayload)
        ? payPayload
        : (payPayload?.data || []);

      let invList: any[] = Array.isArray(invPayload)
        ? invPayload
        : (invPayload?.data || []);

      // Keep all invoices fetched; UI will split active vs archived into tabs

      const normalized = invList.map((inv: any) => {
        const id = inv._id || inv.id;
        const number = inv.number || inv.invoiceNumber || `INV-${id?.toString().slice(-6) || Date.now()}`;

        const matchingPayment = paymentsArray.find((p: any) =>
          (p.invoiceId && id && String(p.invoiceId) === String(id)) ||
          (p.invoiceNumber && number && String(p.invoiceNumber) === String(number)) ||
          (p.invoiceNo && number && String(p.invoiceNo) === String(number))
        );

        let status = (inv.status || inv.state || "").toString().toLowerCase();
        if (!status || status === "draft" || status === "unpaid") {
          if (matchingPayment) status = (matchingPayment.status || "paid").toString().toLowerCase();
        }

        const finalStatus = status === "paid" || status === "completed" || status === "processed" ? "paid"
          : status === "sent" || status === "pending" ? "sent"
          : status === "overdue" ? "overdue"
          : "draft";

        return {
          id,
          number,
          patientName: inv.patientName || inv.patient || "Unknown",
          patientId: inv.patientId || inv.accountId || "N/A",
          date: inv.date || inv.issuedDate || new Date().toISOString(),
          dueDate: inv.dueDate || new Date().toISOString(),
          status: finalStatus,
          subtotal: inv.subtotal || inv.amount || inv.totalBeforeTax || 0,
          discount: inv.discount || 0,
          discountType: inv.discountType || inv.discountMode || "none",
          discountPercentage: inv.discountPercentage || 0,
          tax: inv.tax || inv.vat || 0,
          total: inv.total || inv.amount || 0,
          items: inv.items || [],
          generatedBy: inv.generatedBy || "Billing Department",
          generatedAt: inv.generatedAt || inv.date || new Date().toISOString(),
          notes: inv.notes || "",
          isArchived: !!inv.isArchived,
          createdAt: inv.createdAt || inv.generatedAt || new Date().toISOString(),
        } as Invoice;
      });

      setInvoices(normalized);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to connect to backend");
    }
  };

  // Load patients and admin-managed discounts once
  useEffect(() => {
    (async () => {
      try {
        const pRes = await fetchPatients();
        const plist = Array.isArray(pRes) ? pRes : (pRes?.data || []);
        setPatients(normalizePatients ? normalizePatients(plist) : plist);
      } catch (err) {
        console.warn('Failed to load patients', err);
      }

      try {
        const dyn = DiscountService.getDiscounts?.() || [];
        setDynamicDiscounts(dyn);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  // Fetch invoices on mount so Recent Invoices list is populated
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Re-fetch invoices when the archived toggle changes
  // (no-op) invoices are fetched on mount; tabs will filter client-side

  const [newInvoice, setNewInvoice] = useState({
    patientName: "",
    patientId: "",
    dueDate: new Date().toISOString(),
    notes: ""
  });
  
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // Helper function to check if patient is senior citizen (60+)
  const getPatientAge = (patient: any): number | null => {
    if (!patient) return null;
    
    const dob = patient.dateOfBirth || patient.dob || patient.birthDate;
    if (!dob) return null;
    
    try {
      const age = patientService.calculateAge(dob);
      return typeof age === 'number' ? age : null;
    } catch (e) {
      console.warn('Failed to calculate age', e);
      return null;
    }
  };

  // Helper to auto-apply senior citizen discount
  const checkAndApplySeniorDiscount = (patient: any) => {
    const age = getPatientAge(patient);
    
    if (age !== null && age >= 60) {
      // Find senior citizen discount option
      const seniorDiscount = dynamicDiscounts.find(d => 
        (d.name || '').toLowerCase().includes('senior')
      ) || DISCOUNT_OPTIONS.find(d => d.value === 'senior');
      
      if (seniorDiscount) {
        const discountId = (seniorDiscount as any).id || 'senior';
        setSelectedDiscount(discountId);
        setAutoAppliedDiscount(`Senior Citizen (Age: ${age})`);
        toast.success(`Senior citizen discount applied (Age: ${age})`);
        return true;
      }
    } else if (age !== null) {
      // Patient is not senior, clear any auto-applied discount
      setAutoAppliedDiscount("");
    }
    
    return false;
  };

  // Listen for EMR items requested to be added to invoice (from admin or cashier)
  useEffect(() => {
    const handler = (ev: any) => {
      try {
        const detail = ev?.detail || {};
        const items = Array.isArray(detail.items) ? detail.items : [];
        const patientKey = detail.patientId || detail.patientKey || '';
        if (!items || items.length === 0) return;

        // Map incoming items to InvoiceItem shape
        const mapped: InvoiceItem[] = items.map((it: any, idx: number) => {
          const description = it.description || it.service || it.name || 'Item';
          const qty = Number(it.quantity || it.qty || 1);
          const rate = Number(it.rate || PriceListService.getPrice?.(description, it.category || it.group || 'Pharmacy') || 0);
          return {
            id: it.id || `emr-${Date.now()}-${idx}`,
            description,
            quantity: qty,
            rate,
            amount: qty * rate,
            category: it.category || 'Pharmacy'
          } as InvoiceItem;
        });

        // Prepend to current invoice items and open the create form
        setInvoiceItems(prev => [...mapped, ...prev]);
        if (patientKey) {
          setSelectedPatientId(patientKey);
          const found = patients.find((p:any) => getInternalPatientKey(p) === patientKey || p.id === patientKey || p._id === patientKey || p.patientId === patientKey);
          if (found) setNewInvoice(prev => ({ ...prev, patientName: found.name || prev.patientName, patientId: getInternalPatientKey(found) || patientKey }));
        }
        setShowCreateForm(true);
        toast.success(`Added ${mapped.length} item(s) to invoice draft`);
      } catch (e) {
        console.error('emr-add-to-invoice handler error', e);
        toast.error('Failed to add items to invoice');
      }
    };

    window.addEventListener('emr-add-to-invoice', handler as EventListener);
    return () => window.removeEventListener('emr-add-to-invoice', handler as EventListener);
  }, [patients]);

  const [currentItem, setCurrentItem] = useState({
    description: "",
    quantity: 1,
    rate: 0,
    category: ""
  });

  const addInvoiceItem = () => {
    if (currentItem.description && currentItem.rate > 0) {
      const newItem: InvoiceItem = {
        id: Date.now().toString(),
        description: currentItem.description,
        quantity: currentItem.quantity,
        rate: currentItem.rate,
        amount: currentItem.quantity * currentItem.rate,
        category: currentItem.category
      };
      
      setInvoiceItems([...invoiceItems, newItem]);
      setCurrentItem({ description: "", quantity: 1, rate: 0, category: "" });
      toast.success('Service added to invoice');
    }
  };

  const removeInvoiceItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
    toast.info('Service removed from invoice');
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (!selectedDiscount) return 0;

    // custom amount
    if (selectedDiscount === 'custom') return parseFloat(customDiscountAmount) || 0;

    // check dynamic discounts by id
    const dyn = dynamicDiscounts.find(d => d.id === selectedDiscount);
    if (dyn) {
      try {
        return DiscountService.calculateDiscount(subtotal, dyn);
      } catch (err) {
        console.error('Error calculating dynamic discount', err);
        return 0;
      }
    }

    // fallback to legacy DISCOUNT_OPTIONS
    if (selectedDiscount && selectedDiscount !== "insurance") {
      const discount = DISCOUNT_OPTIONS.find(d => d.value === selectedDiscount);
      return discount ? (subtotal * discount.percentage) / 100 : 0;
    }

    return 0;
  };

  // Helper function to check if an item is taxable (pharmacy/medicine)
  const isTaxableItem = (item: InvoiceItem) => {
    const taxableCategories = ['Pharmacy'];
    const taxableKeywords = ['medication', 'medicine', 'prescription', 'drug', 'pharmaceutical'];
    
    // Check if category is taxable
    if (taxableCategories.includes(item.category)) return true;
    
    // Check if description contains taxable keywords
    const descriptionLower = item.description.toLowerCase();
    return taxableKeywords.some(keyword => descriptionLower.includes(keyword));
  };

  // Calculate taxable amount (medicines only)
  const calculateTaxableAmount = () => {
    return invoiceItems
      .filter(item => isTaxableItem(item))
      .reduce((sum, item) => sum + item.amount, 0);
  };

  // Calculate exempt amount (medical services)
  const calculateExemptAmount = () => {
    return invoiceItems
      .filter(item => !isTaxableItem(item))
      .reduce((sum, item) => sum + item.amount, 0);
  };

  // Calculate VAT on medicines (after discount is applied proportionally)
  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const taxableAmount = calculateTaxableAmount();
    
    if (taxableAmount === 0) return 0; // No medicines, no VAT
    
    const discount = calculateDiscount();
    
    // Apply discount proportionally to taxable items
    const taxableAfterDiscount = taxableAmount - (discount * (taxableAmount / subtotal));
    
    // 12% VAT on medicines only
    return taxableAfterDiscount * 0.12;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    return subtotal - discount + tax;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'sent': return <Send className="h-4 w-4 text-blue-600" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Safe date helpers to avoid showing 'Invalid Date'
  const formatDate = (dateLike?: string | Date | null) => {
    if (!dateLike) return "-";
    const d = new Date(dateLike as any);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateTime = (dateLike?: string | Date | null) => {
    if (!dateLike) return "-";
    const d = new Date(dateLike as any);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

const handleGenerateInvoice = async () => {
  if (invoiceItems.length === 0) {
    toast.error('Please add at least one service item.');
    return;
  }
  if (!newInvoice.patientName || !newInvoice.patientId) {
    toast.error('Please select a patient.');
    return;
  }

  setIsGenerating(true);
  try {
    // Build the invoice object (keep all your existing calculations)
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    const total = calculateTotal();

    const invoice: Invoice = {
      id: Date.now().toString(),
      number: `INV-${Date.now()}`,
      patientName: newInvoice.patientName,
      patientId: newInvoice.patientId,
      date: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      status: "draft",
      subtotal,
      discount,
      total,
      items: invoiceItems,
      discountType: selectedDiscount || "none",
      generatedBy: "Billing Department",
      generatedAt: new Date().toISOString(),
      notes: newInvoice.notes,
      createdAt: new Date().toISOString(),
    };

    const res: any = await axios.post(`${API_BASE}/invoices`, invoice);

    if (res.data.success) {
      toast.success("Invoice saved to database!");
      const saved = (res.data?.data || invoice) as any;
      // ensure id and number exist
      saved.id = saved._id || saved.id || invoice.id;
      saved.number = saved.number || saved.invoiceNumber || invoice.number;

      // attach patient details from loaded patients if available (helps receipt display)
      const patientObj = patients.find((p:any) => {
        const key = getInternalPatientKey(p);
        return key && String(key) === String(saved.patientId);
      });
      if (patientObj) {
        saved.patient = patientObj;
        // prefer human-friendly patient id for UI display (e.g., P001)
        saved.patientId = getDisplayPatientId(patientObj) || saved.patientId;
      }

  setInvoices((prev) => [saved as Invoice, ...prev]);

      // Push the created invoice into the shared in-memory billingService so
      // other components (PaymentProcessing, BillingHistory) can immediately
      // see it even when remote sync is suppressed.
      try {
        const mappedItems = Array.isArray(saved.items) ? saved.items.map((it: any) => ({
          id: it.id || it._id || Date.now().toString(),
          description: it.description || it.service || it.name || 'Item',
          quantity: it.quantity || it.qty || 1,
          unitPrice: it.rate || it.unitPrice || it.price || 0,
          totalPrice: it.amount || it.totalPrice || ((it.quantity || 1) * (it.rate || it.unitPrice || 0)),
          category: it.category || it.group || 'General'
        })) : [];

        const record = billingService.addInvoiceRecord({
          invoiceNumber: saved.number || saved.invoiceNumber || invoice.number,
          patientName: saved.patientName || invoice.patientName,
          patientId: saved.patientId || invoice.patientId,
          amount: saved.total || saved.amount || invoice.total,
          description: saved.notes || invoice.notes || '',
          date: saved.date || new Date().toISOString(),
          time: saved.time || new Date(saved.date || Date.now()).toLocaleTimeString(),
          subtotal: saved.subtotal || saved.amount || 0,
          discount: saved.discount || 0,
          discountType: saved.discountType || saved.discountMode || 'none',
          discountPercentage: saved.discountPercentage || 0,
          tax: saved.tax || saved.vat || 0,
          taxRate: saved.taxRate || 0,
          totalBeforeTax: saved.totalBeforeTax || undefined,
          items: mappedItems
        });

        // Notify any global listeners as well
        try { window.dispatchEvent(new CustomEvent('billing-updated', { detail: { record } })); } catch (e) { /* ignore */ }
      } catch (e) {
        console.warn('Failed to push invoice into billingService', e);
      }

  // Open the unified invoice details container so generated invoice
  // and viewed invoice use the same modal/container
  setSelectedInvoice(saved as Invoice & { patient?: any });
  setGeneratedInvoice(saved as Invoice & { patient?: any });
  setShowInvoiceDetails(true);
  setShowReceiptDialog(false);
  setShowCreateForm(false);
    } else {
      toast.error("Failed to save invoice");
    }
  } catch (error) {
    console.error("Error generating invoice:", error);
    toast.error("Server error while saving invoice");
  } finally {
    setIsGenerating(false);
  }
};


  const handlePrintReceipt = () => {
  const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const receiptContent = document.getElementById('invoice-receipt-print');
    if (!receiptContent) return;
    
    // compute patient age/sex for the print header
    const patientForPrint = (generatedInvoice as any)?.patient || patients.find((p:any) => {
      const pid = p.id || p._id || p.patientId;
      return pid && String(pid) === String(generatedInvoice?.patientId);
    });
  const printAge = patientForPrint ? patientService.calculateAge(patientForPrint.dateOfBirth) : (generatedInvoice?.date ? patientService.calculateAge(generatedInvoice.date) : "-");
    const printSex = (patientForPrint && (patientForPrint.sex || 'Unknown')) || (generatedInvoice as any)?.sex || 'Unknown';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice Receipt - ${generatedInvoice?.number}</title>
          <style>
            @page { size: A4 landscape; }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 1rem 2rem;
              max-width: 1200px;
              margin: 0 auto;
              color: #000;
            }
            .space-y-6 > * + * {
              margin-top: 1.5rem;
            }
            .space-y-3 > * + * {
              margin-top: 0.75rem;
            }
            .space-y-2 > * + * {
              margin-top: 0.5rem;
            }
            .text-center {
              text-align: center;
            }
            .border-b {
              border-bottom: 1px solid #e5e7eb;
            }
            .border-t {
              border-top: 1px solid #e5e7eb;
            }
            .pb-4 {
              padding-bottom: 1rem;
            }
            .pt-4 {
              padding-top: 1rem;
            }
            .my-2 {
              margin-top: 0.5rem;
              margin-bottom: 0.5rem;
            }
            .ml-1 {
              margin-left: 0.25rem;
            }
            .ml-2 {
              margin-left: 0.5rem;
            }
            .grid {
              display: grid;
              gap: 1rem;
            }
            .grid-cols-2 {
              grid-template-columns: repeat(2, 1fr);
            }
            .gap-4 {
              gap: 1rem;
            }
            .text-sm {
              font-size: 0.875rem;
            }
            .text-xs {
              font-size: 0.75rem;
            }
            .text-2xl {
              font-size: 1.5rem;
            }
            .text-xl {
              font-size: 1.25rem;
            }
            .text-lg {
              font-size: 1.125rem;
            }
            .font-bold {
              font-weight: 700;
            }
            .font-semibold {
              font-weight: 600;
            }
            .text-gray-600 {
              color: #4b5563;
            }
            .text-gray-500 {
              color: #6b7280;
            }
            .text-green-600 {
              color: #16a34a;
            }
            .text-orange-600 {
              color: #ea580c;
            }
            .mt-2 {
              margin-top: 0.5rem;
            }
            .mt-4 {
              margin-top: 1rem;
            }
            .mb-2 {
              margin-bottom: 0.5rem;
            }
            .w-96 {
              width: 24rem;
            }
            /* make tables wider to suit landscape */
            table { width: 100%; }
            .flex {
              display: flex;
            }
            .justify-between {
              justify-content: space-between;
            }
            .justify-end {
              justify-content: flex-end;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 1rem;
            }
            thead {
              background-color: #f9fafb;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 0.5rem;
              text-align: left;
            }
            th {
              font-weight: 600;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .bg-gray-50 {
              background-color: #f9fafb;
            }
            .badge {
              display: inline-flex;
              align-items: center;
              padding: 0.25rem 0.75rem;
              font-size: 0.75rem;
              font-weight: 600;
              border-radius: 0.375rem;
            }
            .badge-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            .badge-paid {
              background-color: #d1fae5;
              color: #065f46;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${receiptContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    // also set generatedInvoice so print and shared container behavior remain consistent
    setGeneratedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleUpdateInvoiceStatus = (invoiceId: string, newStatus: 'draft' | 'sent' | 'paid' | 'overdue') => {
    setInvoices(invoices.map(inv => 
      inv.id === invoiceId ? { ...inv, status: newStatus } : inv
    ));
    toast.success(`Invoice status updated to ${newStatus}`);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setShowDeleteDialog(true);
  };

const confirmDeleteInvoice = async () => {
  if (!invoiceToDelete) return;

  try {
    // Move invoice to archive instead of permanent delete (cashier action)
    const res: any = await axios.post(`${API_BASE}/archive/invoices/${invoiceToDelete}/archive`, { archivedBy: 'cashier' });
    if (res?.data?.success) {
      // mark locally as archived so it shows up in the Archived tab
      setInvoices((prev) => prev.map((inv) => inv.id === invoiceToDelete ? { ...inv, isArchived: true } : inv));
      toast.success("Invoice moved to archive");
    } else {
      toast.error("Failed to move invoice to archive");
    }
  } catch (error) {
    console.error("Error archiving invoice:", error);
    toast.error("Server error while archiving invoice");
  } finally {
    setShowDeleteDialog(false);
    setInvoiceToDelete(null);
  }
};


  const filteredInvoices = invoices.filter(invoice => 
    invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.patientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show invoices depending on active tab (active vs archived)
  const displayedInvoices = invoices
    .filter(inv => (activeTab === 'active' ? !inv.isArchived : !!inv.isArchived))
    .filter(invoice =>
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.patientId.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white"
        >
          <Plus className="mr-2" size={16} />
          Create Invoice
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader className="bg-[#358E83] text-white">
            <CardTitle className="flex items-center">
              <Receipt className="mr-2" size={20} />
              Create New Invoice
            </CardTitle>
            <CardDescription className="text-white/80">
              Generate a new invoice for patient services
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Basic Invoice Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="patientSelect">Select Patient</Label>
                <Popover open={openPatientCombobox} onOpenChange={setOpenPatientCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPatientCombobox}
                      className="w-full justify-between"
                    >
                      {selectedPatientId
                        ? PREDEFINED_PATIENTS.find((patient) => patient.id === selectedPatientId)?.fullDisplay
                        : "Search and select a patient..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-screen max-w-[95vw] p-0 left-1/2 transform -translate-x-1/2">
                    <Command>
                      <CommandInput
                        placeholder="Search by patient name or ID..."
                        value={patientSearch}
                        onChange={(e: any) => setPatientSearch(e.target.value)}
                      />
                      <CommandList>
                        <CommandEmpty>No patient found.</CommandEmpty>
                        <CommandGroup>
                          {patients.filter((p:any) => {
                                  const q = (patientSearch || "").toLowerCase();
                                                  const pid = (getDisplayPatientId(p) || "").toString().toLowerCase();
                                  const name = (p.name || "").toLowerCase();
                                  return q === "" || name.includes(q) || pid.includes(q);
                                                }).map((patient:any) => {
                                                  const internalKey = getInternalPatientKey(patient);
                                                  const displayPid = getDisplayPatientId(patient) || internalKey;
                                                  const hasEmrData = MockEmrService.hasUnbilledServices(internalKey);
                                                  const emrData = MockEmrService.getPatientEmrData(internalKey);
                                                  const display = `${patient.name} (${displayPid})`;
                                                  const patientAge = getPatientAge(patient);
                                                  const isSenior = patientAge !== null && patientAge >= 60;
                                  return (
                                    <CommandItem
                                                      key={display}
                                                      value={display}
                                      onSelect={async () => {
                                                      const selId = internalKey;
                                      setSelectedPatientId(selId);
                                      setNewInvoice({
                                        ...newInvoice, 
                                        patientName: patient.name,
                                        patientId: selId
                                      });

                                    // Auto-populate services from EMR
                                    const emrServices = MockEmrService.getPatientServices(selId);
                                    if (emrServices.length > 0) {
                                      const populatedItems: InvoiceItem[] = emrServices.map((service, index) => {
                                        const price = PriceListService.getPrice(service.service, service.category);
                                        return {
                                          id: `emr-${service.serviceId}-${Date.now()}-${index}`,
                                          description: service.service,
                                          quantity: service.quantity,
                                          rate: price,
                                          amount: price * service.quantity,
                                          category: service.category
                                        };
                                      });
                                      setInvoiceItems(populatedItems);
                                      toast.success(`Patient ${patient.name} selected - ${emrServices.length} services loaded from EMR`);
                                    } else {
                                      setInvoiceItems([]);
                                      toast.success(`Patient ${patient.name} selected - no pending services in EMR`);
                                    }

                                    // Fetch pharmacy transactions for selected patient and auto-load medicines
                                    try {
                                      const txns = await pharmacyService.getTransactions(selId);
                                      if (Array.isArray(txns) && txns.length > 0) {
                                        setPharmacyTransactions(txns);
                                        // Flatten items across transactions
                                        const meds = txns.flatMap(t => t.items || []);
                                        if (meds.length > 0) {
                                          const medicineItems: InvoiceItem[] = meds.map((m:any, idx:number) => ({
                                            id: `pharm-${m.id || idx}-${Date.now()}`,
                                            description: `${m.medicationName} ${m.strength ? `(${m.strength})` : ''}`,
                                            quantity: m.quantity || 1,
                                            rate: m.unitPrice || m.totalPrice || 0,
                                            amount: m.totalPrice || ((m.unitPrice || 0) * (m.quantity || 1)),
                                            category: 'Pharmacy'
                                          }));
                                          setInvoiceItems(prev => [...medicineItems, ...prev]);
                                          toast.success(`Loaded ${medicineItems.length} medicine items from pharmacy`);
                                        }
                                      } else {
                                        // No pharmacy data - insert demo dummy medicines for demo purposes
                                        const dummy = [
                                          {
                                            id: `pharm-demo-${Date.now()}`,
                                            description: `Sample Medicine - Demo`,
                                            quantity: 1,
                                            rate: 200,
                                            amount: 200,
                                            category: 'Pharmacy'
                                          }
                                        ];
                                        setPharmacyTransactions([]);
                                        setInvoiceItems(prev => [...dummy, ...prev]);
                                        toast.info('No pharmacy records found — added demo medicine items for display');
                                      }
                                    } catch (err) {
                                      console.error('Failed to fetch pharmacy transactions', err);
                                    }

                                    // Auto-apply senior citizen discount if applicable
                                    checkAndApplySeniorDiscount(patient);

                                    setOpenPatientCombobox(false);
                                    setPatientSearch("");
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedPatientId === internalKey ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span>{display}</span>
                                      {isSenior && (
                                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                          Senior (Age {patientAge})
                                        </Badge>
                                      )}
                                    </div>
                                    {hasEmrData && emrData && (
                                      <div className="text-xs text-green-600 flex items-center mt-1">
                                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                        {emrData.services.length} services in EMR ({emrData.status})
                                      </div>
                                    )}
                                    {!hasEmrData && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        No pending services
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                                );
                              })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-gray-500 mt-1">
                  Type to search from {patients.length} patients
                </p>
                
                {/* EMR Status Display */}
                {selectedPatientId && (
                  <>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">EMR Integration Status</h4>
                        <p className="text-sm text-blue-700">
                          {(() => {
                            const emrData = MockEmrService.getPatientEmrData(selectedPatientId);
                            if (!emrData) return "No EMR data found for this patient";
                            
                            const statusText = emrData.status === 'admitted' ? 'Currently Admitted' :
                                             emrData.status === 'discharged' ? 'Recently Discharged' :
                                             'Outpatient';
                            
                            return `${statusText} - ${emrData.services.length} services found`;
                          })()}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        EMR Connected
                      </Badge>
                    </div>
                  </div>

                  {/* Auto-Applied Discount Display */}
                  {autoAppliedDiscount && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-yellow-900">✓ Discount Applied</h4>
                          <p className="text-sm text-yellow-700">
                            {autoAppliedDiscount}
                          </p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          ACTIVE
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {/* Pharmacy Integration Panel - sized like the patient dropdown */}
                  <div className="mt-3 flex justify-center">
                    <div className="w-screen max-w-[95vw] p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-green-900">Pharmacy Integration</h4>
                          <p className="text-sm text-green-700 mt-1">
                            {pharmacyTransactions.length === 0 ? 'No pharmacy purchases found for this patient' : `${pharmacyTransactions.length} Transaction(s) found`}
                          </p>
                        </div>
                        <Badge className="bg-white border text-green-800">{pharmacyTransactions.length} Transaction(s)</Badge>
                      </div>

                      {pharmacyTransactions.length > 0 && (
                        <div className="mt-3 text-sm">
                          {pharmacyTransactions.map((t:any) => (
                            <div key={t.id} className="border rounded p-2 mb-2 bg-white">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{t.pharmacyName} • {t.transactionDate}</div>
                                  <div className="text-xs text-gray-600">{t.notes}</div>
                                </div>
                                <div className="text-sm font-semibold">₱{t.totalAmount?.toLocaleString?.() || t.totalAmount}</div>
                              </div>
                              <div className="mt-2">
                                <ul className="text-sm list-disc pl-5">
                                  {(t.items||[]).map((it:any, idx:number) => (
                                    <li key={idx}>{it.medicationName} {(it.strength||'')} x{it.quantity} — ₱{it.totalPrice}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Invoice Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Additional notes for this invoice..."
                  className="min-h-[80px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Payment due immediately upon receipt
                </p>
              </div>
            </div>

            <Separator />

            {/* Service Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3>Services</h3>
                {invoiceItems.length > 0 && selectedPatientId && (
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    {invoiceItems.filter(item => item.id.startsWith('emr-')).length > 0 
                      ? `${invoiceItems.filter(item => item.id.startsWith('emr-')).length} from EMR`
                      : 'Manual Entry'
                    }
                  </Badge>
                )}
              </div>
              
              {invoiceItems.length > 0 && invoiceItems.filter(item => item.id.startsWith('emr-')).length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">✓ Services automatically loaded from EMR.</span> You can add additional services below or modify quantities and rates as needed.
                  </p>
                </div>
              )}
              
              <h4 className="mb-4 text-lg">Add Additional Services</h4>
              
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Hospital Price List Integration:</span> Service rates are automatically populated from the hospital's standard price list. You can modify rates if needed for special cases.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="md:col-span-2">
                  <Label htmlFor="serviceCategory">Service Category</Label>
                  <Select
                    value={currentItem.category}
                    onValueChange={(value: string) => setCurrentItem({ ...currentItem, category: value, description: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(HOSPITAL_SERVICES).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="service">Service Description</Label>
                  <Select
                    value={currentItem.description}
                    onValueChange={(value: string) => {
                      const price = PriceListService.getPrice(value, currentItem.category);
                      setCurrentItem({ 
                        ...currentItem, 
                        description: value,
                        rate: price
                      });
                    }}
                    disabled={!currentItem.category}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentItem.category && HOSPITAL_SERVICES[currentItem.category as keyof typeof HOSPITAL_SERVICES]?.map((service) => {
                        const price = PriceListService.getPrice(service, currentItem.category);
                        return (
                          <SelectItem key={service} value={service}>
                            <div className="flex justify-between items-center w-full">
                              <span>{service}</span>
                              <span className="text-sm text-gray-500 ml-2">₱{price.toLocaleString()}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <Label htmlFor="rate">Rate (₱)</Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentItem.rate}
                    onChange={(e) => setCurrentItem({ ...currentItem, rate: parseFloat(e.target.value) || 0 })}
                    className={currentItem.rate > 0 ? "bg-green-50 border-green-300" : ""}
                  />
                  {currentItem.rate > 0 && currentItem.description && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Price from hospital price list
                    </p>
                  )}
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={addInvoiceItem}
                    className="w-full bg-[#E94D61] hover:bg-[#E94D61]/90 text-white"
                  >
                    <Plus className="mr-2" size={16} />
                    Add
                  </Button>
                </div>
              </div>

              {/* Invoice Items Table */}
              {invoiceItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Service</th>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">₱{item.rate.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">₱{item.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInvoiceItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Separator />

            {/* Discount Options */}
            <div>
              <h3 className="mb-4">Discount</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount">Discount Type</Label>
                  <Select
                    value={selectedDiscount}
                    onValueChange={(value: string) => {
                      setSelectedDiscount(value);
                      setCustomDiscountAmount("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      {/*
                        Merge dynamic (admin) discounts with legacy DISCOUNT_OPTIONS and
                        deduplicate similar entries. Preference is given to dynamic discounts
                        coming from DiscountService. Legacy options will be filtered out if
                        a dynamic discount appears to represent the same policy (e.g. "Senior").
                      */}
                      {(() => {
                        // Build a set of lower-cased dynamic names for quick matching
                        const dynNames = new Set<string>(dynamicDiscounts.map(d => (d.name || d.code || '').toLowerCase()));

                        // Helper to extract a base label for legacy options (e.g. "Senior Citizen" from "Senior Citizen (20%)")
                        const legacyBase = (label: string) => label.split('(')[0].trim().toLowerCase();

                        // Render dynamic discounts first (admin-managed)
                        const dynamicItems = dynamicDiscounts.map((discount) => (
                          <SelectItem key={discount.id} value={discount.id}>
                            {discount.name} {discount.type === 'percentage' ? `(${discount.value}%)` : `(₱${discount.value})`}
                          </SelectItem>
                        ));

                        // Render legacy options but filter out ones that appear duplicated by name
                        const legacyItems = DISCOUNT_OPTIONS.filter(lo => {
                          const base = legacyBase(lo.label);
                          // If any dynamic discount name contains the legacy base label, consider it a duplicate
                          return !dynamicDiscounts.some(d => (d.name || '').toLowerCase().includes(base));
                        }).map((discount) => (
                          <SelectItem key={`legacy-${discount.value}`} value={discount.value}>
                            {discount.label}
                          </SelectItem>
                        ));

                        return [...dynamicItems, ...legacyItems, <SelectItem key="custom" value="custom">Custom Amount</SelectItem>];
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDiscount === "custom" && (
                  <div>
                    <Label htmlFor="customDiscount">Custom Discount Amount (₱)</Label>
                    <Input
                      id="customDiscount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={customDiscountAmount}
                      onChange={(e) => setCustomDiscountAmount(e.target.value)}
                      placeholder="Enter discount amount"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Invoice Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₱{calculateSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-₱{calculateDiscount().toLocaleString()}</span>
              </div>
              {calculateTax() > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>VAT on Medicines (12%):</span>
                  <span>₱{calculateTax().toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>₱{calculateTotal().toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setInvoiceItems([]);
                  setSelectedPatientId("");
                  setNewInvoice({ 
                    patientName: "", 
                    patientId: "", 
                    dueDate: new Date().toISOString().split('T')[0], 
                    notes: "" 
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateInvoice}
                disabled={isGenerating || invoiceItems.length === 0}
                className="bg-[#358E83] hover:bg-[#358E83]/90 text-white"
              >
                {isGenerating ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
  {/* Tight compact receipt dialog to match compact design */}
  <DialogContent className="max-w-[420px] w-[420px] max-h-[85vh] overflow-auto receipt-dialog p-4 text-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Receipt</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintReceipt}
                className="ml-4"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </DialogTitle>
            <DialogDescription>
              Invoice generated successfully. Review the details below.
            </DialogDescription>
          </DialogHeader>

          {generatedInvoice && (
            <div id="invoice-receipt-print" className="overflow-y-auto max-h-[75vh]">
              <TransactionRecord
                transactionNumber={generatedInvoice.number || `INV-${generatedInvoice.id}`}
                transactionType="Invoice"
                transactionDate={generatedInvoice.date}
                status={(generatedInvoice.status as any) || 'Pending'}
                patientName={generatedInvoice.patientName}
                patientId={resolvePatientDisplay(patients, generatedInvoice.patientId || generatedInvoice.id)}
                companyName="MEDICARE HOSPITAL"
                companyAddress="123 Health Street, Medical District, Philippines"
                items={generatedInvoice.items || []}
                subtotal={generatedInvoice.subtotal || 0}
                discount={generatedInvoice.discount || 0}
                discountPercentage={generatedInvoice.discountPercentage}
                tax={generatedInvoice.tax || 0}
                total={generatedInvoice.total}
                invoiceNumber={generatedInvoice.number || `INV-${generatedInvoice.id}`}
              />
            </div>
          )}

          {/* Action buttons (non-sticky) */}
          <div className="mt-4 pt-2 border-t print:hidden">
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowReceiptDialog(false)}>
                Close
              </Button>

              <Button
                size="sm"
                className="bg-[#358E83] hover:bg-[#358E83]/90 text-white"
                onClick={() => {
                  try {
                    const selId = (generatedInvoice && (generatedInvoice.id || generatedInvoice._id)) || '';
                    const selNumber = (generatedInvoice && (generatedInvoice.number || generatedInvoice.invoiceNumber)) || '';
                    if (selId) window.localStorage.setItem('selectedInvoiceForProcessing', String(selId));
                        if (selNumber) window.localStorage.setItem('selectedInvoiceForProcessingNumber', String(selNumber));
                        // dispatch an event as a fallback for consumers that listen for navigation
                        try { window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'payment', invoiceId: selId, invoiceNumber: selNumber } })); } catch (e) { /* ignore */ }
                      } catch (e) { /* ignore */ }
                      // primary navigation callback
                      if (onNavigateToView) onNavigateToView('payment');
                      else {
                        // fallback: attempt history push (best-effort SPA navigation)
                        try { window.history.pushState({}, '', '/payment-processing'); window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
                      }
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Process
                  </Button>

                  <Button
                    size="sm"
                    className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white"
                    onClick={handlePrintReceipt}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="bg-[#358E83] text-white">
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription className="text-white/80">
            View and manage generated invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search invoices by number, patient name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div />
            <div className="flex items-center gap-3">
              <div className="flex rounded-md bg-white border">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1 ${activeTab === 'active' ? 'bg-[#358E83] text-white' : 'text-gray-700'}`}
                >
                  Invoices
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`px-3 py-1 ${activeTab === 'archived' ? 'bg-[#358E83] text-white' : 'text-gray-700'}`}
                >
                  Archived Invoices
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {displayedInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No invoices found for this view.
              </div>
            ) : (
              displayedInvoices.map((invoice) => (
                <Card key={invoice.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Receipt className="text-[#358E83]" size={20} />
                          <div>
                            <p className="font-semibold">{invoice.number}</p>
                            <p className="text-sm text-gray-600">
                              {resolvePatientDisplay(patients, invoice.patientId || invoice.accountId || invoice.patient)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="font-semibold">₱{invoice.total.toLocaleString()}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-600">Due Date</p>
                          <p className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                        </div>

                        <div>
                          <Badge className={getStatusColor(invoice.status)}>
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(invoice.status)}
                              <span>{invoice.status.toUpperCase()}</span>
                            </span>
                          </Badge>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye size={16} />
                          </Button>

                          {activeTab === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res: any = await axios.post(`${API_BASE}/archive/invoices/${invoice.id}/restore`);
                                  if (res?.data?.success) {
                                    setInvoices((prev) => prev.map(inv => inv.id === invoice.id ? { ...inv, isArchived: false } : inv));
                                    toast.success('Invoice restored');
                                  } else {
                                    toast.error('Failed to restore invoice');
                                  }
                                } catch (err) {
                                  console.error('Error restoring invoice:', err);
                                  toast.error('Server error while restoring invoice');
                                }
                              }}
                              className="text-green-700 hover:text-green-900"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
    <DialogContent className="max-w-[420px] w-[420px] max-h-[85vh] overflow-auto receipt-dialog p-4 text-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              <div className="flex items-center space-x-2">
                  <Button
                  size="sm"
                  className="bg-[#358E83] hover:bg-[#358E83]/90 text-white"
                  onClick={() => {
                    try {
                      const selId = (generatedInvoice && (generatedInvoice.id || generatedInvoice._id)) || '';
                      const selNumber = (generatedInvoice && (generatedInvoice.number || generatedInvoice.invoiceNumber)) || '';
                      if (selId) window.localStorage.setItem('selectedInvoiceForProcessing', String(selId));
                      if (selNumber) window.localStorage.setItem('selectedInvoiceForProcessingNumber', String(selNumber));
                      try { window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'payment', invoiceId: selId, invoiceNumber: selNumber } })); } catch (e) {}
                    } catch (e) { /* ignore */ }
                    if ( onNavigateToView) onNavigateToView('payment');
                    else {
                      try { window.history.pushState({}, '', '/payment'); window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
                    }
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Process
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintReceipt}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              View complete invoice information and services
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div id="invoice-receipt-print" className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{selectedInvoice.number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-semibold">{resolvePatientDisplay(patients, selectedInvoice.patientId || selectedInvoice.accountId || selectedInvoice.patient)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Date</p>
                  <p>{formatDate(selectedInvoice.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p>{formatDate(selectedInvoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created On</p>
                  <p>{formatDateTime(selectedInvoice.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold capitalize">{selectedInvoice.status}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Services</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-center">Qty</th>
                        <th className="px-4 py-2 text-right">Rate</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice?.items?.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">₱{item.rate.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">₱{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₱{(selectedInvoice.subtotal || 0).toLocaleString()}</span>
                </div>
                {selectedInvoice.discount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-₱{selectedInvoice.discount.toLocaleString()}</span>
                  </div>
                )}
                {selectedInvoice.tax && selectedInvoice.tax > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>VAT on Medicines (12%):</span>
                    <span>₱{selectedInvoice.tax.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-sm">
                  <span>Total:</span>
                  <span>₱{selectedInvoice.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Invoice to Archive?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this invoice to the archive? You can restore the invoice later from the Archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteInvoice}
              className="bg-red-600 hover:bg-red-700"
            >
              Move to Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
