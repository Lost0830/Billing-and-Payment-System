# Code Organization Guide

This document outlines how the HIMS Billing System codebase is organized for easy identification and maintenance.

## 📁 Directory Structure

### `/hooks/` - Custom React Hooks
- **`useAuth.ts`** - Authentication state management
  - User session handling
  - Login/logout functionality
  - Authentication status checks

- **`useNavigation.ts`** - Navigation logic
  - View routing between different pages
  - System-specific navigation restrictions
  - URL/state management

### `/components/auth/` - Authentication Components
- **`AuthenticatedApp.tsx`** - Main app container for logged-in users
  - Handles all authenticated views
  - Manages billing module routing
  - Provides page information and layouts

### `/components/pages/` - Page Container Components
- **`LandingPageContainer.tsx`** - Landing page wrapper
  - System selection interface
  - Entry point for unauthenticated users

- **`LoginPageContainer.tsx`** - Login page wrapper
  - Authentication form handling
  - System-specific login flows

### `/components/` - Core UI Components
- **Billing System Components:**
  - `MediCareBilling.tsx` - Main billing dashboard
  - `InvoiceGeneration.tsx` - Invoice creation
  - `PaymentProcessing.tsx` - Payment handling
  - `BillingHistory.tsx` - Transaction history
  - `DiscountsPromotions.tsx` - Discount management

- **Layout Components:**
  - `MainLayout.tsx` - Primary app layout with navigation (includes billing sidebar)

- **Other System Components:**
  - `Dashboard.tsx` - Admin dashboard
  - `Patients.tsx` - Patient management
  - `Pharmacy.tsx` - Pharmacy integration
  - `Settings.tsx` - System settings

### `/services/` - Business Logic & Integrations
- **`integrationService.ts`** - Integration management wrapper
- **`integrationManager.ts`** - Core integration orchestration
- **`emrIntegration.ts`** - EMR system integration
- **`pharmacyIntegration.ts`** - Pharmacy system integration

### `/styles/` - Styling
- **`globals.css`** - Global styles and design tokens

## 🔍 Quick Identification Guide

### Landing Page Code
- **Main Component:** `/components/LandingPage.tsx`
- **Container:** `/components/pages/LandingPageContainer.tsx`
- **Logic:** Landing logic in `/App.tsx` → `renderCurrentView()`

### Login System Code
- **Main Component:** `/components/LoginPage.tsx`
- **Container:** `/components/pages/LoginPageContainer.tsx`
- **Logic:** `/hooks/useAuth.ts`
- **Flow:** `/App.tsx` → `handleLogin()`

### Billing System Code
- **Main Components:** All `components/*Billing*.tsx` and billing modules
- **Layout:** `/components/MainLayout.tsx` (with billing sidebar)
- **Navigation:** Billing-specific routing in `/hooks/useNavigation.ts`
- **Entry Point:** `/components/auth/AuthenticatedApp.tsx`

### Authentication & Security
- **Session Management:** `/hooks/useAuth.ts`
- **Route Protection:** `/hooks/useNavigation.ts`
- **User Restrictions:** System-based navigation limits in navigation hooks

### Integration & Services
- **External APIs:** `/services/` directory
- **EMR Integration:** `/services/emrIntegration.ts`
- **Pharmacy Integration:** `/services/pharmacyIntegration.ts`

## 🔄 User Flow

1. **Landing** → `LandingPageContainer` → `LandingPage`
2. **Login** → `LoginPageContainer` → `LoginPage` → `useAuth.login()`
3. **Authenticated** → `AuthenticatedApp` → System-specific components
4. **Billing Access** → `MainLayout` (billing sidebar) → Billing modules
5. **Logout** → `useAuth.logout()` → Back to Landing

## 🎯 Benefits of This Organization

- **Separation of Concerns:** Each file has a single responsibility
- **Easy Debugging:** Clear path to find specific functionality
- **Maintainable:** Changes in one area don't affect others
- **Scalable:** Easy to add new systems or modify existing ones
- **Type Safe:** TypeScript interfaces defined in appropriate hooks
- **Testable:** Individual components and hooks can be tested separately