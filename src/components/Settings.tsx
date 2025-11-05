import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import {
  Settings as SettingsIcon,
  Database,
  Pill,
  Shield,
  Users,
  Bell,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  RefreshCw
} from "lucide-react";
import { IntegrationStatus } from "./IntegrationStatus";
import { configManager } from "../services/configManager";
import { toast } from "sonner";

interface SettingsProps {
  onNavigateToView?: (view: string) => void;
}

export function Settings({ onNavigateToView }: SettingsProps) {
  const [emrConfig, setEmrConfig] = useState({
    baseUrl: "",
    apiKey: "",
    syncInterval: 15,
    enabled: true
  });

  const [pharmacyConfig, setPharmacyConfig] = useState({
    baseUrl: "", 
    apiKey: "",
    syncInterval: 5,
    enabled: true
  });

  const [systemSettings, setSystemSettings] = useState({
    currency: "PHP",
    timezone: "Asia/Manila",
    dateFormat: "MM/DD/YYYY",
    notifications: true,
    autoSync: true,
    backupEnabled: true
  });

  const [testResults, setTestResults] = useState({
    emr: null as boolean | null,
    pharmacy: null as boolean | null
  });

  const [isTesting, setIsTesting] = useState({
    emr: false,
    pharmacy: false
  });

  // Load configuration on component mount
  useEffect(() => {
    const config = configManager.getConfig();
    
    setEmrConfig({
      baseUrl: config.emr.baseUrl,
      apiKey: config.emr.apiKey,
      syncInterval: config.emr.syncInterval,
      enabled: true // This would come from integration status
    });

    setPharmacyConfig({
      baseUrl: config.pharmacy.baseUrl,
      apiKey: config.pharmacy.apiKey,
      syncInterval: config.pharmacy.syncInterval,
      enabled: true // This would come from integration status
    });

    setSystemSettings({
      currency: config.billing.currency,
      timezone: "Asia/Manila",
      dateFormat: "MM/DD/YYYY",
      notifications: true,
      autoSync: true,
      backupEnabled: true
    });
  }, []);

  const handleTestConnection = async (system: 'emr' | 'pharmacy') => {
    setTestResults(prev => ({ ...prev, [system]: null }));
    setIsTesting(prev => ({ ...prev, [system]: true }));
    
    try {
      // Save current config before testing
      if (system === 'emr') {
        configManager.updateEMRConfig({
          baseUrl: emrConfig.baseUrl,
          apiKey: emrConfig.apiKey,
          syncInterval: emrConfig.syncInterval
        });
      } else {
        configManager.updatePharmacyConfig({
          baseUrl: pharmacyConfig.baseUrl,
          apiKey: pharmacyConfig.apiKey,
          syncInterval: pharmacyConfig.syncInterval
        });
      }

      const results = await configManager.testConfiguration();
      const result = results[system];
      
      setTestResults(prev => ({ ...prev, [system]: result.success }));
      
      if (result.success) {
        toast.success(`${system.toUpperCase()} connection successful`);
      } else {
        toast.error(`${system.toUpperCase()} connection failed: ${result.error}`);
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [system]: false }));
      toast.error(`Failed to test ${system.toUpperCase()} connection`);
    } finally {
      setIsTesting(prev => ({ ...prev, [system]: false }));
    }
  };

  const handleSaveSettings = () => {
    try {
      // Update EMR configuration
      configManager.updateEMRConfig({
        baseUrl: emrConfig.baseUrl,
        apiKey: emrConfig.apiKey,
        syncInterval: emrConfig.syncInterval
      });

      // Update Pharmacy configuration
      configManager.updatePharmacyConfig({
        baseUrl: pharmacyConfig.baseUrl,
        apiKey: pharmacyConfig.apiKey,
        syncInterval: pharmacyConfig.syncInterval
      });

      // Update Billing configuration
      configManager.updateBillingConfig({
        currency: systemSettings.currency
      });

      // Validate configuration
      const validation = configManager.validateConfig();
      
      if (validation.valid) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(`Configuration errors: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleExportConfig = () => {
    try {
      const configJson = configManager.exportConfig();
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hims-integration-config.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully');
    } catch (error) {
      toast.error('Failed to export configuration');
    }
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = configManager.importConfig(content);
        
        if (result.success) {
          // Reload configuration
          const config = configManager.getConfig();
          setEmrConfig({
            baseUrl: config.emr.baseUrl,
            apiKey: config.emr.apiKey,
            syncInterval: config.emr.syncInterval,
            enabled: emrConfig.enabled
          });
          setPharmacyConfig({
            baseUrl: config.pharmacy.baseUrl,
            apiKey: config.pharmacy.apiKey,
            syncInterval: config.pharmacy.syncInterval,
            enabled: pharmacyConfig.enabled
          });
          toast.success('Configuration imported successfully');
        } else {
          toast.error(`Import failed: ${result.error}`);
        }
      } catch (error) {
        toast.error('Failed to import configuration');
      }
    };
    reader.readAsText(file);
  };

  const handleResetConfig = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      configManager.resetToDefaults();
      const config = configManager.getConfig();
      
      setEmrConfig({
        baseUrl: config.emr.baseUrl,
        apiKey: config.emr.apiKey,
        syncInterval: config.emr.syncInterval,
        enabled: true
      });
      
      setPharmacyConfig({
        baseUrl: config.pharmacy.baseUrl,
        apiKey: config.pharmacy.apiKey,
        syncInterval: config.pharmacy.syncInterval,
        enabled: true
      });
      
      toast.success('Configuration reset to defaults');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="integration" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="integration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* EMR Integration Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <CardTitle>EMR Integration</CardTitle>
                  <Badge variant={emrConfig.enabled ? "default" : "secondary"}>
                    {emrConfig.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emr-enabled">Enable EMR Integration</Label>
                  <Switch
                    id="emr-enabled"
                    checked={emrConfig.enabled}
                    onCheckedChange={(checked) => 
                      setEmrConfig(prev => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emr-url">EMR API Base URL</Label>
                  <Input
                    id="emr-url"
                    value={emrConfig.baseUrl}
                    onChange={(e) => 
                      setEmrConfig(prev => ({ ...prev, baseUrl: e.target.value }))
                    }
                    disabled={!emrConfig.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emr-key">API Key</Label>
                  <Input
                    id="emr-key"
                    type="password"
                    value={emrConfig.apiKey}
                    onChange={(e) => 
                      setEmrConfig(prev => ({ ...prev, apiKey: e.target.value }))
                    }
                    disabled={!emrConfig.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emr-interval">Sync Interval (minutes)</Label>
                  <Input
                    id="emr-interval"
                    type="number"
                    value={emrConfig.syncInterval}
                    onChange={(e) => 
                      setEmrConfig(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))
                    }
                    disabled={!emrConfig.enabled}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection('emr')}
                    disabled={!emrConfig.enabled || isTesting.emr}
                    className="flex-1"
                  >
                    {isTesting.emr ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    {isTesting.emr ? 'Testing...' : 'Test Connection'}
                  </Button>
                  
                  {testResults.emr !== null && !isTesting.emr && (
                    <div className="flex items-center">
                      {testResults.emr ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pharmacy Integration Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Pill className="h-5 w-5 text-green-600" />
                  <CardTitle>Pharmacy Integration</CardTitle>
                  <Badge variant={pharmacyConfig.enabled ? "default" : "secondary"}>
                    {pharmacyConfig.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pharmacy-enabled">Enable Pharmacy Integration</Label>
                  <Switch
                    id="pharmacy-enabled"
                    checked={pharmacyConfig.enabled}
                    onCheckedChange={(checked) => 
                      setPharmacyConfig(prev => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pharmacy-url">Pharmacy API Base URL</Label>
                  <Input
                    id="pharmacy-url"
                    value={pharmacyConfig.baseUrl}
                    onChange={(e) => 
                      setPharmacyConfig(prev => ({ ...prev, baseUrl: e.target.value }))
                    }
                    disabled={!pharmacyConfig.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pharmacy-key">API Key</Label>
                  <Input
                    id="pharmacy-key"
                    type="password"
                    value={pharmacyConfig.apiKey}
                    onChange={(e) => 
                      setPharmacyConfig(prev => ({ ...prev, apiKey: e.target.value }))
                    }
                    disabled={!pharmacyConfig.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pharmacy-interval">Sync Interval (minutes)</Label>
                  <Input
                    id="pharmacy-interval"
                    type="number"
                    value={pharmacyConfig.syncInterval}
                    onChange={(e) => 
                      setPharmacyConfig(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))
                    }
                    disabled={!pharmacyConfig.enabled}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection('pharmacy')}
                    disabled={!pharmacyConfig.enabled || isTesting.pharmacy}
                    className="flex-1"
                  >
                    {isTesting.pharmacy ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    {isTesting.pharmacy ? 'Testing...' : 'Test Connection'}
                  </Button>
                  
                  {testResults.pharmacy !== null && !isTesting.pharmacy && (
                    <div className="flex items-center">
                      {testResults.pharmacy ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <CardTitle>System Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={systemSettings.currency}
                    onChange={(e) => 
                      setSystemSettings(prev => ({ ...prev, currency: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={systemSettings.timezone}
                    onChange={(e) => 
                      setSystemSettings(prev => ({ ...prev, timezone: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Input
                    id="date-format"
                    value={systemSettings.dateFormat}
                    onChange={(e) => 
                      setSystemSettings(prev => ({ ...prev, dateFormat: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Preferences</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications">Enable Notifications</Label>
                    <p className="text-sm text-gray-600">Receive system notifications and alerts</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={systemSettings.notifications}
                    onCheckedChange={(checked) => 
                      setSystemSettings(prev => ({ ...prev, notifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-sync">Auto Synchronization</Label>
                    <p className="text-sm text-gray-600">Automatically sync with external systems</p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={systemSettings.autoSync}
                    onCheckedChange={(checked) => 
                      setSystemSettings(prev => ({ ...prev, autoSync: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="backup">Automatic Backups</Label>
                    <p className="text-sm text-gray-600">Enable automatic data backups</p>
                  </div>
                  <Switch
                    id="backup"
                    checked={systemSettings.backupEnabled}
                    onCheckedChange={(checked) => 
                      setSystemSettings(prev => ({ ...prev, backupEnabled: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Security Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h4 className="font-medium text-yellow-800">Security Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    API keys and sensitive configuration should be stored securely and rotated regularly.
                    Never share API keys or store them in plain text.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Best Practices</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use environment variables for API keys in production</li>
                    <li>• Enable HTTPS for all API communications</li>
                    <li>• Regularly audit access logs and permissions</li>
                    <li>• Implement proper authentication and authorization</li>
                    <li>• Keep API credentials separate from application code</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-md">
                    <h5 className="font-medium text-sm">EMR Security</h5>
                    <p className="text-xs text-gray-600 mt-1">
                      Patient data integration requires HIPAA compliance and secure transmission.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-md">
                    <h5 className="font-medium text-sm">Pharmacy Security</h5>
                    <p className="text-xs text-gray-600 mt-1">
                      Medication data must be encrypted and transmitted over secure channels.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <IntegrationStatus onNavigateToView={onNavigateToView} />
        </TabsContent>
      </Tabs>

      {/* Configuration Management */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={handleExportConfig}>
              <Download className="h-4 w-4 mr-2" />
              Export Config
            </Button>
            
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                className="hidden"
                id="import-config"
              />
              <Button variant="outline" onClick={() => document.getElementById('import-config')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import Config
              </Button>
            </div>
            
            <Button variant="outline" onClick={handleResetConfig}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={() => onNavigateToView?.('dashboard')}>
          Cancel
        </Button>
        <Button onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}