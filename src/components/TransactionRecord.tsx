import React from 'react';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

interface TransactionItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  category?: string;
}

interface TransactionRecordProps {
  payment?: any; // Payment object from PaymentProcessing
  transactionNumber?: string;
  transactionType?: 'Payment' | 'Refund' | 'Adjustment';
  transactionDate?: string;
  status?: 'Completed' | 'Pending' | 'Failed';
  patientName?: string;
  patientId?: string;
  paymentMethod?: string;
  cashierName?: string;
  cashierRole?: string;
  items?: TransactionItem[];
  subtotal?: number;
  discount?: number;
  discountPercentage?: number;
  tax?: number;
  total?: number;
  invoiceNumber?: string;
  referenceNumber?: string;
  description?: string;
  companyName?: string;
  companyAddress?: string;
}

const getPaymentMethodBadgeColor = (method: string) => {
  const methodLower = method.toLowerCase();
  if (methodLower.includes('cash')) return 'bg-green-100 text-green-800 border-green-300';
  if (methodLower.includes('card') || methodLower.includes('credit') || methodLower.includes('debit')) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (methodLower.includes('gcash') || methodLower.includes('paymaya') || methodLower.includes('transfer')) return 'bg-purple-100 text-purple-800 border-purple-300';
  return 'bg-gray-100 text-gray-800 border-gray-300';
};

const getStatusBadgeColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'completed') return 'bg-green-100 text-green-800 border-green-300';
  if (statusLower === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (statusLower === 'failed') return 'bg-red-100 text-red-800 border-red-300';
  return 'bg-gray-100 text-gray-800 border-gray-300';
};

const formatTransactionNumber = (id: string): string => {
  if (!id) return 'TRANS-000';
  // Extract numeric part from ID if it exists
  const numericMatch = id.match(/\d+/);
  if (numericMatch) {
    const num = parseInt(numericMatch[0], 10);
    return `TRANS-${String(num).padStart(3, '0')}`;
  }
  // If no numeric part, use hash of the ID
  const hash = Math.abs(id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 1000;
  return `TRANS-${String(hash).padStart(3, '0')}`;
};

const formatPatientId = (id: string): string => {
  if (!id) return 'P000';
  // Extract numeric part from ID if it exists
  const numericMatch = id.match(/\d+/);
  if (numericMatch) {
    const num = parseInt(numericMatch[0], 10);
    return `P${String(num).padStart(3, '0')}`;
  }
  // If no numeric part, use hash of the ID
  const hash = Math.abs(id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 1000;
  return `P${String(hash).padStart(3, '0')}`;
};

export function TransactionRecord({
  payment,
  transactionNumber,
  transactionType,
  transactionDate,
  status,
  patientName,
  patientId,
  paymentMethod,
  cashierName,
  cashierRole,
  items,
  subtotal,
  discount = 0,
  discountPercentage = 0,
  tax = 0,
  total,
  invoiceNumber,
  referenceNumber,
  description,
  companyName = 'MEDICARE HOSPITAL',
  companyAddress = '123 Health Street, Medical District, Philippines',
}: TransactionRecordProps) {
  // Extract data from payment object if provided
  const rawTransactionNumber = transactionNumber || payment?._id || payment?.id || 'N/A';
  const rawPatientId = patientId || payment?.patientId || payment?.id || 'N/A';
  
  const _transactionNumber = formatTransactionNumber(rawTransactionNumber);
  const _transactionType = transactionType || 'Payment';
  const _transactionDate = transactionDate || payment?.date || payment?.createdAt || new Date();
  const _status = status || payment?.status || 'Completed';
  const _patientName = patientName || payment?.patientName || 'N/A';
  const _patientId = formatPatientId(rawPatientId);
  const _paymentMethod = paymentMethod || payment?.method || 'Cash';
  const _cashierName = cashierName || payment?.createdBy || payment?.processedBy || 'System';
  const _items = items || (Array.isArray(payment?.items) ? payment.items.map((item: any, idx: number) => ({
    id: item.id || `item-${idx}`,
    description: item.description || item.name || item.medicationName || 'Item',
    quantity: item.quantity ?? item.qty ?? 1,
    rate: Number(item.rate ?? item.unitPrice ?? item.price ?? item.totalPrice ?? 0),
    amount: Number(item.amount ?? item.totalPrice ?? ((item.quantity ?? 1) * (item.rate ?? item.unitPrice ?? item.price ?? 0))),
    category: item.category || item.group || undefined
  })) : []);
  const _subtotal = subtotal !== undefined ? subtotal : (payment?.subtotal || payment?.amount || 0);
  const _discount = discount || (payment?.discount ? Number(payment.discount) : 0);
  const _tax = tax || (payment?.tax ? Number(payment.tax) : 0);
  const _total = total !== undefined ? total : (payment?.amount || payment?.subtotal || 0);
  const _invoiceNumber = invoiceNumber || payment?.invoiceNumber || 'N/A';
  const _referenceNumber = referenceNumber || payment?.reference || 'N/A';

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white p-8 text-gray-900 font-sans transaction-record">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[#358E83] mb-1">{companyName}</h1>
        <p className="text-xs text-gray-600">{companyAddress}</p>
        <h2 className="text-base font-bold tracking-wider mt-4">Transaction Record</h2>
      </div>

      <Separator className="my-4" />

      {/* Transaction Information Section */}
      <div className="mb-6">
        <h3 className="font-bold text-sm text-[#358E83] mb-3">Transaction Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Transaction Number</p>
            <p className="font-bold">{_transactionNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Type</p>
            <p className="font-bold">{_transactionType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Date & Time</p>
            <p className="font-bold">{formatDate(_transactionDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Status</p>
            <Badge className={`${getStatusBadgeColor(_status)} text-xs font-medium`}>
              {_status}
            </Badge>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Patient Information Section */}
      <div className="mb-6">
        <h3 className="font-bold text-sm text-[#358E83] mb-3">Patient Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Patient Name</p>
            <p className="font-bold">{_patientName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Patient ID</p>
            <p className="font-bold">{_patientId}</p>
          </div>
          {_invoiceNumber && _invoiceNumber !== 'N/A' && (
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Invoice Number</p>
              <p className="font-bold">{_invoiceNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Payment Method</p>
            <Badge className={`${getPaymentMethodBadgeColor(_paymentMethod)} text-xs font-medium capitalize`}>
              {_paymentMethod}
            </Badge>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Description Section */}
      {description && (
        <div className="mb-6">
          <h3 className="font-bold text-sm text-[#358E83] mb-2">Description</h3>
          <p className="text-sm text-gray-700">{description}</p>
          <Separator className="my-4" />
        </div>
      )}

      {/* Services/Medicines Rendered */}
      {_items && _items.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-sm text-[#358E83] mb-3">Services & Medicines Rendered</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-bold text-xs">Description</th>
                  <th className="text-center py-2 px-3 font-bold text-xs">Qty</th>
                  <th className="text-right py-2 px-3 font-bold text-xs">Unit Price</th>
                  <th className="text-right py-2 px-3 font-bold text-xs">Amount</th>
                </tr>
              </thead>
              <tbody>
                {_items.map((item: TransactionItem, index: number) => (
                  <tr key={item.id || index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="text-sm font-medium">{item.description}</div>
                      {item.category && <div className="text-xs text-gray-600">{item.category}</div>}
                    </td>
                    <td className="py-2 px-3 text-center text-sm">{item.quantity}</td>
                    <td className="py-2 px-3 text-right text-sm">
                      ₱{Number(item.rate).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-medium">
                      ₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Separator className="my-4" />

      {/* Totals Section */}
      <div className="mb-6 flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>₱{Number(_subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {_discount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>
                Discount
                {discountPercentage > 0 && <span className="text-xs ml-1">({discountPercentage}%)</span>}
              </span>
              <span>-₱{Number(_discount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          {_tax > 0 && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>Tax (12%)</span>
              <span>₱{Number(_tax).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div className="border-t-2 border-gray-300 pt-2 mt-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Amount:</span>
              <span className="text-[#358E83]">₱{Number(_total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Transaction Details */}
      <div className="grid grid-cols-3 gap-4 text-sm mb-6">
        {_referenceNumber && _referenceNumber !== 'N/A' && (
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Reference Number</p>
            <p className="font-bold text-xs">{_referenceNumber}</p>
          </div>
        )}
        {_cashierName && (
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Cashier</p>
            <p className="font-bold text-xs">{_cashierName}</p>
            {cashierRole && <p className="text-xs text-gray-600">{cashierRole}</p>}
          </div>
        )}
        <div>
          <p className="text-xs text-gray-600 mb-0.5">Generated On</p>
          <p className="font-bold text-xs">{new Date().toLocaleDateString('en-PH')}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 border-t pt-4">
        <p>This is a computer-generated document from Medicare Hospital Billing System</p>
        <p>Printed on: {new Date().toLocaleString('en-PH')}</p>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .transaction-record {
            padding: 0;
            max-width: 100%;
            font-family: 'Times New Roman', Georgia, serif;
            background: white;
          }
          .transaction-record * {
            box-shadow: none !important;
            border-color: #000 !important;
          }
          .transaction-record h1 {
            font-size: 22px;
            margin-bottom: 4px;
          }
          .transaction-record h2 {
            font-size: 16px;
            letter-spacing: 0.5px;
          }
          .transaction-record h3 {
            font-size: 12px;
            font-weight: 700;
          }
          .transaction-record p {
            margin: 0;
            font-size: 12px;
          }
          .transaction-record table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .transaction-record thead {
            background: #f5f5f5;
            border-bottom: 2px solid #000;
          }
          .transaction-record th {
            padding: 8px 6px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            text-align: left;
          }
          .transaction-record td {
            padding: 8px 6px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
          }
          .transaction-record .text-right {
            text-align: right;
          }
          .transaction-record .text-center {
            text-align: center;
          }
          .transaction-record .font-bold {
            font-weight: 700;
          }
          .transaction-record .space-y-2 > * + * {
            margin-top: 8px;
          }
          .transaction-record badge,
          .transaction-record [class*="Badge"] {
            border: 1px solid #000;
            background: white !important;
            color: black !important;
            padding: 2px 6px;
            font-size: 10px;
          }
          .transaction-record hr,
          .transaction-record [class*="Separator"] {
            border: 1px solid #000 !important;
            background: transparent !important;
          }
          @page {
            size: A4 landscape;
            margin: 18mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
