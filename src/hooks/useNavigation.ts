import { useState } from "react";
import { UserSession } from "./useAuth";

export function useNavigation() {
  const [currentView, setCurrentView] = useState("landing");

  const navigateToView = (view: string, userSession?: UserSession | null) => {
    // Restrict navigation based on user's system
    if (userSession?.system === "billing") {
      const allowedBillingViews = ["medicare-billing", "invoice", "payment", "history", "discounts", "user-management", "discount-management", "patients-management", "calculator", "settings"];
      if (view === "billing") {
        setCurrentView("medicare-billing");
      } else if (allowedBillingViews.includes(view)) {
        setCurrentView(view);
      }
      // Ignore navigation to other systems for billing users
      return;
    } else if (userSession?.system === "pharmacy") {
      const allowedPharmacyViews = ["pharmacy", "settings"];
      if (allowedPharmacyViews.includes(view)) {
        setCurrentView(view);
      }
      return;
    } else if (userSession?.system === "emr") {
      const allowedEmrViews = ["patients", "appointments", "settings"];
      if (view === "emr") {
        setCurrentView("patients");
      } else if (allowedEmrViews.includes(view)) {
        setCurrentView(view);
      }
      return;
    }

    // Default navigation for dashboard/admin users or no session
    if (view === "billing") {
      setCurrentView("medicare-billing");
    } else if (view === "emr") {
      setCurrentView("patients");
    } else {
      setCurrentView(view);
    }
  };

  const navigateToSystem = (system: string) => {
    if (system === "billing") {
      setCurrentView("medicare-billing");
    } else if (system === "emr") {
      setCurrentView("patients");
    } else if (system === "pharmacy") {
      setCurrentView("pharmacy");
    } else {
      setCurrentView("dashboard");
    }
  };

  const navigateToLanding = () => {
    setCurrentView("landing");
  };

  const navigateToLogin = () => {
    setCurrentView("login");
  };

  return {
    currentView,
    setCurrentView,
    navigateToView,
    navigateToSystem,
    navigateToLanding,
    navigateToLogin
  };
}