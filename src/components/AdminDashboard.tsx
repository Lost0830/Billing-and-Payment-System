import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Users,
  Shield,
  ArrowRight,
  UserCog,
  Lock,
  Tag,
  Percent,
} from "lucide-react";

interface AdminDashboardProps {
  onNavigateToModule: (moduleId: string) => void;
}

export function AdminDashboard({ onNavigateToModule }: AdminDashboardProps) {
  return (
    <div>
      {/* Admin Management Section */}
      <section className="mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Management Card */}
          <Card className="overflow-hidden">
            <div className="flex">
              <div className="flex-1 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Patient Management
                </h3>
                <p className="text-gray-600 mb-6">
                  Create and manage patient records that will be accessible to cashiers for billing and invoicing.
                </p>
                <Button 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => onNavigateToModule("patients-management")}
                >
                  Manage Patients
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="w-32 bg-orange-100 flex items-center justify-center">
                <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center relative">
                  <Users className="h-8 w-8 text-[#358E83]" />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <UserCog className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* User Management Card */}
          <Card className="overflow-hidden">
            <div className="flex">
              <div className="flex-1 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  User Accounts
                </h3>
                <p className="text-gray-600 mb-6">
                  Create, edit, and manage user accounts for all hospital systems. Control access permissions and roles.
                </p>
                <Button 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => onNavigateToModule("user-management")}
                >
                  Manage Users
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="w-32 bg-orange-100 flex items-center justify-center">
                <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center relative">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-[#358E83] rounded-full flex items-center justify-center">
                    <UserCog className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Discount Management Card */}
          <Card className="overflow-hidden">
            <div className="flex">
              <div className="flex-1 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Discount Management
                </h3>
                <p className="text-gray-600 mb-6">
                  Create and manage discount codes, promotions, and special pricing for billing operations.
                </p>
                <Button 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => onNavigateToModule("discount-management")}
                >
                  Manage Discounts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="w-32 bg-orange-100 flex items-center justify-center">
                <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center relative">
                  <Tag className="h-8 w-8 text-[#E94D61]" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Percent className="h-2 w-2 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Security & Permissions Card */}
          <Card className="overflow-hidden">
            <div className="flex">
              <div className="flex-1 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Security & Permissions
                </h3>
                <p className="text-gray-600 mb-6">
                  Configure role-based access control, manage permissions, and ensure system security.
                </p>
                <Button 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => onNavigateToModule("user-management")}
                >
                  Security Settings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="w-32 bg-orange-100 flex items-center justify-center">
                <div className="w-16 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center relative">
                  <Shield className="h-8 w-8 text-purple-500" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Lock className="h-2 w-2 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Quick Stats */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">156</div>
              <p className="text-xs text-gray-500 mt-1">Across all systems</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">42</div>
              <p className="text-xs text-gray-500 mt-1">Currently online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">100%</div>
              <p className="text-xs text-gray-500 mt-1">All systems operational</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
