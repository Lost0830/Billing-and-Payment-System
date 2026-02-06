import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  Calendar,
  TrendingDown,
  Activity,
  RefreshCw,
  Clock,
  CheckCircle,
  UserCog,
  BarChart3,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { fetchInvoices, fetchPayments, fetchPatients } from "../services/api.js";
import { billingService } from "../services/billingService";
import { emrService } from "../services/emrIntegration";
import { DiscountManagementService } from "../services/discountManagementService";

// API base URL - same as api.js
const API_URL = (() => {
  try {
    const win = typeof window !== 'undefined' ? window : undefined;
    const envFromWindow = win?.__ENV__?.VITE_API_URL || win?.VITE_API_URL;
    const importMetaEnv = (typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_API_URL : undefined);
    const nodeEnvVar = (typeof process !== 'undefined' ? process?.env?.VITE_API_URL : undefined);
    const resolved = envFromWindow || importMetaEnv || nodeEnvVar || '';
    if (resolved && typeof resolved === 'string' && resolved.trim() !== '') {
      return `${resolved.replace(/\/$/, '')}/api`;
    }
  } catch {}
  return 'http://localhost:5002/api';
})();

interface MediCareBillingProps {
  onNavigateToView?: (view: string) => void;
}

export function MediCareBilling({ onNavigateToView }: MediCareBillingProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time data state
  const [totalRevenueToday, setTotalRevenueToday] = useState<number>(0);
  const [pendingInvoices, setPendingInvoices] = useState<number>(0);
  const [dueThisWeek, setDueThisWeek] = useState<number>(0);
  const [processedPayments, setProcessedPayments] = useState<number>(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState<number | null>(null);
  const [revenueMTD, setRevenueMTD] = useState<number>(0);
  const [appointmentsToday, setAppointmentsToday] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Safe number extraction with validation
  const asNumber = (obj: any, keys = ["amount", "total", "paidAmount", "paid", "price"]) => {
    if (!obj || typeof obj !== 'object') return 0;
    for (const k of keys) {
      if (k in obj) {
        const v = Number(obj[k]);
        if (!isNaN(v) && isFinite(v)) return v;
      }
    }
    return 0;
  };

  // Safe date parsing utility
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    try {
      const d = new Date(dateValue);
      return !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  };

  // Get status safely
  const getStatus = (obj: any): string => {
    const status = obj?.status || obj?.state || "";
    return status.toString().toLowerCase().trim();
  };

  // Refresh dashboard data
  const refreshDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Live counts: patients
      try {
        const patients = await fetchPatients();
        setTotalPatients(Array.isArray(patients) ? patients.length : null);
      } catch (e) { console.warn('Failed to fetch patients for dashboard', e); }

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
        // Use combined invoices endpoint to get data from all 3 databases
        try {
          const combinedRes = await fetch(`${API_URL}/invoices/combined`);
          if (combinedRes.ok) {
            const combinedData = await combinedRes.json();
            invoices = Array.isArray(combinedData.data) ? combinedData.data : (combinedData.data || []);
          } else {
            // Fallback to regular invoices
            invoices = await fetchInvoices();
          }
        } catch (err) {
          console.warn('Failed to fetch combined invoices, using regular endpoint:', err);
          invoices = await fetchInvoices();
        }
        
        payments = await fetchPayments();
      } else {
        invoices = [];
        payments = [];
      }

      // Ensure arrays
      invoices = Array.isArray(invoices) ? invoices : [];
      payments = Array.isArray(payments) ? payments : [];

      // Total revenue today from payments
      const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
      const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
      const revenueToday = payments.reduce((sum: number, p: any) => {
        const d = parseDate(p.paymentDate || p.date || p.createdAt || p.updatedAt);
        if (d && d >= startOfToday && d <= endOfToday) {
          return sum + asNumber(p);
        }
        return sum;
      }, 0);
      setTotalRevenueToday(revenueToday);

      // Revenue MTD
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const revenueMTDVal = payments.reduce((sum: number, p: any) => {
        const d = parseDate(p.paymentDate || p.date || p.createdAt);
        if (d && d >= monthStart && d <= now) return sum + asNumber(p);
        return sum;
      }, 0);
      setRevenueMTD(revenueMTDVal);

      // Pending invoices count - only count unpaid/pending invoices
      const pending = invoices.filter((i: any) => {
        const st = getStatus(i);
        // Exclude paid invoices
        return st !== "paid" && st !== "completed" && ["pending", "unpaid", "draft", "sent", "overdue"].includes(st);
      }).length;
      setPendingInvoices(pending);

      // Due this week - invoices due in the next 7 days that are not paid
      const weekLater = new Date(); 
      weekLater.setDate(now.getDate() + 7);
      weekLater.setHours(23, 59, 59, 999);
      const due = invoices.filter((i: any) => {
        const st = getStatus(i);
        // Only count unpaid invoices
        if (st === "paid" || st === "completed") return false;
        const d = parseDate(i.dueDate || i.due || i.due_at || i.date || i.createdAt);
        if (!d) return false;
        // Check if due date is between now and 7 days from now
        return d >= now && d <= weekLater;
      }).length;
      setDueThisWeek(due);

      // Processed payments count
      const processed = payments.filter((p: any) => {
        const st = getStatus(p);
        return ["paid", "completed", "processed"].includes(st);
      }).length;
      setProcessedPayments(processed);

      // Recent activity - combine invoices and payments, show most recent
      const activity = [
        ...invoices.map((i: any) => ({
          type: "invoice",
          id: i._id || i.id || i.number,
          label: i.number || i.invoiceNumber || `INV-${(i._id || i.id || '').toString().slice(-6)}` || i.patientName || ("Invoice " + (i._id || i.id)),
          status: getStatus(i),
          date: parseDate(i.date || i.dueDate || i.createdAt),
          amount: asNumber(i),
          createdAt: i.createdAt || i.date
        })),
        ...payments.map((p: any) => ({
          type: "payment",
          id: p._id || p.id || p.transactionId,
          label: p.transactionId || p.invoiceNumber || p.reference || p.number || p.paymentNumber || ("Payment " + (p._id || p.id)),
          status: getStatus(p),
          date: parseDate(p.paymentDate || p.date || p.createdAt),
          amount: asNumber(p),
          createdAt: p.createdAt || p.paymentDate || p.date
        }))
      ]
      .filter(a => a.date)
      .sort((a, b) => {
        // Sort by date (most recent first)
        const aTime = a.date?.getTime() || 0;
        const bTime = b.date?.getTime() || 0;
        if (aTime !== bTime) return bTime - aTime;
        // If dates are equal, sort by createdAt
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bCreated - aCreated;
      })
      .slice(0, 10); // Show last 10 activities
      setRecentActivities(activity);
      
      setLastUpdate(new Date());
      setIsConnected(true);
    } catch (e: any) {
      console.error("Dashboard load error:", e);
      setError(e.message || "Failed to load dashboard data");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    // Initial load on component mount
    refreshDashboard();

    // React to billing updates from other modules (transaction-based refresh only)
    const onBillingUpdated = () => {
      if (mounted) refreshDashboard().catch((e: any) => console.warn('refresh failed', e));
    };
    const onBillingCleared = () => {
      if (mounted) refreshDashboard().catch((e: any) => console.warn('refresh failed', e));
    };

    window.addEventListener('billing-updated', onBillingUpdated as EventListener);
    window.addEventListener('billing-cleared', onBillingCleared as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('billing-updated', onBillingUpdated as EventListener);
      window.removeEventListener('billing-cleared', onBillingCleared as EventListener);
    };
  }, []);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard();
      toast.success("Dashboard data refreshed successfully!");
    } catch (e) {
      toast.error("Failed to refresh dashboard");
      console.warn('Refresh failed', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format time since last update
  const getTimeSinceUpdate = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}. Check console/network.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Last Updated Info */}
      <div className="flex justify-end px-8 py-4">
        <div className="text-right">
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Clock className="h-4 w-4 mr-2" />
            <span>Last updated: {getTimeSinceUpdate()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={isConnected ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{getCurrentDateTime()}</p>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue Today */}
          <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue Today</p>
                  <p className="text-2xl font-bold text-gray-900">₱{totalRevenueToday.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                </div>
                <DollarSign className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex items-center gap-1 text-xs text-teal-700">
                <TrendingUp className="h-3 w-3" />
                <span>Real-time from system</span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Invoices */}
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingInvoices}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex items-center gap-1 text-xs text-red-700">
                <AlertTriangle className="h-3 w-3" />
                <span>Awaiting payment</span>
              </div>
            </CardContent>
          </Card>

          {/* Due This Week */}
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Due This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{dueThisWeek}</p>
                </div>
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex items-center gap-1 text-xs text-yellow-700">
                <Clock className="h-3 w-3" />
                <span>Next 7 days</span>
              </div>
            </CardContent>
          </Card>

          {/* Processed Payments */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Processed Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{processedPayments}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex items-center gap-1 text-xs text-green-700">
                <TrendingUp className="h-3 w-3" />
                <span>Completed transactions</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start h-auto p-4"
                style={{backgroundColor: "#358E83"}}
                onClick={() => onNavigateToView?.('invoice')}
              >
                <FileText className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Generate Invoice</div>
                  <div className="text-xs opacity-90">Create new patient invoice</div>
                </div>
              </Button>
              
              <Button 
                className="w-full justify-start h-auto p-4"
                style={{backgroundColor: "#E94D61"}}
                onClick={() => onNavigateToView?.('payment')}
              >
                <DollarSign className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Process Payment</div>
                  <div className="text-xs opacity-90">Record patient payment</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start h-auto p-4"
                onClick={() => onNavigateToView?.('patients-management')}
              >
                <UserCog className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Patient Management</div>
                  <div className="text-xs text-gray-600">View patient records</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start h-auto p-4"
                onClick={() => onNavigateToView?.('history')}
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">View Reports</div>
                  <div className="text-xs text-gray-600">Billing analytics</div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-teal-600 hover:text-teal-700"
              >
                <RotateCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'payment' ? 'bg-green-100' :
                          activity.type === 'invoice' ? 'bg-blue-100' :
                          'bg-orange-100'
                        }`}>
                          {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-green-600" />}
                          {activity.type === 'invoice' && <FileText className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.label}</p>
                          <p className="text-xs text-gray-500">
                            {activity.date ? (() => {
                              const date = new Date(activity.date);
                              return date.toLocaleDateString('en-PH', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              }) + ', ' + date.toLocaleTimeString('en-PH', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              });
                            })() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                          activity.status === 'paid' || activity.status === 'completed' || activity.status === 'processed'
                            ? 'bg-green-100 text-green-700'
                            : activity.status === 'pending' || activity.status === 'unpaid' || activity.status === 'draft' || activity.status === 'sent'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {activity.status === 'completed' ? 'completed' : activity.status === 'paid' ? 'paid' : activity.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}