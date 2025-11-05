import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  FileText,
  CreditCard,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  BarChart3,
  Receipt
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchInvoices, fetchPayments, fetchPatients } from "../services/api.js";
import { billingService } from "../services/billingService";
import { emrService } from "../services/emrIntegration";
import { DiscountManagementService } from "../services/discountManagementService";

interface DashboardProps {
  onNavigateToModule: (moduleId: string) => void;
}

export function Dashboard({ onNavigateToModule }: DashboardProps) {
  const [totalRevenueToday, setTotalRevenueToday] = useState<number>(0);
  const [pendingInvoices, setPendingInvoices] = useState<number>(0);
  const [dueThisWeek, setDueThisWeek] = useState<number>(0);
  const [processedPayments, setProcessedPayments] = useState<number>(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState<number | null>(null);
  const [revenueMTD, setRevenueMTD] = useState<number>(0);
  const [appointmentsToday, setAppointmentsToday] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const asNumber = (obj: any, keys = ["amount", "total", "paidAmount", "paid", "price"]) => {
    for (const k of keys) {
      if (obj && (k in obj)) {
        const v = Number(obj[k]);
        if (!isNaN(v)) return v;
      }
    }
    return 0;
  };

  // refreshDashboard can be called by event handlers to immediately refresh metrics
  const refreshDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Live counts: patients and users
      try {
        const patients = await fetchPatients();
        setTotalPatients(Array.isArray(patients) ? patients.length : null);
      } catch (e) { console.warn('Failed to fetch patients for dashboard', e); }

      try {
        const uRes = await fetch('/api/users');
        if (uRes.ok) {
          const uBody = await uRes.json();
          setTotalUsers(Array.isArray(uBody.data) ? uBody.data.length : (uBody.count || null));
        }
      } catch (e) { console.warn('Failed to fetch users for dashboard', e); }

      // Discounts/promotions stats from client-side service
      try { DiscountManagementService.getStatistics(); } catch (e) { /* ignore */ }

      // Appointments from EMR (mocked)
      try {
        const appts = await emrService.getAppointments();
        const todayStr = new Date().toISOString().split('T')[0];
        const todayCount = appts.filter((a: any) => (a.appointmentDate || '').toString().startsWith(todayStr)).length;
        setAppointmentsToday(todayCount);
      } catch (e) { console.warn('Failed to fetch appointments for dashboard', e); setAppointmentsToday(null); }

      let invoices: any[] = [];
      let payments: any[] = [];
      if (!billingService.isRemoteSyncSuppressed()) {
        [invoices, payments] = await Promise.all([fetchInvoices(), fetchPayments()]);
      } else {
        invoices = [];
        payments = [];
      }

      // Total revenue today from payments
      const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
      const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
      const revenueToday = payments.reduce((sum: number, p: any) => {
        const d = new Date(p.paymentDate || p.date || p.createdAt || p.updatedAt || null);
        if (!isNaN(d.getTime()) && d >= startOfToday && d <= endOfToday) {
          return sum + asNumber(p);
        }
        return sum;
      }, 0);
      setTotalRevenueToday(revenueToday);

      // Revenue MTD
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const revenueMTDVal = payments.reduce((sum: number, p: any) => {
        const d = new Date(p.paymentDate || p.date || p.createdAt || null);
        if (!isNaN(d.getTime()) && d >= monthStart && d <= now) return sum + asNumber(p);
        return sum;
      }, 0);
      setRevenueMTD(revenueMTDVal);

      // Pending invoices count
      const pending = invoices.filter((i: any) => {
        const st = (i.status || i.state || "").toString().toLowerCase();
        return ["pending", "unpaid", "draft", "overdue"].includes(st);
      }).length;
      setPendingInvoices(pending);

      // Due this week
      const weekLater = new Date(); weekLater.setDate(now.getDate() + 7);
      const due = invoices.filter((i: any) => {
        const d = new Date(i.dueDate || i.due || i.due_at || i.date || i.createdAt || null);
        return !isNaN(d.getTime()) && d >= now && d <= weekLater;
      }).length;
      setDueThisWeek(due);

      // Processed payments count
      const processed = payments.filter((p: any) => {
        const st = (p.status || p.state || "").toString().toLowerCase();
        return ["paid", "completed", "processed"].includes(st);
      }).length;
      setProcessedPayments(processed);

      // recent activity
      const activity = [
        ...invoices.map((i: any) => ({
          type: "invoice",
          id: i._id || i.id,
          label: i.number || i.invoiceNumber || i.patientName || i.name || ("Invoice " + (i._id || i.id)),
          status: i.status || i.state,
          date: i.dueDate || i.date || i.createdAt
        })),
        ...payments.map((p: any) => ({
          type: "payment",
          id: p._id || p.id,
          label: p.invoiceNumber || p.reference || p.patientName || ("Payment " + (p._id || p.id)),
          status: p.status || p.state,
          date: p.paymentDate || p.date || p.createdAt
        }))
      ].filter(a => a.date).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,8);
      setRecentActivity(activity);
    } catch (e: any) {
      console.error("Dashboard load error:", e);
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    // initial load
    refreshDashboard();

    // refresh every 60 seconds
    const t = setInterval(() => { refreshDashboard(); }, 60000);

    // react to billing updates from other modules
    const onBillingUpdated = () => { refreshDashboard().catch((e:any)=>console.warn('refreshDashboard failed', e)); };
    window.addEventListener('billing-updated', onBillingUpdated as EventListener);
    window.addEventListener('billing-cleared', onBillingUpdated as EventListener);

    return () => { clearInterval(t); window.removeEventListener('billing-updated', onBillingUpdated as EventListener); window.removeEventListener('billing-cleared', onBillingUpdated as EventListener); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual refresh handler (keeps logic lightweight and non-blocking)
  const handleRefresh = async () => {
    try {
      setLoading(true);
      let invoices: any[] = [];
      let payments: any[] = [];
      const patients = await fetchPatients();
      if (!billingService.isRemoteSyncSuppressed()) {
        const res = await Promise.all([fetchInvoices(), fetchPayments()]);
        invoices = res[0];
        payments = res[1];
      }
      setTotalPatients(Array.isArray(patients) ? patients.length : null);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const revenueToday = (payments || []).reduce((s: number, p: any) => {
        const d = new Date(p.paymentDate || p.date || p.createdAt || null);
        if (!isNaN(d.getTime())) {
          const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
          const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
          if (d >= startOfToday && d <= endOfToday) return s + asNumber(p);
        }
        return s;
      }, 0);
      setTotalRevenueToday(revenueToday);

      const revenueMonth = (payments || []).reduce((s: number, p: any) => {
        const d = new Date(p.paymentDate || p.date || p.createdAt || null);
        if (!isNaN(d.getTime()) && d >= monthStart && d <= now) return s + asNumber(p);
        return s;
      }, 0);
      setRevenueMTD(revenueMonth);

      const pending = (invoices || []).filter((i: any) => {
        const st = (i.status || i.state || "").toString().toLowerCase();
        return ["pending", "unpaid", "draft", "overdue"].includes(st);
      }).length;
      setPendingInvoices(pending);

      const weekLater = new Date(); weekLater.setDate(now.getDate() + 7);
      const due = (invoices || []).filter((i: any) => {
        const d = new Date(i.dueDate || i.due || i.date || i.createdAt || null);
        return !isNaN(d.getTime()) && d >= now && d <= weekLater;
      }).length;
      setDueThisWeek(due);

      const processed = (payments || []).filter((p: any) => {
        const st = (p.status || p.state || "").toString().toLowerCase();
        return ["paid", "completed", "processed"].includes(st);
      }).length;
      setProcessedPayments(processed);

      const activity = [
        ...((invoices || []).map((i: any) => ({ type: 'invoice', id: i._id || i.id, label: i.number || i.patientName || ('Invoice ' + (i._id || i.id)), date: i.dueDate || i.date || i.createdAt }))),
        ...((payments || []).map((p: any) => ({ type: 'payment', id: p._id || p.id, label: p.invoiceNumber || p.reference || p.patientName || ('Payment ' + (p._id || p.id)), date: p.paymentDate || p.date || p.createdAt })))
      ].filter(a => a.date).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,8);
      setRecentActivity(activity);
    } catch (e) {
      console.warn('Refresh failed', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}. Check console/network.</div>;

  return (
    <div>
        {/* Billing and Payment System Section */}
        <section>
          <div className="bg-[#358E83] rounded-lg p-4 mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Billing and Payment System
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoice Management Card */}
            <Card className="overflow-hidden">
              <div className="flex">
                <div className="flex-1 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Invoice Management
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create, review, and send invoices to patients for services rendered. Track payment status.
                  </p>
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => onNavigateToModule("invoice")}
                  >
                    Manage Invoices
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="w-32 bg-orange-100 flex items-center justify-center">
                  <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center relative">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div className="absolute -bottom-2 -left-2 w-6 h-4 bg-orange-200 rounded transform rotate-12"></div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Processing Card */}
            <Card className="overflow-hidden">
              <div className="flex">
                <div className="flex-1 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Payment Processing
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Process patient payments through various methods, including credit card, GCash, PayMaya, and cash.
                  </p>
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => onNavigateToModule("payment")}
                  >
                    Process Payments
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="w-32 bg-orange-100 flex items-center justify-center">
                  <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center relative">
                    <CreditCard className="h-8 w-8 text-teal-500" />
                    <div className="absolute -bottom-1 -right-1 flex space-x-1">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Billing History Card */}
            <Card className="overflow-hidden">
              <div className="flex">
                <div className="flex-1 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Billing History
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Review historical billing data, payment records, and generate financial reports.
                  </p>
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => onNavigateToModule("history")}
                  >
                    View History
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="w-32 bg-orange-100 flex items-center justify-center">
                  <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Discounts & Promotions Card */}
            <Card className="overflow-hidden">
              <div className="flex">
                <div className="flex-1 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Discounts & Promotions
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Manage discount codes, promotional offers, and special pricing for patients.
                  </p>
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => onNavigateToModule("discounts")}
                  >
                    Manage Discounts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="w-32 bg-orange-100 flex items-center justify-center">
                  <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center relative">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">%</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Quick Stats Section */}
        <section className="mt-12">
          <div className="bg-[#358E83] rounded-lg p-4 mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Quick Overview</h2>
            <div>
              <Button variant="outline" onClick={handleRefresh} className="bg-white text-sm">Refresh</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Patients</p>
                      <p className="text-2xl font-semibold text-gray-900">{totalPatients ?? '—'}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Appointments Today</p>
                    <p className="text-2xl font-semibold text-gray-900">{appointmentsToday ?? '—'}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Invoices</p>
                    <p className="text-2xl font-semibold text-gray-900">{pendingInvoices}</p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Revenue (MTD)</p>
                    <p className="text-2xl font-semibold text-gray-900">₱{revenueMTD.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-teal-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="p-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Total Revenue Today</div>
          <div className="text-xl font-bold">₱{totalRevenueToday.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Pending Invoices</div>
          <div className="text-xl font-bold">{pendingInvoices}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Due This Week</div>
          <div className="text-xl font-bold">{dueThisWeek}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Processed Payments</div>
          <div className="text-xl font-bold">{processedPayments}</div>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <ul className="space-y-2">
          {recentActivity.map((a, i) => (
            <li key={a.id || i} className="flex justify-between">
              <div>
                <span className="font-medium">{a.label}</span>
                <span className="ml-2 text-sm text-gray-500">({a.type})</span>
              </div>
              <div className="text-sm text-gray-600">{new Date(a.date).toLocaleString()}</div>
            </li>
          ))}
          {recentActivity.length === 0 && <li className="text-sm text-gray-500">No recent activity</li>}
        </ul>
      </div>
    </div>
    </div>
  );
}