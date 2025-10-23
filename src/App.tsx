import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useNavigation } from "./hooks/useNavigation";
import { IntegrationService } from "./services/integrationService";
import { AuthenticatedApp } from "./components/auth/AuthenticatedApp";
import { LandingPageContainer } from "./components/pages/LandingPageContainer";
import { LoginPageContainer } from "./components/pages/LoginPageContainer";
import { Toaster } from "./components/ui/sonner";
export default function App() {
  const [pendingSystem, setPendingSystem] = useState<string | null>(null);
  
  // Custom hooks for authentication and navigation
  const { userSession, login, logout, isAuthenticated } = useAuth();
  const { currentView, navigateToView, navigateToSystem, navigateToLanding, navigateToLogin } = useNavigation();

  // Initialize integration services on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await IntegrationService.initialize();
      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };

    initializeApp();

    // Cleanup on app unmount
    return () => {
      IntegrationService.cleanup();
    };
  }, []);

  // Handle navigation to login from landing page
  const handleNavigateToLogin = (system: string) => {
    setPendingSystem(system);
    navigateToLogin();
  };

  // Handle login submission
  const handleLogin = (credentials: { email: string; password: string; system: string }) => {
    const system = login(credentials);
    navigateToSystem(system);
    setPendingSystem(null);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigateToLanding();
  };

  // Handle back to landing from login
  const handleBackToLanding = () => {
    setPendingSystem(null);
    navigateToLanding();
  };

  // Handle navigation with authentication and logout logic
  const handleNavigateToView = (view: string) => {
    if (view === "logout") {
      handleLogout();
      return;
    }
    navigateToView(view, userSession);
  };

  // Render appropriate view based on authentication state and current view
  const renderCurrentView = () => {
    // Landing page - not authenticated
    if (currentView === "landing" && !isAuthenticated) {
      return <LandingPageContainer onNavigateToLogin={handleNavigateToLogin} />;
    }

    // Login page - not authenticated but system selected
    if (currentView === "login" && !isAuthenticated && pendingSystem) {
      return (
        <LoginPageContainer 
          system={pendingSystem} 
          onLogin={handleLogin}
          onBack={handleBackToLanding}
        />
      );
    }

    // Authenticated views
    if (isAuthenticated && userSession) {
      return (
        <AuthenticatedApp 
          currentView={currentView}
          userSession={userSession}
          onNavigateToView={handleNavigateToView}
        />
      );
    }

    // Fallback to landing page
    return <LandingPageContainer onNavigateToLogin={handleNavigateToLogin} />;
  };

  return (
    <>
      {renderCurrentView()}
      <Toaster />
    </>
  );
}