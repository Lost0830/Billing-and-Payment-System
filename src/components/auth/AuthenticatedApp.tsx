import { MediCareBilling } from "../MediCareBilling";
import { AdminDashboard } from "../AdminDashboard";
import { Patients } from "../Patients";
import { PatientsManagement } from "../PatientsManagement";
import { Appointments } from "../Appointments";
import { Settings } from "../Settings";
import { Pharmacy } from "../Pharmacy";
import { AdminInvoiceGeneration } from "../AdminInvoiceGeneration";
import { CashierInvoiceView } from "../CashierInvoiceView";
import { PaymentProcessing } from "../PaymentProcessing";
import { BillingHistory } from "../BillingHistory";
import { DiscountsPromotions } from "../DiscountsPromotions";
import { DiscountManagement } from "../DiscountManagement";
import { UserManagement } from "../UserManagement";
import { MainLayout } from "../MainLayout";
import { Archive } from "../Archive";
import { UserSession } from "../../hooks/useAuth";

interface AuthenticatedAppProps {
  currentView: string;
  userSession: UserSession;
  onNavigateToView: (view: string) => void;
}

export function AuthenticatedApp({ currentView, userSession, onNavigateToView }: AuthenticatedAppProps) {
  // Get page title and description based on current view
  const getPageInfo = () => {
    switch (currentView) {
      case "dashboard":
        return {
          title: "Dashboard",
          description: "Welcome to the Hospital Information Management System (HIMS). This dashboard provides an overview of the system's key functionalities."
        };
      case "patients":
        return {
          title: "Patient Records",
          description: "Manage patient information, medical histories, and electronic medical records."
        };
      case "patients-management":
        return {
          title: "Patient Management",
          description: "View patient information, services, and pharmacy purchases with complete billing details."
        };
      case "appointments":
        return {
          title: "Appointments",
          description: "Schedule, manage, and track patient appointments with healthcare providers."
        };
      case "pharmacy":
        return {
          title: "Pharmacy Integration",
          description: "Manage integrated pharmacy systems, medication inventory, and patient prescriptions."
        };
      case "medicare-billing":
        return {
          title: "Billing Dashboard",
          description: "Overview of billing operations and key performance metrics"
        };
      case "invoice":
        return {
          title: "Invoice Generation",
          description: "Create and manage patient invoices for services rendered."
        };
      case "payment":
        return {
          title: "Payment Processing",
          description: "Process patient payments through various payment methods."
        };
      case "history":
        return {
          title: "Billing History",
          description: "View billing records, payment history, and pharmacy transactions."
        };
      case "discounts":
        return {
          title: "Discounts & Promotions",
          description: "Manage discount codes, promotional offers, and special pricing."
        };
      case "discount-management":
        return {
          title: "Discount Management",
          description: "Manage discount codes, promotional offers, and special pricing (Admin Only)."
        };
      case "user-management":
        return {
          title: "User Management",
          description: "Manage system users, roles, and permissions."
        };
      case "settings":
        return {
          title: "Settings",
          description: "Configure system settings and user preferences."
        };
      case "archive":
        return {
          title: "Archive",
          description: "View, restore, or permanently delete archived items."
        };
      default:
        return {
          title: "HIMS",
          description: "Hospital Information Management System."
        };
    }
  };

  // Check if current view is a billing module
  const billingModules = ["medicare-billing", "payment", "history", "discounts"];
  const adminModules = ["invoice", "discount-management", "user-management"];
  const sharedModules = ["patients-management"]; // Accessible by both admins and cashiers
  const isBillingModule = billingModules.includes(currentView);
  const isAdminModule = adminModules.includes(currentView);
  const isSharedModule = sharedModules.includes(currentView);

  // Render billing content
  const renderBillingContent = () => {
    // Cashiers can access invoice viewing and payment processing
    switch (currentView) {
      case "medicare-billing":
        return <MediCareBilling onNavigateToView={onNavigateToView} />;
      case "payment":
        return <PaymentProcessing onNavigateToView={onNavigateToView} userSession={userSession} />;
      case "history":
        return <BillingHistory onNavigateToView={onNavigateToView} />;
      case "discounts":
        return <DiscountsPromotions onNavigateToView={onNavigateToView} />;
      default:
        return <CashierInvoiceView onNavigateToView={onNavigateToView} />;
    }
  };

  // Render admin content
  const renderAdminContent = () => {
    switch (currentView) {
      case "invoice":
        return <AdminInvoiceGeneration onNavigateToView={onNavigateToView} />;
      case "discount-management":
        return <DiscountManagement onNavigateToView={onNavigateToView} />;
      case "user-management":
        return <UserManagement onNavigateToView={onNavigateToView} />;
      case "patients-management":
        return <PatientsManagement onNavigateToView={onNavigateToView} userSession={userSession} />;
      default:
        return <AdminDashboard onNavigateToModule={onNavigateToView} />;
    }
  };

  // Render content based on current view
  const renderContent = () => {
    // Shared modules (accessible by both admins and cashiers)
    if (isSharedModule) {
      return <PatientsManagement onNavigateToView={onNavigateToView} userSession={userSession} />;
    }

    // Admin modules (admin-only) - but show CashierInvoiceView for cashiers accessing "invoice"
    if (isAdminModule) {
      if (userSession.role === 'admin') {
        return renderAdminContent();
      }
      // Cashiers accessing "invoice" should see CashierInvoiceView
      if (currentView === 'invoice' && userSession.role === 'cashier') {
        return <CashierInvoiceView onNavigateToView={onNavigateToView} />;
      }
    }

    // Billing modules (render specific component based on view)
    if (isBillingModule) {
      return renderBillingContent();
    }

    switch (currentView) {
      case "dashboard":
        // Show AdminDashboard for admin users, MediCareBilling for cashiers
        return userSession.role === 'admin' 
          ? <AdminDashboard onNavigateToModule={onNavigateToView} />
          : <MediCareBilling onNavigateToView={onNavigateToView} />;
      case "patients":
        return <Patients onNavigateToView={onNavigateToView} />;
      case "appointments":
        return <Appointments onNavigateToView={onNavigateToView} />;
      case "pharmacy":
        return <Pharmacy onNavigateToView={onNavigateToView} />;
      case "settings":
        return <Settings onNavigateToView={onNavigateToView} />;
      case "archive":
        return <Archive />;
      default:
        return userSession.role === 'admin'
          ? <AdminDashboard onNavigateToModule={onNavigateToView} />
          : <MediCareBilling onNavigateToView={onNavigateToView} />;
    }
  };

  const pageInfo = getPageInfo();

  return (
    <MainLayout
      currentView={currentView}
      onNavigateToView={onNavigateToView}
      pageTitle={pageInfo.title}
      pageDescription={pageInfo.description}
      userSession={userSession}
    >
      {renderContent()}
    </MainLayout>
  );
}