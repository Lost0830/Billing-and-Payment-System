import { useState, useEffect } from "react";
import {
  History,
  Search,
  Download,
  Eye,
  Calendar,
  User,
  Receipt,
  CreditCard,
  Pill,
  FileText,
  Activity,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";

interface BillingRecord {
  id: string;
  type: "invoice" | "payment" | "pharmacy" | "service";
  number: string;
  patientName: string;
  patientId: string;
  date: string;
  amount: number;
  status: "completed" | "pending" | "cancelled" | "refunded";
  description: string;
  paymentMethod?: string;
  department?: string;
}

export function BillingHistory() {
  const baseUrl = "http://localhost:5000/api/billing";

  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(
    null
  );

  // ✅ Fetch billing data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceRes, paymentRes] = await Promise.all([
          fetch(`${baseUrl}/invoices`),
          fetch(`${baseUrl}/payments`),
        ]);

        const invoiceData = await invoiceRes.json();
        const paymentData = await paymentRes.json();

        if (invoiceData.success || paymentData.success) {
          const invoices =
            invoiceData.data?.map((inv: any) => ({
              id: inv._id,
              type: "invoice",
              number: inv.invoiceNumber || `INV-${inv._id.slice(-5)}`,
              patientName: inv.patientName || "Unknown",
              patientId: inv.patientId || "N/A",
              date: inv.invoiceDate || new Date().toISOString(),
              amount: inv.totalAmount || 0,
              status: inv.status || "completed",
              description: inv.description || "Hospital Service Billing",
              department: inv.department || "General",
              paymentMethod: inv.paymentMethod || "Cash",
            })) || [];

          const payments =
            paymentData.data?.map((pay: any) => ({
              id: pay._id,
              type: "payment",
              // prefer invoiceNumber (links payment to invoice); fallback to paymentNumber
              number: pay.invoiceNumber || pay.paymentNumber || `PAY-${pay._id?.slice(-5)}`,
              patientName: pay.patientName || pay.patient || "Unknown",
              patientId: pay.patientId || pay.accountId || "N/A",
              date: pay.paymentDate || pay.date || new Date().toISOString(),
              amount: pay.amount || 0,
              status: pay.status || "completed",
              description: pay.description || "Payment Record",
              department: pay.department || "Billing",
              paymentMethod: pay.method || "Cash",
            })) || [];

          const combined = [...invoices, ...payments].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          // Merge invoices + payments by invoice number (so invoice + its payment become one record)
          const mergedByKey = new Map<string, BillingRecord>();

          const keyFor = (r: BillingRecord) => (r.number || r.id || "").toString();

          for (const rec of combined) {
            const key = keyFor(rec);
            if (!key) continue;
            const existing = mergedByKey.get(key);
            if (!existing) {
              // clone to avoid mutating source
              mergedByKey.set(key, { ...rec });
              continue;
            }

            // If one record is invoice and the other is payment -> merge into invoice record
            if (existing.type === "invoice" && rec.type === "payment") {
              mergedByKey.set(key, {
                ...existing,
                // prefer invoice's patient/name/department, but update amount/status/paymentMethod from payment
                amount: rec.amount || existing.amount,
                status: "completed",
                paymentMethod: rec.paymentMethod || existing.paymentMethod,
                description: existing.description || rec.description,
              });
              continue;
            }

            if (existing.type === "payment" && rec.type === "invoice") {
              mergedByKey.set(key, {
                ...rec,
                amount: existing.amount || rec.amount,
                status: existing.status === "completed" ? "completed" : rec.status,
                paymentMethod: existing.paymentMethod || rec.paymentMethod,
                description: rec.description || existing.description,
              });
              continue;
            }

            // Same type: keep most recent (combined already sorted by date desc), but merge missing fields
            mergedByKey.set(key, {
              ...existing,
              ...rec,
              description: existing.description || rec.description,
              paymentMethod: existing.paymentMethod || rec.paymentMethod,
            });
          }

          const merged = Array.from(mergedByKey.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setBillingRecords(merged);
        } else {
          toast.error("Failed to load billing data");
        }
      } catch (error) {
        console.error("❌ Failed to load billing data:", error);
        toast.error("Server connection error");
      }
    };

    fetchData();
  }, []);

  // ✅ Filtered data
  const filteredRecords = billingRecords.filter((record) => {
    const matchSearch =
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType =
      selectedFilter === "all" || record.type === selectedFilter;
    return matchSearch && matchType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "invoice":
        return <FileText className="text-blue-600" size={20} />;
      case "payment":
        return <CreditCard className="text-green-600" size={20} />;
      default:
        return <Receipt className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <CardTitle>Billing History</CardTitle>
        <div className="flex gap-2">
          <div className="flex items-center border rounded-lg px-3 py-2 bg-white">
            <Search className="mr-2 text-gray-400" size={16} />
            <Input
              placeholder="Search..."
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
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="mx-auto mb-3 text-gray-400" size={40} />
              <p>No billing records found.</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                className="border rounded-lg p-4 mb-3 flex justify-between items-center hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#358E83]/10 rounded-lg">
                    {getTypeIcon(record.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{record.number}</h3>
                      <Badge
                        className={
                          record.type === "invoice"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {record.type.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-800">{record.patientName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(record.date).toLocaleDateString()} —{" "}
                      {record.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-lg text-[#358E83]">
                      ₱{record.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {record.paymentMethod}
                    </div>
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
            ))
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Details for {selectedRecord?.number}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-2">
              <p>
                <strong>Patient:</strong> {selectedRecord.patientName}
              </p>
              <p>
                <strong>Amount:</strong> ₱
                {selectedRecord.amount.toLocaleString()}
              </p>
              <p>
                <strong>Status:</strong> {selectedRecord.status}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(selectedRecord.date).toLocaleDateString()}
              </p>
              <p>
                <strong>Description:</strong> {selectedRecord.description}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BillingHistory;
