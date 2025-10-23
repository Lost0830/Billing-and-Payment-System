import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { toast } from "sonner";

interface LoginPageProps {
  system: string;
  onLogin: (credentials: { email: string; password: string; system: string; user: any }) => void;
  onBack: () => void;
}

export function LoginPage({ system, onLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const baseUrl = "http://localhost:5000/api";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("✅ Login successful");
        onLogin({ email, password, system, user: data.user });
      } else {
        toast.error(data.message || "Invalid email or password");
      }
    } catch (err) {
      toast.error("Server connection failed");
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getSystemInfo = () => {
    switch (system) {
      case "billing":
        return {
          title: "Billing & Payment System",
          subtitle: "Access your financial management dashboard",
          welcomeTitle: "Welcome to Billing HIMS",
          welcomeDescription:
            "Streamline your hospital's financial operations with our comprehensive billing and payment management platform. Handle invoices, process payments, and manage financial workflows efficiently.",
          department: "Billing & Finance Department",
        };
      case "pharmacy":
        return {
          title: "Pharmacy Management System",
          subtitle: "Access your pharmaceutical operations dashboard",
          welcomeTitle: "Welcome to Pharmacy HIMS",
          welcomeDescription:
            "Manage your pharmacy operations with precision and care. Our comprehensive platform handles inventory, prescriptions, dispensing, and pharmaceutical workflows seamlessly.",
          department: "Pharmacy Department",
        };
      case "emr":
        return {
          title: "Electronic Medical Records",
          subtitle: "Access secure patient information system",
          welcomeTitle: "Welcome to EMR HIMS",
          welcomeDescription:
            "Access and manage patient health information securely and efficiently. Our EMR system ensures comprehensive medical record keeping with the highest standards of data protection.",
          department: "Medical Records Department",
        };
      default:
        return {
          title: "HIMS Login",
          subtitle: "Access your hospital management system",
          welcomeTitle: "Welcome to HIMS",
          welcomeDescription: "Your comprehensive healthcare management platform.",
          department: "Hospital Information Management",
        };
    }
  };

  const systemInfo = getSystemInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex min-h-[600px]">
          {/* Left Panel */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#358E83] to-[#2d7a70] text-white p-12 flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full"></div>
              <div className="absolute bottom-20 right-10 w-24 h-24 border-2 border-white rounded-full"></div>
              <div className="absolute top-1/2 right-20 w-16 h-16 border-2 border-white rounded-full"></div>
            </div>

            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-6 leading-tight">{systemInfo.welcomeTitle}</h1>
              <p className="text-xl opacity-90 leading-relaxed mb-8">{systemInfo.welcomeDescription}</p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span className="text-white/90">Secure Authentication</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span className="text-white/90">Email-Based Role Detection</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span className="text-white/90">Enterprise Security</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto">
              <div className="mb-8">
                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="mb-6 p-0 h-auto text-[#358E83] hover:text-[#358E83]/80 font-medium"
                >
                  <ArrowLeft className="mr-2" size={20} />
                  Back to System Selection
                </Button>

                <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
                <p className="text-gray-600">{systemInfo.subtitle}</p>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800 font-medium">{systemInfo.department}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="your.email@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-sm text-gray-500">Your role will be automatically detected from your email</p>
                </div>

                <div>
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!email || !password || isLoggingIn}
                  className="w-full bg-[#358E83] hover:bg-[#2b6f68] text-white font-semibold py-3 rounded-xl"
                >
                  {isLoggingIn ? "Signing In..." : `Sign In to ${systemInfo.title}`}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Dialog */}
      <Dialog open={isLoggingIn} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Signing In</DialogTitle>
            <DialogDescription className="sr-only">
              Please wait while we authenticate your credentials
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 border-4 border-[#358E83] border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Signing In</h3>
            <p className="text-sm text-gray-600 text-center">Please wait while we authenticate your credentials...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
