import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Database,
  Pill,
  Settings,
  Wifi,
  WifiOff
} from "lucide-react";
import { integrationManager, IntegrationEventData } from "../services/integrationManager";
import { IntegrationStatus } from "../services/integrationConfig";

interface IntegrationStatusProps {
  onNavigateToView?: (view: string) => void;
}

export function IntegrationStatus({ onNavigateToView }: IntegrationStatusProps) {
  const [status, setStatus] = useState<IntegrationStatus>({
    emr: {
      connected: false,
      lastSync: null,
      lastError: null,
      totalSynced: 0
    },
    pharmacy: {
      connected: false,
      lastSync: null,
      lastError: null,
      totalSynced: 0
    }
  });
  const [isSyncing, setIsSyncing] = useState({ emr: false, pharmacy: false });
  const [events, setEvents] = useState<IntegrationEventData[]>([]);

  useEffect(() => {
    // Initial status load
    updateStatus();

    // Set up event listeners
    const handleEvent = (eventData: IntegrationEventData) => {
      setEvents(prev => [eventData, ...prev.slice(0, 9)]); // Keep last 10 events
      
      switch (eventData.event) {
        case 'emr_sync_started':
          setIsSyncing(prev => ({ ...prev, emr: true }));
          break;
        case 'emr_sync_completed':
        case 'emr_sync_failed':
          setIsSyncing(prev => ({ ...prev, emr: false }));
          updateStatus();
          break;
        case 'pharmacy_sync_started':
          setIsSyncing(prev => ({ ...prev, pharmacy: true }));
          break;
        case 'pharmacy_sync_completed':
        case 'pharmacy_sync_failed':
          setIsSyncing(prev => ({ ...prev, pharmacy: false }));
          updateStatus();
          break;
      }
    };

    integrationManager.addEventListener('emr_sync_started', handleEvent);
    integrationManager.addEventListener('emr_sync_completed', handleEvent);
    integrationManager.addEventListener('emr_sync_failed', handleEvent);
    integrationManager.addEventListener('pharmacy_sync_started', handleEvent);
    integrationManager.addEventListener('pharmacy_sync_completed', handleEvent);
    integrationManager.addEventListener('pharmacy_sync_failed', handleEvent);

    return () => {
      integrationManager.removeEventListener('emr_sync_started', handleEvent);
      integrationManager.removeEventListener('emr_sync_completed', handleEvent);
      integrationManager.removeEventListener('emr_sync_failed', handleEvent);
      integrationManager.removeEventListener('pharmacy_sync_started', handleEvent);
      integrationManager.removeEventListener('pharmacy_sync_completed', handleEvent);
      integrationManager.removeEventListener('pharmacy_sync_failed', handleEvent);
    };
  }, []);

  const updateStatus = () => {
    const currentStatus = integrationManager.getIntegrationStatus();
    setStatus(currentStatus);
  };

  const handleManualSync = async (system: 'emr' | 'pharmacy') => {
    try {
      if (system === 'emr') {
        await integrationManager.syncEMRData();
      } else {
        await integrationManager.syncPharmacyData();
      }
    } catch (error) {
      console.error(`Manual sync failed for ${system}:`, error);
    }
  };

  const formatLastSync = (lastSync: Date | null) => {
    if (!lastSync) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusIcon = (connected: boolean, hasError: boolean) => {
    if (!connected || hasError) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (connected: boolean, hasError: boolean) => {
    if (!connected) {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
    if (hasError) {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
  };

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'emr_sync_started':
      case 'pharmacy_sync_started':
        return <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'emr_sync_completed':
      case 'pharmacy_sync_completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'emr_sync_failed':
      case 'pharmacy_sync_failed':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EMR Integration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">EMR Integration</CardTitle>
              </div>
              {getStatusIcon(status.emr.connected, !!status.emr.lastError)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              {getStatusBadge(status.emr.connected, !!status.emr.lastError)}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Sync</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-sm">{formatLastSync(status.emr.lastSync)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Records Synced</span>
              <span className="text-sm font-medium">{status.emr.totalSynced}</span>
            </div>

            {status.emr.lastError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-600">{status.emr.lastError}</p>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleManualSync('emr')}
              disabled={isSyncing.emr}
              className="w-full"
            >
              {isSyncing.emr ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Manual Sync
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Pharmacy Integration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Pill className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Pharmacy Integration</CardTitle>
              </div>
              {getStatusIcon(status.pharmacy.connected, !!status.pharmacy.lastError)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              {getStatusBadge(status.pharmacy.connected, !!status.pharmacy.lastError)}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Sync</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-sm">{formatLastSync(status.pharmacy.lastSync)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Transactions Synced</span>
              <span className="text-sm font-medium">{status.pharmacy.totalSynced}</span>
            </div>

            {status.pharmacy.lastError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-600">{status.pharmacy.lastError}</p>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleManualSync('pharmacy')}
              disabled={isSyncing.pharmacy}
              className="w-full"
            >
              {isSyncing.pharmacy ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Manual Sync
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Integration Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              events.map((event, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50">
                  {getEventIcon(event.event)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {event.event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-gray-500">
                      {event.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {event.error && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integration Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => onNavigateToView?.('settings')}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Configure APIs</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onNavigateToView?.('history')}
              className="flex items-center space-x-2"
            >
              <Database className="h-4 w-4" />
              <span>View History</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={updateStatus}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Status</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status Indicator */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {integrationManager.isConnected() ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Integration Services Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-500" />
                  <span className="font-medium">Integration Services Offline</span>
                </>
              )}
            </div>
            <Badge variant={integrationManager.isConnected() ? "default" : "destructive"}>
              {integrationManager.isConnected() ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {integrationManager.isConnected() 
              ? "External systems are connected and syncing automatically."
              : "Check API configurations and network connectivity."
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}