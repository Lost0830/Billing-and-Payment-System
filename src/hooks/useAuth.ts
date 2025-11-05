import { useState } from "react";

export interface UserSession {
  email: string;
  name: string;
  role: string;
  system: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  system: string;
}

// Function to detect role from email
function detectRoleFromEmail(email: string): string {
  const lowercaseEmail = email.toLowerCase();
  
  // Admin emails
  if (lowercaseEmail.includes('admin@')) {
    return 'admin';
  }
  
  // Cashier emails
  if (lowercaseEmail.includes('cashier@') || 
      lowercaseEmail.includes('billing@')) {
    return 'cashier';
  }
  
  // Default to cashier for other emails
  return 'cashier';
}

// Mock user database - in a real app, this would come from a backend
const userDatabase: Record<string, string> = {
  'admin@hospital.com': 'Dr. Maria Santos',
  'billing.cashier@hospital.com': 'Ana Cruz',
  'cashier@hospital.com': 'Roberto Dela Cruz',
  'cashier2@hospital.com': 'Juan Lopez',
  // Add more users as needed
};

// Function to get user's name from email
function getUserNameFromEmail(email: string): string {
  const lowercaseEmail = email.toLowerCase();
  
  // Check if user exists in database
  if (userDatabase[lowercaseEmail]) {
    return userDatabase[lowercaseEmail];
  }
  
  // If not in database, generate a name from email
  const emailPart = lowercaseEmail.split('@')[0];
  const nameParts = emailPart.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  );
  return nameParts.join(' ');
}

export function useAuth() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const login = (credentials: LoginCredentials) => {
    const detectedRole = detectRoleFromEmail(credentials.email);
    const userName = getUserNameFromEmail(credentials.email);
    
    setUserSession({
      email: credentials.email,
      name: userName,
      role: detectedRole,
      system: credentials.system
    });

    // Show success notification
    import("sonner").then(({ toast }) => {
      toast.success(`Welcome to ${credentials.system.toUpperCase()}! Signed in as ${detectedRole}.`);
    });

    return credentials.system;
  };

  const logout = () => {
    const currentSystem = userSession?.system;
    setUserSession(null);
    
    // Show logout notification
    import("sonner").then(({ toast }) => {
      toast.success("Successfully signed out. Redirected to landing page.");
    });

    return currentSystem;
  };

  const isAuthenticated = !!userSession;

  return {
    userSession,
    login,
    logout,
    isAuthenticated
  };
}