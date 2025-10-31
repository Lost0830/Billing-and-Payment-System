import { useState, useEffect } from "react";
import { History, Search, Filter, Download, Eye, Calendar, User, Receipt, CreditCard, Pill, FileText, Activity, Stethoscope, Printer } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { pharmacyService, PharmacyTransaction } from "../services/pharmacyIntegration";
import { billingService, BillingRecord as ServiceBillingRecord } from "../services/billingService";
import { patientService } from "../services/patientService";
import { getDisplayPatientId, getInternalPatientKey, resolvePatientDisplay } from "../utils/patientId";


interface BillingHistoryProps {
  onNavigateToView: (view: string) => void;
}

interface BillingRecord {
  id: string;
  type: 'invoice' | 'payment' | 'pharmacy' | 'service';
  number: string;
  patientName: string;
  patientId: string;
  date: string;
  time?: string;
  amount: number;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  description: string;
  paymentMethod?: string;
  department?: string;
  pharmacyData?: PharmacyTransaction;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal?: number;
  discount?: number;
  discountType?: string;
  discountPercentage?: number;
  tax?: number;
  taxRate?: number;
}

export function BillingHistory({ onNavigateToView }: BillingHistoryProps) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Array<{id: string, name: string, fullDisplay: string}>>([]);
  
  // Load patients from patientService on component mount
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = () => {
    const allPatients = patientService.getAllPatients();
    const formattedPatients = (allPatients || []).map((p:any) => ({
      id: getInternalPatientKey(p),
      name: p.name,
      fullDisplay: `${p.name} (${getDisplayPatientId(p) || getInternalPatientKey(p)})`
    }));
    setPatients(formattedPatients);
  };
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [pharmacyTransactions, setPharmacyTransactions] = useState<PharmacyTransaction[]>([]);
  const [isLoadingPharmacy, setIsLoadingPharmacy] = useState(false);
  const [pharmacyIntegrationEnabled, setPharmacyIntegrationEnabled] = useState(false);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  
  // Subscribe to billing service for real-time updates
  useEffect(() => {
    const unsubscribe = billingService.subscribe((records) => {
      setBillingRecords(records as BillingRecord[]);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Load pharmacy data when component mounts or when patient changes
  useEffect(() => {
    const loadPharmacyData = async () => {
      try {
        setIsLoadingPharmacy(true);
        // Test if pharmacy integration is available
        const status = pharmacyService.getStatus();
        if (status.connected) {
          setPharmacyIntegrationEnabled(true);
          const transactions = await pharmacyService.getTransactions(
            selectedPatientId || undefined
          );
          setPharmacyTransactions(transactions);
        }
      } catch (error) {
        console.error('Failed to load pharmacy data:', error);
        setPharmacyIntegrationEnabled(false);
      } finally {
        setIsLoadingPharmacy(false);
      }
    };

    loadPharmacyData();
  }, [selectedPatientId]);

  // Merge pharmacy transactions with billing records
  const getMergedBillingRecords = (): BillingRecord[] => {
    const merged = [...billingRecords];
    
    if (pharmacyIntegrationEnabled && pharmacyTransactions.length > 0) {
      const pharmacyRecords: BillingRecord[] = pharmacyTransactions.map(transaction => ({
        id: `pharmacy_${transaction.id}`,
        type: 'pharmacy' as const,
        number: transaction.transactionId,
        patientName: transaction.patientName,
        patientId: transaction.patientId,
        date: transaction.transactionDate,
        time: transaction.transactionTime,
        amount: transaction.totalAmount,
        status: transaction.paymentStatus === 'Paid' ? 'completed' as const : 
                transaction.paymentStatus === 'Pending' ? 'pending' as const : 
                'cancelled' as const,
        description: `Pharmacy Purchase - ${transaction.pharmacyName}`,
        department: "Pharmacy",
        paymentMethod: transaction.paymentMethod,
        pharmacyData: transaction,
        items: transaction.items.map(item => ({
          id: item.id,
          description: `${item.medicationName} (${item.strength}) - ${item.brand}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }))
      }));
      
      merged.push(...pharmacyRecords);
    }
    
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <FileText className="text-blue-600" size={20} />;
      case 'payment': return <CreditCard className="text-green-600" size={20} />;
      case 'pharmacy': return <Pill className="text-purple-600" size={20} />;
      case 'service': return <Receipt className="text-orange-600" size={20} />;
      default: return <Receipt className="text-gray-600" size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'invoice': return 'bg-blue-100 text-blue-800';
      case 'payment': return 'bg-green-100 text-green-800';
      case 'pharmacy': return 'bg-purple-100 text-purple-800';
      case 'service': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = getMergedBillingRecords().filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || record.type === selectedFilter;
    
    const matchesPatient = selectedPatientId === '' || record.patientId === selectedPatientId;
    
    return matchesSearch && matchesFilter && matchesPatient;
  });

  const allRecords = getMergedBillingRecords();
  
  const totalRevenue = allRecords
    .filter(r => r.status === 'completed' && (r.type === 'invoice' || r.type === 'service' || r.type === 'pharmacy'))
    .reduce((sum, record) => sum + record.amount, 0);

  const totalPayments = allRecords
    .filter(r => r.status === 'completed' && r.type === 'payment')
    .reduce((sum, record) => sum + record.amount, 0);

  const pendingAmount = allRecords
    .filter(r => r.status === 'pending')
    .reduce((sum, record) => sum + record.amount, 0);
    
  const pharmacyRevenue = allRecords
    .filter(r => r.status === 'completed' && r.type === 'pharmacy')
    .reduce((sum, record) => sum + record.amount, 0);

  // Export billing data to CSV
  const handleExport = () => {
    try {
      // Prepare CSV data
      const headers = ['Date', 'Time', 'Transaction #', 'Type', 'Patient Name', 'Patient ID', 'Description', 'Department', 'Payment Method', 'Amount', 'Status'];
      const csvRows = [headers.join(',')];
      
      filteredRecords.forEach(record => {
        const row = [
          new Date(record.date).toLocaleDateString('en-PH'),
          record.time || '',
          record.number,
          record.type.charAt(0).toUpperCase() + record.type.slice(1),
          `"${record.patientName}"`,
      patients.find(p => p.id === record.patientId)?.fullDisplay || resolvePatientDisplay(patients, record.patientId),
          `"${record.description}"`,
          record.department || '',
          record.paymentMethod || '',
          record.amount.toFixed(2),
          record.status.charAt(0).toUpperCase() + record.status.slice(1)
        ];
        csvRows.push(row.join(','));
      });
      
      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `billing_history_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Generate comprehensive billing report
  const handleGenerateReport = () => {
    try {
      // Create a comprehensive HTML report
      const reportDate = new Date().toLocaleDateString('en-PH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
  const patientFilterDisplay = selectedPatientId ? (patients.find(p => p.id === selectedPatientId)?.fullDisplay || resolvePatientDisplay(patients, selectedPatientId)) : '';

  const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Billing History Report - ${reportDate}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #358E83;
            }
            .header h1 {
              color: #358E83;
              margin: 0;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 40px;
            }
            .summary-card {
              padding: 20px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              background: #f9fafb;
            }
            .summary-card h3 {
              margin: 0 0 10px 0;
              color: #666;
              font-size: 14px;
              text-transform: uppercase;
            }
            .summary-card .value {
              font-size: 24px;
              font-weight: bold;
              color: #358E83;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            th {
              background: #358E83;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:hover {
              background: #f9fafb;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-completed { background: #dcfce7; color: #166534; }
            .badge-pending { background: #fef3c7; color: #92400e; }
            .badge-cancelled { background: #fee2e2; color: #991b1b; }
            .badge-refunded { background: #f3f4f6; color: #374151; }
            .badge-invoice { background: #dbeafe; color: #1e40af; }
            .badge-payment { background: #dcfce7; color: #166534; }
            .badge-pharmacy { background: #f3e8ff; color: #6b21a8; }
            .badge-service { background: #fed7aa; color: #9a3412; }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MEDICARE HOSPITAL</h1>
            <p>Billing History Report</p>
            <p>Generated on: ${reportDate}</p>
            ${patientFilterDisplay ? `<p>Patient Filter: ${patientFilterDisplay}</p>` : ''}
            ${selectedFilter !== 'all' ? `<p>Type Filter: ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)}</p>` : ''}
          </div>

          <div class="summary">
            <div class="summary-card">
              <h3>Total Revenue</h3>
              <div class="value">₱${totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <h3>Payments Received</h3>
              <div class="value">₱${totalPayments.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <h3>Pending Amount</h3>
              <div class="value">₱${pendingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <h3>Pharmacy Revenue</h3>
              <div class="value">₱${pharmacyRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <h3>Total Transactions</h3>
              <div class="value">${filteredRecords.length}</div>
            </div>
          </div>

          <h2 style="color: #358E83; margin-bottom: 20px;">Transaction Details</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction #</th>
                <th>Type</th>
                <th>Patient</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(record => `
                <tr>
                  <td>${new Date(record.date).toLocaleDateString('en-PH')}${record.time ? ` ${record.time}` : ''}</td>
                  <td>${record.number}</td>
                  <td><span class="badge badge-${record.type}">${record.type.charAt(0).toUpperCase() + record.type.slice(1)}</span></td>
                  <td>${record.patientName}<br/><small style="color: #666;">${patients.find(p => p.id === record.patientId)?.fullDisplay || resolvePatientDisplay(patients, record.patientId)}</small></td>
                  <td>${record.description}${record.department ? `<br/><small style="color: #666;">${record.department}</small>` : ''}</td>
                  <td style="font-weight: 600;">₱${record.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td><span class="badge badge-${record.status}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>This is a computer-generated report from Medicare Hospital Billing System</p>
            <p>Report generated on ${new Date().toLocaleString('en-PH')}</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()" style="
              background: #358E83;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              margin-right: 10px;
            ">Print Report</button>
            <button onclick="window.close()" style="
              background: #6b7280;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
            ">Close</button>
          </div>
        </body>
        </html>
      `;

      // Open report in new window
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
      } else {
        alert('Please allow pop-ups to generate the report.');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  // Print individual transaction record
  const handlePrintRecord = () => {
    if (!selectedRecord) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const recordContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transaction Record - ${selectedRecord.number}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #358E83;
            }
            .header h1 {
              color: #358E83;
              font-size: 28px;
              margin-bottom: 5px;
            }
            .header p {
              color: #666;
              font-size: 14px;
              margin: 2px 0;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #358E83;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e5e7eb;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 15px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 14px;
              font-weight: 600;
              color: #333;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-completed { background: #dcfce7; color: #166534; }
            .badge-pending { background: #fef3c7; color: #92400e; }
            .badge-cancelled { background: #fee2e2; color: #991b1b; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background: #f3f4f6;
              padding: 10px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
              color: #374151;
              border: 1px solid #e5e7eb;
            }
            td {
              padding: 10px;
              font-size: 13px;
              border: 1px solid #e5e7eb;
            }
            .amount-summary {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .amount-row {
              display: flex;
              justify-between;
              padding: 6px 0;
              font-size: 14px;
            }
            .amount-total {
              font-size: 18px;
              font-weight: bold;
              color: #358E83;
              padding-top: 10px;
              margin-top: 10px;
              border-top: 2px solid #e5e7eb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #666;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MEDICARE HOSPITAL</h1>
            <p>123 Health Street, Medical District, Philippines</p>
            <p>Tel: (02) 1234-5678 | Email: billing@medicare.ph</p>
            <p style="margin-top: 10px; font-weight: 600; font-size: 16px;">Transaction Record</p>
          </div>

          <div class="section">
            <div class="section-title">Transaction Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Transaction Number</span>
                <span class="info-value">${selectedRecord.number}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Type</span>
                <span class="info-value">${selectedRecord.type.charAt(0).toUpperCase() + selectedRecord.type.slice(1)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Date & Time</span>
                <span class="info-value">${new Date(selectedRecord.date).toLocaleDateString('en-PH', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}${selectedRecord.time ? ` • ${selectedRecord.time}` : ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="badge badge-${selectedRecord.status}">${selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Patient Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Patient Name</span>
                <span class="info-value">${selectedRecord.patientName}</span>
              </div>
                <div class="info-item">
                  <span class="info-label">Patient ID</span>
                  <span class="info-value">${patients.find(p => p.id === selectedRecord.patientId)?.fullDisplay || resolvePatientDisplay(patients, selectedRecord.patientId)}</span>
                </div>
              ${selectedRecord.department ? `
                <div class="info-item">
                  <span class="info-label">Department</span>
                  <span class="info-value">${selectedRecord.department}</span>
                </div>
              ` : ''}
              ${selectedRecord.paymentMethod ? `
                <div class="info-item">
                  <span class="info-label">Payment Method</span>
                  <span class="info-value">${selectedRecord.paymentMethod}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Description</div>
            <p style="font-size: 14px; color: #333;">${selectedRecord.description}</p>
          </div>

          ${selectedRecord.items && selectedRecord.items.length > 0 ? `
            <div class="section">
              <div class="section-title">Items / Services</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedRecord.items.map(item => `
                    <tr>
                      <td>${item.description}</td>
                      <td style="text-align: right;">${item.quantity}</td>
                      <td style="text-align: right;">₱${item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: right; font-weight: 600;">₱${item.totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${selectedRecord.pharmacyData ? `
            <div class="section">
              <div class="section-title">Pharmacy Information</div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Pharmacy Name</span>
                  <span class="info-value">${selectedRecord.pharmacyData.pharmacyName}</span>
                </div>
                ${selectedRecord.pharmacyData.doctorName ? `
                  <div class="info-item">
                    <span class="info-label">Prescribed By</span>
                    <span class="info-value">${selectedRecord.pharmacyData.doctorName}</span>
                  </div>
                ` : ''}
                <div class="info-item">
                  <span class="info-label">Tax (VAT)</span>
                  <span class="info-value">₱${selectedRecord.pharmacyData.tax.toFixed(2)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Payment Status</span>
                  <span class="info-value">${selectedRecord.pharmacyData.paymentStatus}</span>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="amount-summary">
            ${selectedRecord.subtotal ? `
              <div class="amount-row">
                <span>Subtotal:</span>
                <span style="font-weight: 600;">₱${selectedRecord.subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            ${selectedRecord.discount && selectedRecord.discount > 0 ? `
              <div class="amount-row" style="color: #16a34a;">
                <span>Discount ${selectedRecord.discountType ? `(${selectedRecord.discountType})` : ''}:</span>
                <span style="font-weight: 600;">
                  -₱${selectedRecord.discount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  ${selectedRecord.discountPercentage ? ` (${selectedRecord.discountPercentage}%)` : ''}
                </span>
              </div>
            ` : ''}
            ${selectedRecord.tax && selectedRecord.tax > 0 ? `
              <div class="amount-row">
                <span>VAT ${selectedRecord.taxRate ? `(${selectedRecord.taxRate}%)` : '(12%)'}:</span>
                <span style="font-weight: 600;">₱${selectedRecord.tax.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            <div class="amount-row amount-total">
              <span>Total Amount:</span>
              <span>₱${selectedRecord.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="footer">
            <p>This is a computer-generated document from Medicare Hospital Billing System</p>
            <p>Printed on: ${new Date().toLocaleString('en-PH')}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(recordContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2" size={16} />
            Export
          </Button>
          <Button className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white" onClick={handleGenerateReport}>
            <FileText className="mr-2" size={16} />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Patient Filter */}
      {pharmacyIntegrationEnabled && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="text-[#358E83]" size={20} />
                <span className="font-medium">Integration Status:</span>
                <Badge className="bg-green-100 text-green-800">Pharmacy Connected</Badge>
              </div>
              <div className="flex-1">
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger className="w-60">
                    <SelectValue placeholder="Filter by patient (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Patients</SelectItem>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.fullDisplay}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isLoadingPharmacy && (
                <Badge className="bg-blue-100 text-blue-800">Syncing...</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">₱{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Receipt className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payments Received</p>
                <p className="text-2xl font-bold text-blue-600">₱{totalPayments.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CreditCard className="text-blue-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-yellow-600">₱{pendingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <History className="text-yellow-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pharmacy Revenue</p>
                <p className="text-2xl font-bold text-purple-600">₱{pharmacyRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Pill className="text-purple-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-indigo-600">{allRecords.length}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <FileText className="text-indigo-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Complete record of all billing transactions</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex items-center bg-white border rounded-lg px-3 py-2">
                <Search className="mr-2 text-gray-400" size={16} />
                <Input 
                  placeholder="Search records..." 
                  className="border-0 p-0 focus-visible:ring-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="service">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <div className="space-y-4">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[#358E83]/10 rounded-lg">
                          {getTypeIcon(record.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{record.number}</h3>
                            <Badge className={getTypeColor(record.type)}>
                              {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                            </Badge>
                            <Badge className={getStatusColor(record.status)}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User size={14} />
                              <span>{resolvePatientDisplay(patients, record.patientId)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              <span>
                                {new Date(record.date).toLocaleDateString()}
                                {record.time && <span className="ml-1 text-gray-500">• {record.time}</span>}
                              </span>
                            </div>
                            {record.department && (
                              <Badge variant="outline">{record.department}</Badge>
                            )}
                            {record.paymentMethod && (
                              <Badge variant="outline">{record.paymentMethod}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{record.description}</p>
                          
                          {/* Show detailed items for pharmacy transactions */}
                          {record.type === 'pharmacy' && record.items && record.items.length > 0 && (
                            <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                              <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-1">
                                <Pill size={14} />
                                Medications Purchased:
                              </h4>
                              <div className="space-y-1">
                                {record.items.map((item) => (
                                  <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-purple-700">
                                      {item.description} (Qty: {item.quantity})
                                    </span>
                                    <span className="font-medium text-purple-800">
                                      ₱{item.totalPrice.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {record.pharmacyData && (
                                <div className="mt-2 pt-2 border-t border-purple-200">
                                  <div className="flex justify-between text-xs text-purple-600">
                                    <span>Pharmacy: {record.pharmacyData.pharmacyName}</span>
                                    {record.pharmacyData.doctorName && (
                                      <span>Prescribed by: {record.pharmacyData.doctorName}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold text-lg">₱{record.amount.toLocaleString()}</div>
                          {record.type === 'pharmacy' && record.pharmacyData && (
                            <div className="text-xs text-gray-500">
                              Tax: ₱{record.pharmacyData.tax.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredRecords.length === 0 && (
                  <div className="text-center py-12">
                    <History className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No records found</h3>
                    <p className="text-gray-600">
                      {selectedPatientId ? 
                        'No billing records found for the selected patient.' : 
                        'Try adjusting your search criteria or filters.'
                      }
                    </p>
                    {pharmacyIntegrationEnabled && isLoadingPharmacy && (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Activity className="animate-spin text-[#358E83]" size={16} />
                        <span className="text-sm text-gray-600">Loading pharmacy data...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="summary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Revenue Chart Placeholder */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue Trend</CardTitle>
                    <CardDescription>Revenue comparison over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <Receipt className="mx-auto text-gray-400 mb-2" size={32} />
                        <p className="text-gray-600">Chart visualization coming soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Distribution of payment methods used</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span>GCash</span>
                        </div>
                        <span className="font-medium">45%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Credit Card</span>
                        </div>
                        <span className="font-medium">30%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span>Cash</span>
                        </div>
                        <span className="font-medium">15%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span>PayMaya</span>
                        </div>
                        <span className="font-medium">10%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Department Revenue */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Revenue by Department</CardTitle>
                    <CardDescription>Breakdown of revenue by hospital departments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">₱58,800</div>
                        <div className="text-sm text-gray-600">Surgery</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">₱29,400</div>
                        <div className="text-sm text-gray-600">Outpatient</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">₱15,600</div>
                        <div className="text-sm text-gray-600">Radiology</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">₱{pharmacyRevenue.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                          <Pill size={14} />
                          Pharmacy
                          {pharmacyIntegrationEnabled && (
                            <Badge className="bg-green-100 text-green-600 text-xs ml-1">Live</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete information about this billing transaction
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Transaction Number</p>
                  <p className="font-semibold">{selectedRecord.number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <Badge className={getTypeColor(selectedRecord.type)}>
                    {selectedRecord.type.charAt(0).toUpperCase() + selectedRecord.type.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-semibold">{resolvePatientDisplay(patients, selectedRecord.patientId)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">{new Date(selectedRecord.date).toLocaleDateString('en-PH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}{selectedRecord.time && ` • ${selectedRecord.time}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusColor(selectedRecord.status)}>
                    {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                  </Badge>
                </div>
                {selectedRecord.department && (
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-semibold">{selectedRecord.department}</p>
                  </div>
                )}
                {selectedRecord.paymentMethod && (
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-semibold">{selectedRecord.paymentMethod}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900">{selectedRecord.description}</p>
              </div>

              {/* Items (if available) */}
              {selectedRecord.items && selectedRecord.items.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Items</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecord.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-4 py-2 text-sm">{item.description}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">₱{item.unitPrice.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium">₱{item.totalPrice.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pharmacy Data (if available) */}
              {selectedRecord.pharmacyData && (
                <div className="bg-purple-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                    <Pill size={16} />
                    Pharmacy Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-purple-700">Pharmacy Name</p>
                      <p className="font-medium text-purple-900">{selectedRecord.pharmacyData.pharmacyName}</p>
                    </div>
                    {selectedRecord.pharmacyData.doctorName && (
                      <div>
                        <p className="text-purple-700">Prescribed By</p>
                        <p className="font-medium text-purple-900">{selectedRecord.pharmacyData.doctorName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-purple-700">Tax</p>
                      <p className="font-medium text-purple-900">₱{selectedRecord.pharmacyData.tax.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-purple-700">Payment Status</p>
                      <p className="font-medium text-purple-900">{selectedRecord.pharmacyData.paymentStatus}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {selectedRecord.subtotal && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-medium">₱{selectedRecord.subtotal.toLocaleString()}</span>
                  </div>
                )}
                {selectedRecord.discount && selectedRecord.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      Discount {selectedRecord.discountType && `(${selectedRecord.discountType})`}:
                    </span>
                    <span className="font-medium text-green-600">
                      -₱{selectedRecord.discount.toLocaleString()}
                      {selectedRecord.discountPercentage && ` (${selectedRecord.discountPercentage}%)`}
                    </span>
                  </div>
                )}
                {selectedRecord.tax && selectedRecord.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      VAT {selectedRecord.taxRate && `(${selectedRecord.taxRate}%)`}:
                    </span>
                    <span className="font-medium">₱{selectedRecord.tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-medium">Total Amount:</span>
                  <span className="font-bold text-lg text-[#358E83]">₱{selectedRecord.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons: Print */}
              <div className="flex justify-end space-x-3">
                <Button 
                  className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white"
                  onClick={handlePrintRecord}
                >
                  <Printer className="mr-2" size={16} />
                  Print Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}