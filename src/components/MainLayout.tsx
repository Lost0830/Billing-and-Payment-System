import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Activity,
  User,
  LogOut,
  ChevronDown,
  FileText,
  CreditCard,
  History,
  Tag,
  Settings,
  ChevronLeft,
  Users,
  UserCog,
  Archive,
  Bell,
  CheckCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { notificationService, Notification } from "../services/notificationService";

interface UserSession {
  email: string;
  role: string;
  system: string;
}

interface MainLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigateToView: (view: string) => void;
  pageTitle?: string;
  pageDescription?: string;
  userSession?: UserSession | null;
}

export function MainLayout({
  children,
  currentView,
  onNavigateToView,
  pageTitle,
  pageDescription,
  userSession,
}: MainLayoutProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Subscribe to notifications
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notifs) => {
      setNotifications(notifs);
    });

    // Initialize and start polling
    notificationService.initializeCounts().then(() => {
      notificationService.startPolling('http://localhost:5002/api', 5000); // Poll every 5 seconds
    });

    return () => {
      unsubscribe();
      notificationService.stopPolling();
    };
  }, []);

  const isBillingSystem =
    userSession?.system === "billing" ||
    [
      "medicare-billing",
      "invoice",
      "payment",
      "history",
      "discounts",
      "user-management",
      "discount-management",
      "patients-management",
      "archive",
    ].includes(currentView);

  const getBillingSidebarItems = () => {
    const baseItems: Array<any> = [];

    if (userSession?.role === "admin") {
      baseItems.push(
        { id: "medicare-billing", label: "Dashboard", icon: Activity, description: "Admin billing dashboard" },
        { id: "invoice", label: "Invoice Generation", icon: FileText, description: "Create and manage invoices" },
        { id: "patients-management", label: "Patient Management", icon: UserCog, description: "Manage patient records" },
        { id: "discount-management", label: "Discount Management", icon: Tag, description: "Manage discount codes and promotions" },
        { id: "user-management", label: "User Management", icon: Users, description: "Manage system users and roles" },
        { id: "archive", label: "Archive", icon: Archive, description: "View and manage archived items" },
        { id: "settings", label: "Settings", icon: Settings, description: "System configuration" }
      );
      return baseItems;
    }

    baseItems.push(
      { id: "medicare-billing", label: "Dashboard", icon: Activity, description: "Billing overview and metrics" },
      { id: "invoice", label: "View Invoices", icon: FileText, description: "View invoices from EMR and Pharmacy" },
      { id: "payment", label: "Payment Processing", icon: CreditCard, description: "Process payments and transactions" },
      { id: "history", label: "Billing History", icon: History, description: "View billing records and reports" },
      { id: "patients-management", label: "Patient Management", icon: UserCog, description: "View patient records and billing" },
      { id: "settings", label: "Settings", icon: Settings, description: "System configuration" }
    );

    return baseItems;
  };

  const getNavigationItems = () => {
    if (userSession?.system === "pharmacy") return [{ id: "pharmacy", label: "Pharmacy" }, { id: "settings", label: "Settings" }];
    if (userSession?.system === "emr") return [{ id: "emr", label: "EMR" }, { id: "settings", label: "Settings" }];
    return [{ id: "dashboard", label: "Dashboard" }, { id: "emr", label: "EMR" }, { id: "pharmacy", label: "Pharmacy" }, { id: "billing", label: "Billing" }, { id: "settings", label: "Settings" }];
  };

  const navigationItems = getNavigationItems();
  const billingSidebarItems = getBillingSidebarItems();

  const handleNavigation = (itemId: string) => {
    if (userSession?.system === "billing" && itemId !== "billing" && itemId !== "settings") return;
    if (userSession?.system === "pharmacy" && itemId !== "pharmacy" && itemId !== "settings") return;
    if (userSession?.system === "emr" && itemId !== "emr" && itemId !== "settings") return;

    if (itemId === "dashboard") onNavigateToView("dashboard");
    else if (itemId === "emr") onNavigateToView("patients");
    else if (itemId === "pharmacy") onNavigateToView("pharmacy");
    else if (itemId === "billing") onNavigateToView("medicare-billing");
    else onNavigateToView(itemId);
  };

  const handleBillingSidebarNavigation = (itemId: string) => {
    onNavigateToView(itemId);
  };

  const handleBackToHIMS = () => onNavigateToView("medicare-billing");

  const getCurrentDateTime = () =>
    new Date().toLocaleString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const getActiveItem = (itemId: string) => currentView === itemId;

  // quick-links remain in the sidebar and are sticky; no movement into main

  // --- Unified Layout: Fixed sidebar on left + scrollable main area on right
  return (
    <div className="flex h-screen bg-[#F7FAFC]">
      {/* Fixed Sidebar - doesn't scroll */}
      {isBillingSystem && (
        <aside className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-gray-200 flex flex-col z-40">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#358E83] rounded-md flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="text-lg font-semibold text-gray-900">HIMS</div>

            <Button variant="ghost" size="sm" className="ml-auto text-gray-400 hover:text-gray-600" onClick={handleBackToHIMS}>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs ml-1 hidden sm:inline">Back</span>
            </Button>
          </div>

          {/* Sidebar Navigation (in a Card container similar to invoices) */}
          <div className="flex-1 p-4 flex flex-col">
          <div className="mb-6 flex-1">
            <Card className="shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-sm">Navigation</CardTitle>
                <CardDescription className="text-xs">Quick links</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1 p-4">
                    {billingSidebarItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleBillingSidebarNavigation(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isActive ? "bg-[#358E83] text-white" : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 text-xs text-gray-400">{getCurrentDateTime()}</div>
          </div>
        </aside>
      )}

      {/* Main Content Area - scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: '16rem', minHeight: '100vh' }}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-gray-900 mb-1">{pageTitle || "Hospital Information Management System"}</h1>
              <p className="text-gray-600">{pageDescription || ""}</p>
            </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 hover:bg-gray-100 relative"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="h-5 w-5" />
                <span className="text-sm">Notifications</span>
                {notificationService.getUnreadCount() > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {notificationService.getUnreadCount() > 9 ? '9+' : notificationService.getUnreadCount()}
                  </span>
                )}
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                    <div className="w-8 h-8 bg-[#358E83] rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    {userSession && (
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">{userSession.role}</div>
                        <div className="text-xs text-gray-500">{userSession.system}</div>
                      </div>
                    )}
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {userSession && (
                    <div className="px-3 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{userSession.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{userSession.role} - {userSession.system}</p>
                    </div>
                  )}
                  <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="text-red-600 hover:text-red-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Page Content - scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Notifications</DialogTitle>
                <DialogDescription>
                  {notificationService.getUnreadCount() > 0 
                    ? `${notificationService.getUnreadCount()} unread notification${notificationService.getUnreadCount() > 1 ? 's' : ''}`
                    : 'No new notifications'}
                </DialogDescription>
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    notificationService.markAllAsRead();
                  }}
                  className="text-xs"
                >
                  Mark all as read
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = notif.type === 'success' ? CheckCircle 
                  : notif.type === 'error' ? AlertTriangle 
                  : notif.type === 'warning' ? AlertTriangle 
                  : Info;
                const iconColor = notif.type === 'success' ? 'text-green-600'
                  : notif.type === 'error' ? 'text-red-600'
                  : notif.type === 'warning' ? 'text-yellow-600'
                  : 'text-blue-600';
                
                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notif.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                    }`}
                    onClick={() => {
                      notificationService.markAsRead(notif.id);
                      if (notif.actionUrl) {
                        onNavigateToView(notif.actionUrl);
                        setShowNotifications(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-medium text-sm ${!notif.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {notif.timestamp.toLocaleTimeString('en-PH', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out? Any unsaved changes will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onNavigateToView("logout")} className="bg-red-600 hover:bg-red-700">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
