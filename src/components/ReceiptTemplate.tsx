import React from 'react';
import { Separator } from './ui/separator';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  category?: string;
}

interface ReceiptTemplateProps {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  patientName: string;
  patientId?: string;
  patientAddress?: string;
  companyName?: string;
  companyAddress?: string;
  companyLogo?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  discountType?: string;
  discountPercentage?: number;
  tax?: number;
  total: number;
  notes?: string;
  generatedBy?: string;
  generatedAt?: string;
  status?: string;
  reference?: string;
}

export function ReceiptTemplate({
  invoiceNumber,
  invoiceDate,
  dueDate,
  patientName,
  patientId,
  patientAddress = '',
  companyName = 'Your Company Inc.',
  companyAddress = '1234 Company St., Company Town, ST 12345',
  companyLogo,
  items,
  subtotal,
  discount = 0,
  discountType = 'none',
  discountPercentage = 0,
  tax = 0,
  total,
  notes,
  generatedBy,
  generatedAt,
  status,
  reference,
}: ReceiptTemplateProps) {
  const formatDate = (date: string | Date) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-12 text-gray-900 font-sans receipt-template">
      {/* Header with Company Info and Logo */}
      <div className="flex justify-between items-start mb-12">
        {/* Company Info - Left */}
        <div>
          <h1 className="text-lg font-bold text-gray-900 mb-1">{companyName}</h1>
          <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line max-w-xs">
            {companyAddress}
          </div>
        </div>

        {/* Logo Upload Area - Right */}
        {companyLogo ? (
          <img src={companyLogo} alt="Company Logo" className="h-20 w-40 object-contain border border-gray-300 rounded p-2" />
        ) : (
          <div className="border-2 border-gray-300 rounded-lg p-6 w-40 h-20 flex items-center justify-center text-center bg-gray-50">
            <div className="flex flex-col items-center">
              <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-gray-500 text-xs">Upload Logo</p>
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className="text-center text-3xl font-bold tracking-widest mb-12">MEDICAL INVOICE</h2>

      {/* Bill To and Invoice Details - Two Column */}
      <div className="flex justify-between mb-8">
        {/* Bill To - Left */}
        <div>
          <h3 className="font-bold text-sm mb-2">Bill To</h3>
          <p className="font-semibold text-sm mb-1">{patientName}</p>
          {patientAddress ? (
            <div className="text-xs text-gray-700 leading-relaxed">
              {patientAddress}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-700">1234 Customer St.</p>
              <p className="text-xs text-gray-700">Customer Town, ST 12345</p>
            </>
          )}
          {patientId && <p className="text-xs text-gray-700 mt-1">Patient ID: {patientId}</p>}
        </div>

        {/* Invoice Details - Right in Box */}
        <div className="border border-gray-300 rounded-lg p-6 w-56">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-bold text-sm">Invoice #</span>
              <span className="text-sm">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-sm">Invoice date</span>
              <span className="text-sm">{formatDate(invoiceDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-sm">Due date</span>
              <span className="text-sm">{formatDate(dueDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6 overflow-x-auto mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-b-2 border-gray-900">
              <th className="text-left py-3 px-0 font-bold text-xs">QTY</th>
              <th className="text-left py-3 px-4 font-bold text-xs">Description</th>
              <th className="text-right py-3 px-0 font-bold text-xs">Unit Price</th>
              <th className="text-right py-3 px-0 font-bold text-xs">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item, index) => (
                <tr key={item.id || index} className="border-b border-gray-300">
                  <td className="py-3 px-0 text-center">{item.quantity}</td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium">{item.description}</div>
                    {item.category && <div className="text-xs text-gray-600">{item.category}</div>}
                  </td>
                  <td className="py-3 px-0 text-right">
                    ${item.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-0 text-right font-medium">
                    ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-3 px-0 text-center text-gray-500">No items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section - Right Aligned */}
      <div className="flex justify-end mb-12 mt-6">
        <div className="w-64">
          <div className="flex justify-between text-sm mb-1">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {tax !== undefined && tax !== null && (
            <div className="flex justify-between text-sm mb-2">
              <span>Sales Tax (0%)</span>
              <span>${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          {discount !== undefined && discount !== null && discount > 0 && (
            <div className="flex justify-between text-sm mb-2">
              <span>Discount</span>
              <span>-${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div className="border-t-2 border-gray-900 pt-2 mt-2">
            <div className="flex justify-between font-bold text-base">
              <span>Total USD</span>
              <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="border-t-2 border-gray-900 pt-8">
        <h4 className="font-bold text-sm mb-3">Terms and Conditions</h4>
        <p className="text-xs text-gray-700 leading-relaxed">
          Payment is due in 14 days
        </p>
        <p className="text-xs text-gray-700 leading-relaxed">
          Please make checks payable to: {companyName}.
        </p>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .receipt-template {
            padding: 12mm;
            max-width: 100%;
          }
          .receipt-template * {
            box-shadow: none !important;
            border-color: #000 !important;
          }
          .receipt-template table {
            border-collapse: collapse;
          }
          .receipt-template th,
          .receipt-template td {
            border-color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
