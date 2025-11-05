import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Settings, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Database,
  Pill,
  Package
} from "lucide-react";
import { integrationManager } from "../services/integrationManager";
import { toast } from "sonner";

interface PharmacyProps {
  onNavigateToView: (view: string) => void;
}

export function Pharmacy({ onNavigateToView }: PharmacyProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setIsLoading(true);
    try {
      const status = await integrationManager.getPharmacyConnectionStatus();
      setIsConnected(status.isConnected);
    } catch (error) {
      console.error('Failed to check pharmacy connection:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await integrationManager.syncPharmacyData();
      toast.success("Pharmacy data synchronized successfully");
      checkConnectionStatus();
    } catch (error) {
      toast.error("Failed to sync pharmacy data");
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-[#358E83] rounded-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold text-white">Pharmacy Integration</h1>
            <p className="text-white/90 mt-2">
              Connect and manage external pharmacy systems for seamless medication management and billing integration.
            </p>
          </div>
          <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-300" />
                <span className="text-sm text-green-300">Connected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-300" />
                <span className="text-sm text-yellow-300">Disconnected</span>
              </>
            )}
          </div>
          <Button 
            onClick={handleSync}
            disabled={isLoading || !isConnected}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Data
          </Button>
          </div>
        </div>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Integration Status</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isConnected ? "Active" : "Inactive"}
                </p>
              </div>
              <Database className={`h-8 w-8 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Connected Systems</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isConnected ? "1" : "0"}
                </p>
              </div>
              <ExternalLink className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Sync</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isConnected ? "2 min ago" : "Never"}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-[#358E83]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Pill className="h-5 w-5 text-[#358E83]" />
            <span>External Pharmacy System Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Pharmacy System Integration
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              This module connects to external pharmacy management systems to synchronize 
              medication data, inventory levels, and prescription transactions with your billing system.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium mb-2">Data Integration</h4>
                <p className="text-sm text-gray-600">
                  Automatically sync medication inventory, pricing, and availability from external pharmacy systems.
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium mb-2">Billing Integration</h4>
                <p className="text-sm text-gray-600">
                  Seamlessly integrate pharmacy transactions with the hospital billing system for unified invoicing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => onNavigateToView("settings")}
              className="bg-[#E94D61] hover:bg-[#d73c50]"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Integration
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => onNavigateToView("billing")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Billing System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">For Billing Operations</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#358E83] rounded-full mt-2"></div>
                  <span>Automated medication billing with real-time pricing</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#358E83] rounded-full mt-2"></div>
                  <span>Unified patient invoices including pharmacy charges</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#358E83] rounded-full mt-2"></div>
                  <span>Reduced manual data entry and billing errors</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">For Patient Care</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#358E83] rounded-full mt-2"></div>
                  <span>Real-time medication availability checking</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#358E83] rounded-full mt-2"></div>
                  <span>Seamless prescription-to-billing workflow</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#358E83] rounded-full mt-2"></div>
                  <span>Improved patient discharge and billing efficiency</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}