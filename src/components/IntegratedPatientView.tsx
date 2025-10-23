import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import {
  User,
  Calendar,
  Stethoscope,
  Pill,
  FileText,
  CreditCard,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { integrationManager } from "../services/integrationManager";
import { EMRPatient, EMRAppointment, EMRTreatment } from "../services/emrIntegration";
import { PharmacyTransaction } from "../services/pharmacyIntegration";

interface IntegratedPatientViewProps {
  patientId: string;
  onNavigateToView?: (view: string) => void;
}

export function IntegratedPatientView({ patientId, onNavigateToView }: IntegratedPatientViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    patient: EMRPatient | null;
    appointments: EMRAppointment[];
    treatments: EMRTreatment[];
    pharmacyTransactions: PharmacyTransaction[];
  }>({
    patient: null,
    appointments: [],
    treatments: [],
    pharmacyTransactions: []
  });

  const [unbilledItems, setUnbilledItems] = useState<{
    treatments: EMRTreatment[];
    pharmacyTransactions: PharmacyTransaction[];
  }>({
    treatments: [],
    pharmacyTransactions: []
  });

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [patientData, unbilled] = await Promise.all([
        integrationManager.getPatientData(patientId),
        integrationManager.getUnbilledItems(patientId)
      ]);

      setData(patientData);
      setUnbilledItems(unbilled);
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegratedInvoice = async () => {
    try {
      const result = await integrationManager.createIntegratedInvoice(patientId, true);
      if (result.success) {
        console.log('Integrated invoice created:', result.invoiceData);
        // Navigate to invoice generation with pre-filled data
        onNavigateToView?.('invoice');
      }
    } catch (error) {
      console.error('Failed to create integrated invoice:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading patient data...</span>
      </div>
    );
  }

  if (!data.patient) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="font-medium mb-2">Patient Not Found</h3>
          <p className="text-gray-600">Unable to load patient data from EMR system.</p>
        </CardContent>
      </Card>
    );
  }

  const totalUnbilledAmount = 
    unbilledItems.treatments.reduce((sum, t) => sum + t.totalCost, 0) +
    unbilledItems.pharmacyTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {data.patient.firstName} {data.patient.lastName}
                </CardTitle>
                <p className="text-gray-600">Patient ID: {data.patient.patientId}</p>
              </div>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              {data.patient.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Date of Birth</p>
              <p className="font-medium">{formatDate(data.patient.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="font-medium">{data.patient.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact</p>
              <p className="font-medium">{data.patient.contactNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Visit</p>
              <p className="font-medium">{formatDate(data.patient.lastVisit)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unbilled Items Alert */}
      {totalUnbilledAmount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">
                    Unbilled Items: {formatCurrency(totalUnbilledAmount)}
                  </p>
                  <p className="text-sm text-orange-700">
                    {unbilledItems.treatments.length} treatments, {unbilledItems.pharmacyTransactions.length} pharmacy transactions
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCreateIntegratedInvoice}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrated Data Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total Appointments</p>
                    <p className="text-xl font-semibold">{data.appointments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Stethoscope className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Treatments</p>
                    <p className="text-xl font-semibold">{data.treatments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Pill className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Pharmacy Orders</p>
                    <p className="text-xl font-semibold">{data.pharmacyTransactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.treatments.slice(0, 3).map((treatment, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-md bg-gray-50">
                    <Stethoscope className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{treatment.diagnosis}</p>
                      <p className="text-xs text-gray-600">{formatDate(treatment.treatmentDate)}</p>
                    </div>
                    <Badge variant="outline">{formatCurrency(treatment.totalCost)}</Badge>
                  </div>
                ))}

                {data.pharmacyTransactions.slice(0, 2).map((transaction, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-md bg-gray-50">
                    <Pill className="h-4 w-4 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{transaction.pharmacyName}</p>
                      <p className="text-xs text-gray-600">{formatDate(transaction.transactionDate)}</p>
                    </div>
                    <Badge variant="outline">{formatCurrency(transaction.totalAmount)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <div className="space-y-3">
            {data.appointments.map((appointment, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{appointment.doctorName}</p>
                        <p className="text-sm text-gray-600">{appointment.department}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(appointment.appointmentDate)} at {appointment.appointmentTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={appointment.status === 'Completed' ? 'default' : 'secondary'}>
                        {appointment.status}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">{formatCurrency(appointment.cost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="treatments" className="space-y-4">
          <div className="space-y-3">
            {data.treatments.map((treatment, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{treatment.diagnosis}</p>
                        <p className="text-sm text-gray-600">{formatDate(treatment.treatmentDate)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {treatment.billable && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        <Badge variant="outline">{formatCurrency(treatment.totalCost)}</Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Medications:</p>
                      {treatment.medications.map((med, medIndex) => (
                        <div key={medIndex} className="text-sm text-gray-600">
                          • {med.name} - {med.dosage} ({med.frequency}) - {formatCurrency(med.cost)}
                        </div>
                      ))}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Procedures:</p>
                      {treatment.procedures.map((proc, procIndex) => (
                        <div key={procIndex} className="text-sm text-gray-600">
                          • {proc.name} ({proc.code}) - {formatCurrency(proc.cost)}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pharmacy" className="space-y-4">
          <div className="space-y-3">
            {data.pharmacyTransactions.map((transaction, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{transaction.pharmacyName}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(transaction.transactionDate)} at {transaction.transactionTime}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={transaction.syncStatus === 'Synced' ? 'default' : 'secondary'}>
                          {transaction.syncStatus === 'Synced' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {transaction.syncStatus}
                        </Badge>
                        <Badge variant="outline">{formatCurrency(transaction.totalAmount)}</Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Items:</p>
                      {transaction.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="text-sm text-gray-600 flex justify-between">
                          <span>• {item.medicationName} ({item.strength}) x{item.quantity}</span>
                          <span>{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Payment Method:</span>
                      <span className="font-medium">{transaction.paymentMethod}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}