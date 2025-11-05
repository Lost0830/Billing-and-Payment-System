import { useState } from "react";
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
  Calculator,
} from "lucide-react";
import { toast } from "sonner";

interface MediCareBillingProps {
  onNavigateToView?: (view: string) => void;
}

export function MediCareBilling({ onNavigateToView }: MediCareBillingProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success("Dashboard data refreshed successfully!");
  };

  // Mock data for dashboard metrics
  const dashboardMetrics = [
    {
      title: "Total Revenue Today",
      value: "₱45,847",
      change: "+18% from yesterday",
      positive: true,
      icon: DollarSign,
      bgColor: "bg-teal-50",
      iconColor: "#358E83",
    },
    {
      title: "Pending Invoices",
      value: "23",
      change: "5 critical items",
      positive: false,
      icon: AlertTriangle,
      bgColor: "bg-red-50",
      iconColor: "#E94D61",
    },
    {
      title: "Due This Week",
      value: "156",
      change: "Next 7 days",
      positive: null,
      icon: Calendar,
      bgColor: "bg-yellow-50",
      iconColor: "#F59E0B",
    },
    {
      title: "Processed Payments",
      value: "₱127,450",
      change: "+24% from yesterday",
      positive: true,
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconColor: "#10B981",
    },
  ];

  // Mock recent activities
  const recentActivities = [
    { id: 1, type: "payment", description: "Payment received from Juan Dela Cruz", amount: "₱2,500", time: "2 minutes ago" },
    { id: 2, type: "invoice", description: "Invoice #INV-2024-001 generated", amount: "₱8,750", time: "15 minutes ago" },
    { id: 3, type: "discount", description: "Senior citizen discount applied", amount: "-₱350", time: "1 hour ago" },
    { id: 4, type: "payment", description: "GCash payment processed", amount: "₱4,200", time: "2 hours ago" },
  ];

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

  return (
    <div className="space-y-6">
      {/* Last Updated Info */}
      <div className="flex justify-end">
        <div className="text-right">
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <Clock className="h-4 w-4 mr-1" />
            Last updated: 2 minutes ago
          </div>
          <p className="text-xs text-gray-400">{getCurrentDateTime()}</p>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index} className={`${metric.bgColor} border-0`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/80">
                      <IconComponent 
                        className="h-6 w-6" 
                        style={{ color: metric.iconColor }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                  <p className={`text-xs flex items-center ${
                    metric.positive === true ? 'text-green-600' : 
                    metric.positive === false ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metric.positive === true && <TrendingUp className="h-3 w-3 mr-1" />}
                    {metric.positive === false && <TrendingDown className="h-3 w-3 mr-1" />}
                    {metric.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>



      {/* Quick Actions and Recent Activity */}
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
              <Activity className="h-4 w-4 mr-3" />
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
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'payment' ? 'bg-green-100' :
                      activity.type === 'invoice' ? 'bg-blue-100' :
                      'bg-orange-100'
                    }`}>
                      {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-green-600" />}
                      {activity.type === 'invoice' && <FileText className="h-4 w-4 text-blue-600" />}
                      {activity.type === 'discount' && <Badge className="h-4 w-4 text-orange-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      activity.amount.startsWith('-') ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {activity.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}