import { useState, useEffect } from "react";
import {
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Plus,
  Printer,
  Check,
  ChevronsUpDown,
  Calculator,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
// Dialog will handle portaling; no direct createPortal usage
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DiscountService, DiscountOption } from "../services/discountService";
import { toast } from "sonner";
import { fetchPayments, fetchPatients, fetchInvoices, createPayment, updateInvoice } from "../services/api.js";
import { UserSession } from "../hooks/useAuth";
import axios from "axios";


const API_URL = "http://localhost:5000/api";

interface PaymentProcessingProps {
  onNavigateToView: (view: string) => void;
  userSession: UserSession;
}

interface Payment {
  _id?: string;
  id?: string;
  invoiceNumber: string;
  patientName: string;
  patientId: string;
  amount: number;
  method: string;
  status: string;
  date: string;
  time: string;
  reference: string;
  discount?: number;
  subtotal?: number;
  tax?: number;
  cashReceived?: number;
  change?: number;
  processedBy?: string;
  notes?: string;
  items?: any[];
}

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash Payment', icon: Banknote, color: 'text-green-600' },
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, color: 'text-blue-600' },
  { id: 'gcash', name: 'GCash', icon: Smartphone, color: 'text-blue-500' },
  { id: 'paymaya', name: 'PayMaya', icon: Smartphone, color: 'text-green-500' },
  { id: 'bank', name: 'Bank Transfer', icon: Receipt, color: 'text-purple-600' }
];

export function PaymentProcessing({ userSession }: PaymentProcessingProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
  const [openInvoiceCombobox, setOpenInvoiceCombobox] = useState(false);
  const [openDiscountCombobox, setOpenDiscountCombobox] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountOption | null>(null);
  const [cashReceived, setCashReceived] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [subtotalAmount, setSubtotalAmount] = useState("");
  const [newPayment, setNewPayment] = useState({
    invoiceNumber: "",
    patientName: "",
    patientId: "",
    amount: "",
    method: "",
    reference: ""
  });
  const [processedPayment, setProcessedPayment] = useState<Payment | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  // receipt dialog is rendered via Dialog component (matches InvoiceGeneration)
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // patients state to fetch demographics from DB
  const [patients, setPatients] = useState<any[]>([]);
  const [dynamicDiscounts, setDynamicDiscounts] = useState<DiscountOption[]>([]);

  // normalize server payment
  const normalizePayment = (p: any) => {
    const creatorName = p.createdBy || p.createdByName || userSession?.name || "system";
    const creatorRole = p.createdByRole || userSession?.role || "user";

    const id = p._id || p.id || p.paymentId || "";
    const invoiceNumber = p.invoiceNumber || p.invoiceNo || p.number || p.ref || p.reference || "";
    const patientName = p.patientName || p.patient || p.name || "";
    const patientId = p.patientId || p.accountId || p.patient_id || "";
    const amount = Number(p.amount ?? p.total ?? p.paymentAmount ?? p.paid ?? 0);
    const subtotal = Number(p.subtotal ?? p.amount ?? p.total ?? 0);
    const discount = Number(p.discount ?? p.discountAmount ?? 0);
    const tax = Number(p.tax ?? 0);
    const method = p.method || p.paymentMethod || "";
    const status = (p.status || "completed").toString();
    const date = p.paymentDate || p.date || p.createdAt || new Date().toISOString();
    const time = p.time || (p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : "");
    const reference = p.reference || p.ref || "";
    const items = Array.isArray(p.items) ? p.items : (Array.isArray(p.lines) ? p.lines : []);

    return {
      _id: p._id,
      id,
      invoiceNumber,
      patientName,
      patientId,
      amount,
      subtotal,
      discount,
      tax,
      method,
      status,
      date,
      time,
      reference,
      items,
      createdBy: creatorName,
      createdByRole: creatorRole,
      raw: p
    } as Payment;
  };

  // API helpers with fallback between endpoints
  const createPayment = async (paymentData: any) => {
    try {
      return await axios.post(`${API_URL}/payments`, paymentData);
    } catch (err) {
      return await axios.post(`${API_URL}/billing/payments`, paymentData);
    }
  };
  
  // consolidated API helpers (use shared services with axios fallback)
  const createPaymentApi = async (paymentData: any) => {
    try {
      if (typeof createPayment === "function") {
        return await createPayment(paymentData);
      }
      return await axios.post(`${API_URL}/payments`, paymentData);
    } catch (err) {
      try { return await axios.post(`${API_URL}/billing/payments`, paymentData); } catch (e) { throw e; }
    }
  };

  const fetchInvoicesFromDb = async () => {
    try {
      if (typeof fetchInvoices === "function") {
        const invs = await fetchInvoices();
        setAvailableInvoices(Array.isArray(invs) ? invs : (invs?.data || []));
        return;
      }
      const res = await axios.get(`${API_URL}/invoices`);
      const payload = res?.data;
      setAvailableInvoices(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch (err) {
      console.error("Error fetching invoices", err);
      setAvailableInvoices([]);
      toast.error("Failed to load invoices");
    }
  };

  const fetchPaymentsFromDb = async () => {
    try {
      if (typeof fetchPayments === "function") {
        const pays = await fetchPayments();
        const arr = Array.isArray(pays) ? pays : (pays?.data || []);
        setPayments(arr.map((p:any)=>normalizePayment(p)));
        return;
      }
      const res = await axios.get(`${API_URL}/payments`);
      const payload = res?.data;
      const arr = Array.isArray(payload) ? payload : (payload?.data || []);
      setPayments(arr.map((p:any)=>normalizePayment(p)));
    } catch (err) {
      console.error("Error fetching payments", err);
      setPayments([]);
      toast.error("Failed to load payments");
    }
  };

  const deletePaymentApi = async (id: string) => {
    try {
      return await axios.delete(`${API_URL}/payments/${id}`);
    } catch {
      return await axios.delete(`${API_URL}/billing/payments/${id}`);
    }
  };

  const fetchPatientsFromDb = async () => {
    try {
      if (typeof fetchPatients === "function") {
        const p = await fetchPatients();
        setPatients(Array.isArray(p) ? p : (p?.data || []));
        return;
      }
      const res = await axios.get(`${API_URL}/patients`);
      const payload = res?.data;
      setPatients(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch (err) {
      console.warn("Failed to fetch patients list:", err);
      setPatients([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchPaymentsFromDb(), fetchInvoicesFromDb(), fetchPatientsFromDb()]);
      } catch (e) {
        console.error("PaymentProcessing load error", e);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dialog component will handle portaling and focus management. No custom portal needed.

  // Load discounts and listen for admin changes so payments reflect new discounts immediately
  useEffect(() => {
    const loadDiscounts = () => {
      try {
        const list = DiscountService.getActiveDiscounts();
        setDynamicDiscounts(list || []);
      } catch (err) {
        console.error('Failed to load discounts', err);
      }
    };

    loadDiscounts();
    const handler = () => loadDiscounts();
    window.addEventListener('discounts-updated', handler as EventListener);
    return () => window.removeEventListener('discounts-updated', handler as EventListener);
  }, []);

  // helper to get patient age & sex from patients state
  const getPatientDemographics = (patientId: string) => {
    if (!patientId) return { age: 0, sex: "Unknown" };
    const p = patients.find((x:any) => (x.patientId === patientId) || (x.id === patientId) || (x._id === patientId));
    if (!p) return { age: 0, sex: "Unknown" };
    // compute age if birthDate/birthdate exists
    const dob = p.birthDate || p.dateOfBirth || p.birthdate;
    let age = 0;
    if (dob) {
      const b = new Date(dob);
      const today = new Date();
      age = today.getFullYear() - b.getFullYear();
      const mo = today.getMonth() - b.getMonth();
      if (mo < 0 || (mo === 0 && today.getDate() < b.getDate())) age--;
    }
    const sex = p.gender || p.sex || p.sex || "Unknown";
    return { age, sex };
  };

  // prefer demographics from a processed payment (embedded patient object) then fallback to patients list
  const getDemographicsForPayment = (p: Payment | null) => {
    if (!p) return { age: 0, sex: 'Unknown' };

    // Try common embedded patient shapes in the payment raw object
    const raw = (p.raw && (p.raw.patient || p.raw.patientInfo || p.raw.patientDetails)) || p.raw;
    if (raw && typeof raw === 'object') {
      // try multiple possible dob field names
      const dob = raw.dateOfBirth || raw.birthDate || raw.dob || raw.birth_date || raw.birthdate;
      let age = 0;
      if (dob) {
        const b = new Date(dob);
        if (!isNaN(b.getTime())) {
          const today = new Date();
          age = today.getFullYear() - b.getFullYear();
          const mo = today.getMonth() - b.getMonth();
          if (mo < 0 || (mo === 0 && today.getDate() < b.getDate())) age--;
        }
      }
      const sex = (raw.gender || raw.sex || raw.sexAssignedAtBirth || raw.gender_identity || 'Unknown');
      if (age || sex !== 'Unknown') return { age: age || 0, sex };
    }

    // fallback: try to find patient from loaded patients list by id, _id, patientId or by name
    const byId = getPatientDemographics(p.patientId || '');
    if (byId && (byId.age && byId.age > 0 || (byId.sex && byId.sex !== 'Unknown'))) return byId;

    // as an extra fallback, try to match by patientName (case-insensitive)
    if (p.patientName) {
      const match = patients.find((x:any) => {
        const name = (x.name || `${x.firstName || ''} ${x.lastName || ''}`).toString().toLowerCase();
        return name && name.includes((p.patientName || '').toString().toLowerCase());
      });
      if (match) {
        const dob = match.birthDate || match.dateOfBirth || match.birthdate;
        let age = 0;
        if (dob) {
          const b = new Date(dob);
          if (!isNaN(b.getTime())) {
            const today = new Date();
            age = today.getFullYear() - b.getFullYear();
            const mo = today.getMonth() - b.getMonth();
            if (mo < 0 || (mo === 0 && today.getDate() < b.getDate())) age--;
          }
        }
        const sex = match.gender || match.sex || 'Unknown';
        return { age: age || 0, sex };
      }
    }

    return { age: 0, sex: 'Unknown' };
  };

  // helper to find a sensible 'date issued' or invoice date for the receipt
  const formatIssuedDate = (p: Payment | null) => {
    if (!p) return 'N/A';
  const raw = (p as any).raw || {};
  const candidates = [raw.invoiceDate, raw.dateIssued, raw.issuedAt, raw.paymentDate, p.date, raw.createdAt, raw.date];
    for (const c of candidates) {
      if (!c) continue;
      const d = new Date(c);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    return 'N/A';
  };

  // recalc amount when subtotal/discount changes
  useEffect(() => {
    if (!subtotalAmount) {
      setNewPayment(prev => ({ ...prev, amount: "" }));
      return;
    }
    const subtotal = parseFloat(subtotalAmount) || 0;
    let discountAmt = 0;
    if (selectedDiscount) {
      discountAmt = DiscountService.calculateDiscount(subtotal, selectedDiscount);
    } else if (discountValue) {
      discountAmt = discountType === 'percentage'
        ? (subtotal * (parseFloat(discountValue) || 0) / 100)
        : (parseFloat(discountValue) || 0);
    }
    let taxAmt = 0;
    const inv = availableInvoices.find(iv => (iv.number === selectedInvoiceNumber) || (iv.invoiceNumber === selectedInvoiceNumber) || (iv._id === selectedInvoiceNumber));
    if (inv && Array.isArray(inv.items)) {
      const taxable = inv.items.filter((it:any)=>isTaxableItem(it)).reduce((s:number,it:any)=> s + (Number(it.totalPrice || it.amount || it.price || 0)), 0);
      if (taxable > 0) {
        const taxableAfterDiscount = subtotal > 0 ? Math.max(0, taxable - (discountAmt * (taxable / subtotal))) : taxable;
        taxAmt = taxableAfterDiscount * 0.12;
      }
    }
    const total = Math.max(0, subtotal - discountAmt + taxAmt);
    setNewPayment(prev => ({ ...prev, amount: total.toFixed(2) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalAmount, discountValue, discountType, selectedDiscount, selectedInvoiceNumber, availableInvoices]);

  const totalAmount = payments.reduce((s,p)=> s + (p.amount||0), 0);
  const completedPayments = payments.filter(p => p.status === 'completed');
  const processingPayments = payments.filter(p => p.status === 'processing');
  const failedPayments = payments.filter(p => p.status === 'failed');

  const handleConfirmPayment = () => {
    if (!selectedPaymentMethod) { toast.error("Please select a payment method."); return; }
    if (!newPayment.amount || parseFloat(newPayment.amount || "0") <= 0) { toast.error("Invalid payment amount."); return; }
    if (selectedPaymentMethod === 'cash') {
      const received = parseFloat(cashReceived || "0");
      const amount = parseFloat(newPayment.amount || "0");
      if (!cashReceived || isNaN(received) || received < amount) { toast.error("Cash received must be equal or greater than amount."); return; }
    }
    setShowConfirmDialog(true);
  };

  const handleProcessPayment = async () => {
    try {
      // determine selected invoice from the combobox selection
      const selInvoice = availableInvoices.find(inv =>
        (inv._id && (inv._id === selectedInvoiceNumber)) ||
        (inv.id && (inv.id === selectedInvoiceNumber)) ||
        (inv.number && (inv.number === selectedInvoiceNumber)) ||
        (inv.invoiceNumber && (inv.invoiceNumber === selectedInvoiceNumber))
      );

      if (!selInvoice && !selectedInvoiceNumber) {
        console.error("handleProcessPayment: no selected invoice");
        toast.error("No invoice selected");
        return;
      }

      const invoiceId = selInvoice?._id || selInvoice?.id || selectedInvoiceNumber;
      if (!invoiceId) {
        console.error("handleProcessPayment: invoice id missing", selInvoice);
        toast.error("Invalid invoice selected");
        return;
      }

      // determine amount to pay from newPayment.amount or subtotalAmount; if missing, compute from invoice items
      let amountValue = parseFloat(String(newPayment.amount || "")) || parseFloat(subtotalAmount || "0") || 0;
      if ((!amountValue || amountValue === 0) && selInvoice) {
        // compute subtotal from items if available
        const items = Array.isArray(selInvoice.items) ? selInvoice.items : (selInvoice.lines || []);
        const computed = items.reduce((s:number,it:any) => s + Number(it.totalPrice ?? it.amount ?? it.price ?? 0), 0);
        amountValue = computed || amountValue;
      }
      const method = selectedPaymentMethod || newPayment.method || "cash";
  const note = (newPayment.reference || "").toString();

      // include patientName/patientId when possible
      const paymentPayload = {
        invoiceId,
        invoiceNumber: selectedInvoiceNumber || selInvoice?.number || selInvoice?.invoiceNumber,
        patientId: (newPayment.patientId || (selInvoice && (selInvoice.patientId || selInvoice.accountId)) || undefined),
        patientName: (newPayment.patientName || (() => {
          // invoice may embed patient object or just id/name fields
          if (!selInvoice) return '';
          if (selInvoice.patientName) return selInvoice.patientName;
          if (selInvoice.patient && typeof selInvoice.patient === 'string') return selInvoice.patient;
          if (selInvoice.patient && typeof selInvoice.patient === 'object') return selInvoice.patient.name || `${selInvoice.patient.firstName || ''} ${selInvoice.patient.lastName || ''}`.trim();
          // fallback: try to resolve from patients list
          const pid = selInvoice.patientId || selInvoice.accountId || (selInvoice.patient && selInvoice.patient._id);
          const p = patients.find((x: any) => x._id === pid || x.id === pid || x.patientId === pid);
          return p ? (p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim()) : (selInvoice.patientName || selInvoice.patient || '');
        })()),
        amount: amountValue,
        method,
        status: "completed",
        paymentDate: new Date().toISOString(),
        reference: newPayment.reference || undefined,
        note
      };

      // determine items + subtotal from selected invoice as fallback
      const itemsFromInvoice = selInvoice ? (Array.isArray(selInvoice.items) ? selInvoice.items : (selInvoice.lines || [])) : [];
      const computedSubtotal = (itemsFromInvoice && itemsFromInvoice.length > 0)
        ? itemsFromInvoice.reduce((s:number,it:any) => s + Number(it.totalPrice ?? it.amount ?? it.price ?? 0), 0)
        : (parseFloat(subtotalAmount || '0') || amountValue || 0);

      // include items/subtotal in payload so backend (or our local state) can preserve them for receipt
      const payloadWithItems = { ...paymentPayload, items: itemsFromInvoice, subtotal: computedSubtotal };

      // create payment (local createPayment uses axios and returns axios response)
      const createdResp = await createPaymentApi(payloadWithItems);
      const createdData = createdResp?.data || createdResp;
      console.debug("Payment create response:", createdData);

      if (!((createdResp as any)?.status === 200 || (createdResp as any)?.status === 201 || (createdData as any)?.success)) {
        // some backends return the object directly
        if (!(createdData) || (!((createdData as any)._id) && !((createdData as any).id) && !((createdData as any).data))) {
          throw new Error("Payment creation failed");
        }
      }

      // mark invoice as paid/completed if backend supports it
      try {
        if (typeof updateInvoice === "function") {
          await updateInvoice(invoiceId, { status: "paid" });
        } else {
          // fallback: try PUT to invoices endpoint directly
          await axios.put(`${API_URL}/invoices/${invoiceId}`, { status: "paid" });
        }
      } catch (e) {
        console.warn("updateInvoice failed (non-fatal):", e);
      }

      // normalize created payment and update local state
  const createdPaymentObj = ((createdData as any).data) ? (createdData as any).data : (((createdData as any)._id) ? createdData : createdData);
      const normalized = normalizePayment(createdPaymentObj);

      // if backend didn't return items/subtotal, merge from selInvoice so receipt shows correct line items
      if ((Array.isArray(normalized.items) && normalized.items.length === 0) && itemsFromInvoice && itemsFromInvoice.length > 0) {
        normalized.items = itemsFromInvoice;
      }
      if (!normalized.subtotal || normalized.subtotal === 0) {
        normalized.subtotal = computedSubtotal;
      }
      if (!normalized.patientId && payloadWithItems.patientId) normalized.patientId = payloadWithItems.patientId;
      if ((!normalized.patientName || normalized.patientName === '') && payloadWithItems.patientName) normalized.patientName = payloadWithItems.patientName;
      // attach cash received and change when paying by cash so receipt can show them
      if (method === 'cash') {
        const cashRec = Number(cashReceived || 0);
        (normalized as any).cashReceived = (normalized as any).cashReceived || cashRec;
        const paid = Number(normalized.amount || normalized.subtotal || 0);
        (normalized as any).change = Math.max(0, cashRec - paid);
      }
      setPayments(prev => [normalized, ...prev]);
      setProcessedPayment(normalized);

      // refresh lists
      await fetchPaymentsFromDb();
      await fetchInvoicesFromDb();

      toast.success("Payment processed");
      setShowConfirmDialog(false);
      setShowProcessForm(false);
      setShowReceiptDialog(true);
    } catch (e) {
      console.error("process payment error", e);
      toast.error("Payment failed");
    }
  };

  const handlePrintReceipt = () => {
    if (!processedPayment) {
      toast.error("No processed payment to print");
      return;
    }

    const receiptContent = document.getElementById("payment-receipt-print");
    if (!receiptContent) {
      toast.error("Receipt content not found");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Payment Receipt - MediCare Hospital</title>
          <style>
            @page { size: A4 landscape; margin: 18mm; }
            /* Printed typography tuned to match hospital receipt */
            body {
              font-family: 'Times New Roman', Georgia, serif;
              color: #000;
              background: #fff;
              font-size: 12px;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
            }
            .receipt-container {
              max-width: 1100px;
              margin: 0 auto;
              padding: 8px 12px;
            }
            header .hospital-name { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
            header .hospital-meta { font-size: 11px; color: #333; margin-top: 4px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            thead th { padding: 8px 6px; border-bottom: 2px solid #000; font-weight: 700; text-transform: uppercase; font-size: 12px; }
            tbody td { padding: 8px 6px; border-bottom: 1px solid #ddd; vertical-align: middle; }
            td.description { font-size: 12px; }
            td.amount, .text-right { text-align: right; }

            .category-row td { font-weight: 600; }
            .totals-row td { font-weight: 700; border-top: 2px solid #000; }

            .grand-total { margin-top: 10px; text-align: right; font-size: 18px; font-weight: 800; }

            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .meta-grid .left, .meta-grid .right { font-size: 12px; }

            .payment-details { margin-top: 14px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 12px; }
            .payment-details .label { color: #333; font-weight: 600; }
            .payment-details .value { text-align: right; }

            .footer { margin-top: 18px; text-align: center; font-size: 11px; color: #333; }
          </style>
        </head>
        <body>
          <div class="receipt-container small" style="max-width:1100px; margin:0 auto;">
            ${receiptContent.innerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };





  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      const res = await deletePaymentApi(paymentToDelete);
      const payload = res?.data;
  if (((payload as any)?.success) || res.status === 200 || res.status === 204) {
        setPayments(prev => prev.filter(p => (p._id || p.id) !== paymentToDelete));
        toast.success("Payment deleted");
      } else {
        toast.error("Failed to delete payment");
      }
    } catch (err) {
      console.error("Delete error", err);
      toast.error("Server error while deleting payment");
    } finally {
      setShowDeleteDialog(false);
      setPaymentToDelete(null);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      (payment.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.patientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.reference || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-600" size={16} />;
      case 'processing': return <Clock className="text-yellow-600" size={16} />;
      case 'pending': return <Clock className="text-blue-600" size={16} />;
      case 'failed': return <AlertCircle className="text-red-600" size={16} />;
      default: return <Clock className="text-gray-600" size={16} />;
    }
  };
  // Helper to check if an item is taxable
const isTaxableItem = (item: any): boolean => {
  if (!item || typeof item !== "object") return false;
  const category = (item.category || "").toLowerCase();
  const nonTaxable = ["consultation", "laboratory", "diagnostic", "service", "procedure"];
  return !nonTaxable.some(nt => category.includes(nt));
};

  const getMethodIcon = (method: string) => {
    const m = PAYMENT_METHODS.find(x => x.id === method);
    if (!m) return <Receipt className="text-gray-600" size={20} />;
    const Icon = m.icon; return <Icon className={m.color} size={20} />;
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600">Total Payments</p><p className="text-2xl font-bold">₱{totalAmount.toLocaleString()}</p></div>
          <Receipt className="text-[#358E83]" size={32} />
        </div></CardContent></Card>

        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600">Completed</p><p className="text-2xl font-bold text-green-600">{completedPayments.length}</p></div>
          <CheckCircle className="text-green-600" size={32} />
        </div></CardContent></Card>

        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600">Processing</p><p className="text-2xl font-bold text-yellow-600">{processingPayments.length}</p></div>
          <Clock className="text-yellow-600" size={32} />
        </div></CardContent></Card>

        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600">Failed</p><p className="text-2xl font-bold text-red-600">{failedPayments.length}</p></div>
          <AlertCircle className="text-red-600" size={32} />
        </div></CardContent></Card>
      </div>

      {!showProcessForm && (
        <div className="flex justify-end">
          <Button onClick={() => setShowProcessForm(true)} className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white">
            <Plus className="mr-2" size={16} /> Process New Payment
          </Button>
        </div>
      )}

      {!showProcessForm && (
        <Card>
          <CardHeader className="bg-[#358E83] text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center"><Receipt className="mr-2" size={20} /> Recent Payments</CardTitle>
                <CardDescription className="text-white/80">View and manage payment transactions</CardDescription>
              </div>
              <div className="flex space-x-3">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input placeholder="Search payments..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="pl-10 w-64 bg-white" />
                  <span className="ml-3 text-sm text-white/80 bg-black/10 px-2 py-1 rounded">{filterStatus === 'all' ? 'All' : filterStatus}</span>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="mx-auto mb-3 opacity-50" size={48} />
                  <p>No payments found</p>
                </div>
              ) : (
                filteredPayments.map(payment => (
                  <div key={payment._id || payment.id || payment.reference} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getMethodIcon(payment.method)}
                          <div>
                            <h4 className="font-semibold">{payment.invoiceNumber}</h4>
                            <p className="text-sm text-gray-600">{payment.patientName} ({payment.patientId})</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-gray-500">Amount</p><p className="font-semibold">₱{payment.amount.toLocaleString()}</p></div>
                          <div><p className="text-gray-500">Method</p><p className="font-medium capitalize">{payment.method}</p></div>
                          <div><p className="text-gray-500">Date & Time</p><p className="font-medium">{new Date(payment.date).toLocaleDateString('en-PH')} {payment.time}</p></div>
                          <div><p className="text-gray-500">Reference</p><p className="font-medium">{payment.reference}</p></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        <Badge className={getStatusColor(payment.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(payment.status)}
                            <span className="ml-1 capitalize">{payment.status}</span>
                          </span>
                        </Badge>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => { setProcessedPayment(payment); setShowReceiptDialog(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Payment Form -- (kept as before) */}
      {showProcessForm && (
        <Card>
          <CardHeader className="bg-[#358E83] text-white">
            <CardTitle className="flex items-center"><CreditCard className="mr-2" size={20} /> Process Payment</CardTitle>
            <CardDescription className="text-white/80">Accept payment for patient invoices</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Invoice selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Select Invoice</Label>
                <Popover open={openInvoiceCombobox} onOpenChange={setOpenInvoiceCombobox}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openInvoiceCombobox} className="w-full justify-between">
                      {(() => {
                        const sel = availableInvoices.find((inv) => inv.number === selectedInvoiceNumber || inv.invoiceNumber === selectedInvoiceNumber || inv._id === selectedInvoiceNumber);
                        if (sel) {
                          const amt = (typeof sel.amount === 'number') ? sel.amount.toLocaleString() : (sel.amount ? String(sel.amount) : '0.00');
                          const pname = sel.patientName || sel.patient || '';
                          const num = sel.number || sel.invoiceNumber || sel._id || '';
                          return `${num} - ${pname} (₱${amt})`;
                        }
                        return "Search and select an invoice...";
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-screen max-w-[95vw] p-0 left-1/2 transform -translate-x-1/2">
                    <Command>
                      <CommandInput className="w-full text-lg py-3" placeholder="Search by invoice number or patient..." value={invoiceSearch} onChange={(e:any)=>setInvoiceSearch(e.target.value)} />
                      <CommandList>
                        <CommandEmpty>No invoice found.</CommandEmpty>
                        <CommandGroup>
                          {availableInvoices.filter(inv => {
                            const q = (invoiceSearch || "").toLowerCase();
                            const num = (inv.number || inv.invoiceNumber || inv._id || "").toString().toLowerCase();
                            const pname = (inv.patientName || inv.patient || "").toString().toLowerCase();
                            return q === "" || num.includes(q) || pname.includes(q);
                          }).map((invoice) => (
                            <CommandItem
                              key={invoice.number || invoice.invoiceNumber || invoice._id || invoice.id}
                              value={`${invoice.number || invoice.invoiceNumber || invoice._id || ""} ${invoice.patientName || invoice.patient || ""}`}
                              onSelect={() => {
                                const invoiceId = invoice.number || invoice.invoiceNumber || invoice.invoiceNo || invoice._id || invoice.id || "";
                                const patientId = invoice.patientId || invoice.patient || invoice.accountId || "";
                                const patientName = invoice.patientName || invoice.patient || "";

                                setSelectedInvoiceNumber(invoiceId);
                                setNewPayment(prev => ({
                                  ...prev,
                                  invoiceNumber: invoiceId,
                                  patientName,
                                  patientId
                                }));

                                // compute subtotal: prefer explicit subtotal/amount, otherwise derive from items
                                const computeSubtotal = (inv:any) => {
                                  if (inv == null) return 0;
                                  if (inv.subtotal !== undefined && inv.subtotal !== null) return Number(inv.subtotal);
                                  if (inv.amount !== undefined && inv.amount !== null) return Number(inv.amount);
                                  if (Array.isArray(inv.items) && inv.items.length > 0) return inv.items.reduce((s:number,it:any) => s + Number(it.totalPrice ?? it.amount ?? it.price ?? 0), 0);
                                  if (Array.isArray(inv.lines) && inv.lines.length > 0) return inv.lines.reduce((s:number,it:any) => s + Number(it.totalPrice ?? it.amount ?? it.price ?? 0), 0);
                                  return 0;
                                };
                                const subtotalVal = computeSubtotal(invoice);
                                if (subtotalVal && subtotalVal > 0) {
                                  setSubtotalAmount(String(subtotalVal));
                                  setNewPayment(prev => ({ ...prev, amount: String(subtotalVal) }));
                                } else {
                                  setSubtotalAmount("");
                                  setNewPayment(prev => ({ ...prev, amount: "" }));
                                }

                                if (invoice.discount && invoice.discount > 0) {
                                  if (invoice.discountPercentage) { setDiscountType('percentage'); setDiscountValue(String(invoice.discountPercentage)); }
                                  else { setDiscountType('fixed'); setDiscountValue(String(invoice.discount)); }
                                  setDiscountLabel(invoice.discountType || "");
                                } else { setDiscountValue(""); setDiscountLabel(""); }

                                setOpenInvoiceCombobox(false);
                                setInvoiceSearch("");
                                toast.success(`Invoice ${invoiceId} selected`);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${(selectedInvoiceNumber === (invoice.number || invoice.invoiceNumber || invoice._id || "")) ? "opacity-100" : "opacity-0"}`} />
                              <div>
                                <div className="font-medium">{invoice.number || invoice.invoiceNumber || invoice._id}</div>
                              <div className="text-sm text-gray-500">
                                  {invoice.patientName || (invoice.patient && (typeof invoice.patient === 'string' ? invoice.patient : invoice.patient.name))} ({invoice.patientId || ''}) - ₱{(() => {
                                    const sub = (invoice.subtotal !== undefined && invoice.subtotal !== null) ? Number(invoice.subtotal) : (invoice.amount !== undefined && invoice.amount !== null ? Number(invoice.amount) : (Array.isArray(invoice.items) ? invoice.items.reduce((s:number,it:any)=> s + Number(it.totalPrice ?? it.amount ?? it.price ?? 0), 0) : 0));
                                    return sub.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  })()}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-gray-500 mt-1">Search from {availableInvoices.length} available invoices</p>
              </div>

              <div>
                <Label>Patient Name</Label>
                <Input value={newPayment.patientName} disabled placeholder="Auto-filled from invoice" className="bg-gray-50" />
              </div>

              <div>
                <Label>Subtotal Amount (₱)</Label>
                <Input type="number" value={subtotalAmount} onChange={(e) => setSubtotalAmount(e.target.value)} placeholder="Enter subtotal amount" />
              </div>
            </div>

            {/* Discount & breakdown */}
            {subtotalAmount && subtotalAmount !== "" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-blue-900">Payment Breakdown</h4>
                <div>
                  <Label>Select Discount/Promotion</Label>
                  <Popover open={openDiscountCombobox} onOpenChange={setOpenDiscountCombobox}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={openDiscountCombobox} className="w-full justify-between bg-white">
                        {selectedDiscount ? `${selectedDiscount.name} (${selectedDiscount.type === 'percentage' ? `${selectedDiscount.value}%` : `₱${selectedDiscount.value}`})` : "Search discounts (PWD, Senior, etc.)..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search by name, code, or category..." />
                        <CommandList>
                          <CommandEmpty>No discount found.</CommandEmpty>
                          <CommandGroup>
                            {dynamicDiscounts.map(discount => (
                              <CommandItem key={discount.id} value={`${discount.name} ${discount.code}`} onSelect={() => { setSelectedDiscount(discount); setOpenDiscountCombobox(false); toast.success(`${discount.name} selected`); }}>
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <div className="font-medium">{discount.name}</div>
                                    <div className="text-xs text-gray-500">{discount.code} • {discount.description}</div>
                                  </div>
                                  <div className="font-semibold text-green-600">{discount.type === 'percentage' ? `${discount.value}%` : `₱${discount.value}`}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>

                          <CommandGroup>
                            <CommandItem value="custom-discount-manual-entry" onSelect={() => {
                              setSelectedDiscount(null);
                              setDiscountValue("");
                              setDiscountLabel("");
                              setOpenDiscountCombobox(false);
                              toast.info("Enter custom discount manually");
                            }}>
                              <Calculator className="mr-2 h-4 w-4 text-gray-500" />
                              <span>Enter Custom Discount</span>
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="border-t border-blue-300 pt-3 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-700">Subtotal:</span><span className="font-medium">₱{parseFloat(subtotalAmount||'0').toLocaleString('en-PH',{minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
                  {discountValue && discountValue !== "" && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Discount{discountLabel ? ` (${discountLabel})` : ''}{discountType === 'percentage' ? ` - ${discountValue}%` : ''}:</span>
                      <span className="font-medium">-₱{(() => { const subtotal = parseFloat(subtotalAmount)||0; const disc = discountType === 'percentage' ? (subtotal * parseFloat(discountValue))/100 : parseFloat(discountValue); return disc.toLocaleString('en-PH',{minimumFractionDigits:2, maximumFractionDigits:2}); })()}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-300 pt-2 mt-2" />
                  <div className="flex justify-between font-semibold text-blue-900"><span>Total Amount to Pay:</span><span className="text-lg">₱{parseFloat(newPayment.amount||'0').toLocaleString('en-PH',{minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
                </div>
              </div>
            )}

            <Separator />

            <div>
              <Label className="mb-3 block">Select Payment Method</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  return (
                    <button key={method.id} onClick={() => setSelectedPaymentMethod(method.id)} className={`p-4 border-2 rounded-lg transition-all ${selectedPaymentMethod === method.id ? 'border-[#E94D61] bg-[#E94D61]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Icon className={`mx-auto mb-2 ${method.color}`} size={32} />
                      <p className="text-sm font-medium text-center">{method.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedPaymentMethod === 'cash' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-green-900">Cash Payment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Amount to Pay (₱)</Label>
                    <Input type="number" value={newPayment.amount} disabled className="bg-white" />
                  </div>
                  <div>
                    <Label>Cash Received (₱)</Label>
                    <Input type="number" value={cashReceived} onChange={(e)=>setCashReceived(e.target.value)} placeholder="Enter cash received" className="bg-white" />
                  </div>
                  <div>
                    <Label>Change (₱)</Label>
                    <Input type="number" value={cashReceived && newPayment.amount ? Math.max(0, parseFloat(cashReceived) - parseFloat(newPayment.amount)).toFixed(2) : '0.00'} disabled className="bg-white font-semibold text-green-600" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowProcessForm(false)}>Cancel</Button>
              <Button onClick={handleConfirmPayment} disabled={isProcessing || !selectedPaymentMethod || !newPayment.amount} className="bg-[#358E83] hover:bg-[#358E83]/90 text-white">Confirm Payment</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm AlertDialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment Processing</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="px-6 pb-4 text-sm">
              <p className="text-gray-600 mb-4">Please review the payment details before confirming:</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-gray-600">Invoice Number:</div>
                <div className="text-right font-medium">{newPayment.invoiceNumber || selectedInvoiceNumber || processedPayment?.invoiceNumber || ''}</div>

                <div className="text-gray-600">Patient:</div>
                <div className="text-right font-medium">{newPayment.patientName || processedPayment?.patientName || ''}</div>

                <div className="text-gray-600">Payment Method:</div>
                <div className="text-right font-medium capitalize">{selectedPaymentMethod || newPayment.method || 'cash'}</div>
              </div>

              <hr className="my-3" />

              <div className="grid grid-cols-2 items-center">
                <div className="text-gray-600">Subtotal:</div>
                <div className="text-right font-medium">₱{Number(processedPayment?.subtotal || subtotalAmount || newPayment.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-sm text-gray-600">Amount:</div>
                </div>
                <div className="text-2xl font-bold text-[#358E83]">₱{Number(newPayment.amount || processedPayment?.amount || subtotalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
              </div>

              {selectedPaymentMethod === 'cash' && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">Cash Received:</div>
                  <div className="text-right">₱{Number(cashReceived || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>

                  <div className="text-gray-600">Change:</div>
                  <div className="text-right text-green-600 font-medium">₱{(() => {
                    const paid = Number(newPayment.amount || processedPayment?.amount || subtotalAmount || 0);
                    const rec = Number(cashReceived || 0);
                    const change = Math.max(0, rec - paid);
                    return change.toLocaleString('en-PH', { minimumFractionDigits: 2 });
                  })()}</div>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleProcessPayment}>{isProcessing ? "Processing..." : "Confirm & Process"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Dialog (uses same Dialog layout as InvoiceGeneration) */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-full w-[min(1100px,80vw)] max-h-[90vh] overflow-y-auto receipt-dialog p-6 mx-auto">
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
            <div className="text-sm text-gray-500">Receipt generated successfully. Review the details below.</div>
          </DialogHeader>

          <div id="payment-receipt-print" className="space-y-6 print:p-8">
            {processedPayment ? (
              <>
                <div className="text-center border-b pb-4">
                  <h2 className="text-2xl font-bold text-[#358E83]">MediCare Hospital</h2>
                  <p className="text-sm text-gray-600">123 Health Street, Medical District, Philippines</p>
                  <p className="text-sm text-gray-600">Tel: (02) 1234-5678 | Email: billing@medicare.ph</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Invoice Number:</p>
                    <p className="font-semibold">{processedPayment.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date Issued:</p>
                    <p className="font-semibold">{formatIssuedDate(processedPayment)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Patient Name:</p>
                    <p className="font-semibold">{processedPayment.patientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Patient ID:</p>
                    <p className="font-semibold">{processedPayment.patientId || processedPayment.id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Age / Sex:</p>
                    <p className="font-semibold">{getDemographicsForPayment(processedPayment).age} / {getDemographicsForPayment(processedPayment).sex}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status:</p>
                    <Badge className={getStatusColor(processedPayment.status)}>{(processedPayment.status || 'paid').toUpperCase()}</Badge>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Services Rendered</h3>
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
                        {Array.isArray(processedPayment.items) && processedPayment.items.length > 0 ? processedPayment.items.map((item:any, idx:number) => (
                          <tr key={item.id || idx} className="border-t">
                            <td className="px-4 py-2">
                              <div>{item.description || item.name || item.medicationName || 'Item'}</div>
                              <div className="text-xs text-gray-500">{item.category || item.group || ''}</div>
                            </td>
                            <td className="px-4 py-2 text-center">{item.quantity ?? item.qty ?? 1}</td>
                            <td className="px-4 py-2 text-right">₱{Number(item.rate ?? item.unitPrice ?? item.price ?? item.totalPrice ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2 text-right">₱{Number(item.amount ?? item.totalPrice ?? (item.quantity ?? 1) * (item.rate ?? item.unitPrice ?? item.price ?? 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td className="px-4 py-2">No items</td>
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2 text-right">₱0.00</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-96 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₱{Number(processedPayment.subtotal || processedPayment.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {processedPayment.discount && Number(processedPayment.discount) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-₱{Number(processedPayment.discount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {processedPayment.tax && Number(processedPayment.tax) > 0 && (
                        <div className="flex justify-between text-blue-600 text-sm">
                          <span>VAT on Medicines (12%):</span>
                          <span>₱{Number(processedPayment.tax).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="border-t my-2"></div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Amount Paid:</span>
                        <span>₱{Number(processedPayment.amount || processedPayment.subtotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Processed By:</p>
                      <p className="font-semibold">{processedPayment.createdBy || userSession?.name || 'System'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Processed At:</p>
                      <p className="font-semibold">{new Date(processedPayment.date || processedPayment.createdAt || Date.now()).toLocaleString('en-PH')}</p>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-600 border-t pt-4">
                  <p>Thank you for choosing MediCare Hospital!</p>
                  <p className="mt-2">For inquiries, please contact our billing department.</p>
                  <p className="mt-4">Generated on {new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </>
            ) : (
              <p>No receipt available.</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 print:hidden">
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>Close</Button>
            <Button className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white" onClick={handlePrintReceipt}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p>Are you sure you want to delete this payment?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button className="bg-red-500 text-white" onClick={confirmDeletePayment}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PaymentProcessing;