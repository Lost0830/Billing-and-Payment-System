import { Hospital, Settings, FlaskConical, Heart, CreditCard } from "lucide-react";
import { Button } from "./ui/button";

interface LandingPageProps {
  onNavigateToLogin: (system: string) => void;
}

export function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#358E83]/10 rounded-xl">
                <Hospital className="text-[#358E83]" size={28} />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">HIMS</h1>
                <p className="text-xs text-gray-600">Hospital Information Management</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-[#358E83] hover:bg-[#358E83]/10 px-4 py-2 rounded-lg font-medium"
            >
              <Settings className="mr-2" size={18} />
              Settings
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#358E83]/10 rounded-2xl mb-8">
            <Hospital className="text-[#358E83]" size={40} />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Hospital Information
            <br />
            <span className="text-[#358E83]">Management System</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Integrated healthcare solutions for modern hospitals. Streamline operations, enhance patient care, and optimize your healthcare workflows.
          </p>
        </div>

        {/* System Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Pharmacy Management */}
          <div className="group bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-xl hover:border-[#358E83]/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-[#358E83]/10 rounded-xl mb-6 group-hover:bg-[#358E83]/20 transition-colors">
                <FlaskConical className="text-[#358E83]" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Pharmacy Management
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Comprehensive medication management, inventory tracking, prescription processing, and pharmaceutical workflow optimization.
              </p>
              <Button 
                onClick={() => onNavigateToLogin('pharmacy')}
                className="w-full bg-[#358E83] hover:bg-[#358E83]/90 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Access Pharmacy
              </Button>
            </div>
          </div>

          {/* Electronic Medical Records */}
          <div className="group bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-xl hover:border-[#358E83]/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-[#358E83]/10 rounded-xl mb-6 group-hover:bg-[#358E83]/20 transition-colors">
                <Heart className="text-[#358E83]" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Appointment and Patient Records
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Secure patient data management, medical history tracking, clinical documentation, and healthcare information systems.
              </p>
              <Button 
                onClick={() => onNavigateToLogin('apr')}
                className="w-full bg-[#358E83] hover:bg-[#358E83]/90 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Access Patient Records
              </Button>
            </div>
          </div>

          {/* Billing & Payment */}
          <div className="group bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-xl hover:border-[#358E83]/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-[#358E83]/10 rounded-xl mb-6 group-hover:bg-[#358E83]/20 transition-colors">
                <CreditCard className="text-[#358E83]" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Billing & Payment
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Streamlined financial processes, automated billing, payment processing, and comprehensive financial reporting tools.
              </p>
              <Button 
                onClick={() => onNavigateToLogin('billing')}
                className="w-full bg-[#358E83] hover:bg-[#358E83]/90 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Access Billing
              </Button>
            </div>
          </div>
        </div>



        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Hospital Information Management System. All rights reserved.
          </p>
          <div className="flex items-center justify-center space-x-6 mt-4">
            <a href="#" className="text-gray-500 hover:text-[#358E83] text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-[#358E83] text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-500 hover:text-[#358E83] text-sm transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}