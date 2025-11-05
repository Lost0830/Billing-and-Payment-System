import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  X,
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Stethoscope,
  Pill,
  Receipt,
  UserPlus,
  FileText,
  Activity
} from "lucide-react";
// import shared helpers and local service (use .js so Vite resolves the JS module)
import { fetchPatients } from "../services/api.js";
import { MockEmrService } from "../services/mockEmrData";
import { PriceListService } from "../services/priceListService";
import * as patientService from "../services/patientService.js";
import { getDisplayPatientId, getInternalPatientKey, normalizePatients } from "../utils/patientId";
import { toast } from "sonner";
// normalize import shape (works whether patientService exports default or named)
const ps: any = (patientService as any)?.default || (patientService as any) || {};

// Use Vite-style env in the browser; fallback to localhost
const API_URL = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000/api";

interface PatientsManagementProps {
  onNavigateToView?: (view: string) => void;
  userSession?: {
    email: string;
    name: string;
    role: string;
    system: string;
  };
}

export function PatientsManagement({ onNavigateToView, userSession }: PatientsManagementProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [showAddPatientDialog, setShowAddPatientDialog] = useState(false);
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false);
  const [showAddMedicineDialog, setShowAddMedicineDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  // Helpers moved to src/utils/patientId.ts

  // Form states
  const [patientForm, setPatientForm] = useState({
    name: "",
    dateOfBirth: "",
    sex: "",
    contactNumber: "",
    address: "",
    email: "",
    bloodType: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: ""
  });

  const [serviceForm, setServiceForm] = useState({
    description: "",
    category: "",
    price: "",
    attendingPhysician: "",
    date: new Date().toISOString().split('T')[0]
  });

  const [medicineForm, setMedicineForm] = useState({
    description: "",
    quantity: "",
    unitPrice: "",
    prescribedBy: "",
    date: new Date().toISOString().split('T')[0]
  });

  // Fetch patients from backend via shared API helper
  const fetchPatientsFromDb = async () => {
    try {
      const data = await fetchPatients();
  // normalize to prefer human-friendly patientId for display
  const normalized = normalizePatients(data || []);
      setPatients(normalized);
    } catch (err) {
      console.error("fetchPatientsFromDb error:", err);
      setPatients([]);
      toast.error("Failed to load patients");
    }
  };

  useEffect(() => {
    fetchPatientsFromDb();
  }, []);

  // Helper to robustly resolve EMR/mock data for a patient using multiple possible keys
  const getEmrDataForPatient = (patient: any) => {
    if (!patient) return null;
    const candidates = [
      getInternalPatientKey(patient),
      patient.patientId,
      patient.id,
      patient._id,
      getDisplayPatientId(patient)
    ];
    for (const k of candidates) {
      if (!k) continue;
      const data = MockEmrService.getPatientEmrData(String(k));
      if (data) return data;
    }
    return null;
  };
  const handleViewPatient = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientDialog(true);
  };
 
  // Create or update patient
  const handleAddPatient = async () => {
     if (!patientForm.name || !patientForm.dateOfBirth || !patientForm.sex) {
       toast.error("Please fill in all required fields");
       return;
     }

     const newPatient = {
       name: patientForm.name,
       dateOfBirth: patientForm.dateOfBirth,
       sex: patientForm.sex,
       contactNumber: patientForm.contactNumber,
       address: patientForm.address,
       email: patientForm.email,
       bloodType: patientForm.bloodType,
       emergencyContact: {
         name: patientForm.emergencyContactName,
         relationship: patientForm.emergencyContactRelationship,
         phone: patientForm.emergencyContactPhone
       },
       createdBy: userSession?.name || 'Unknown',
       createdByRole: userSession?.role || 'unknown',
       createdAt: new Date().toISOString()
     };

     try {
      if (editingPatientId) {
        // update
        await updatePatient(editingPatientId, newPatient);
        toast.success("Patient updated");
      } else {
        // create
        await createPatient(newPatient);
        toast.success("Patient added successfully!");
      }
      setEditingPatientId(null);
      await fetchPatientsFromDb();
      setShowAddPatientDialog(false);
      resetPatientForm();
     } catch (err) {
       console.error("Add patient failed:", err);
       toast.error("Failed to add patient");
     }
   };

  // Create -> POST /api/patients (improved error logging for non-JSON responses)
  const createPatient = async (payload: any): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      let body: any;

      if (contentType.includes("application/json")) {
        body = await res.json();
      } else {
        const text = await res.text();
        console.error("createPatient non-JSON response:", res.status, text);
        throw new Error(`Server returned non-JSON response (status ${res.status}). See console.`);
      }

      console.log("createPatient response:", res.status, body);
      if (!res.ok || !body.success) {
        throw new Error(body?.message || `Create failed: ${res.status}`);
      }

  const created = { ...(body.data || {}), id: (body.data?.patientId || body.data?.id || body.data?._id || "") };
      setPatients((prev: any[]) => [created, ...prev]);

      // sync patientService if exists
      if (typeof (patientService as any).setPatients === "function") {
        (patientService as any).setPatients([created, ...(patientService as any).getAllPatients?.() || []]);
      }

      // Notify other parts of the app (e.g., cashier/invoice) that patients list changed
      try {
        window.dispatchEvent(new CustomEvent('patients-updated', { detail: { action: 'create', patient: created } }));
      } catch (e) {
        console.warn('Could not dispatch patients-updated event', e);
      }

      return created;
    } catch (e) {
      console.error("createPatient error", e);
      throw e;
    }
  };

  // Update -> PUT /api/patients/:id
  const updatePatient = async (id: string, payload: any): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      console.log("updatePatient response:", res.status, body);
      if (!res.ok || !body.success) throw new Error(body?.message || "Update failed");
  const updated = { ...(body.data || {}), id: (body.data?.patientId || body.data?.id || body.data?._id || id) };
      setPatients((prev: any[]) => prev.map(p => (p.id === id || p._id === id ? updated : p)));
      if (typeof (patientService as any).setPatients === "function") {
        (patientService as any).setPatients((patientService as any).getAllPatients?.() || []);
      }
      // Notify listeners about patient update
      try {
        window.dispatchEvent(new CustomEvent('patients-updated', { detail: { action: 'update', patient: updated } }));
      } catch (e) {
        console.warn('Could not dispatch patients-updated event', e);
      }
      return updated;
    } catch (e) {
      console.error("updatePatient error", e);
      throw e;
    }
  };

  // Delete -> DELETE /api/patients/:id (keep as-is but ensure it updates state)
  // Archive (soft-delete) flow: open dialog and call archive endpoint
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

  const confirmArchivePatient = (id: string) => {
    setArchiveTarget(id);
    setArchiveDialogOpen(true);
  };

  const performArchive = async (id: string | null) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/patients/${id}/archive`, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivedBy: userSession?.name || 'system' }) });
      const text = await res.text();
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      let body: any = {};
      if (contentType.includes('application/json') && text) {
        try { body = JSON.parse(text); } catch (e) { /* ignore */ }
      }
      if (!res.ok) throw new Error(body?.message || text || `Server returned ${res.status}`);

      // remove from local state
      setPatients(prev => prev.filter(p => p.id !== id && p._id !== id && p.patientId !== id));
      toast.success(body?.message || 'Patient moved to archive');
      try { window.dispatchEvent(new CustomEvent('patients-updated', { detail: { action: 'archive', id } })); } catch (e) { /* ignore */ }
    } catch (err: any) {
      console.error('performArchive error', err);
      toast.error(err?.message || 'Failed to move patient to archive');
    } finally {
      setArchiveDialogOpen(false);
      setArchiveTarget(null);
    }
  };

  const handleEditPatient = (patient: any) => {
    setEditingPatientId(getInternalPatientKey(patient) || null);
    setPatientForm({
      name: patient.name || "",
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split("T")[0] : "",
      sex: patient.sex || "",
      contactNumber: patient.contactNumber || "",
      address: patient.address || "",
      email: patient.email || "",
      bloodType: patient.bloodType || "",
      emergencyContactName: patient.emergencyContact?.name || "",
      emergencyContactRelationship: patient.emergencyContact?.relationship || "",
      emergencyContactPhone: patient.emergencyContact?.phone || ""
    });
    setShowAddPatientDialog(true);
  };

  const handleAddService = () => {
    if (!serviceForm.description || !serviceForm.category || !serviceForm.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedPatient) {
      toast.error('No patient selected');
      return;
    }

    if (typeof ps.addService === "function") {
      ps.addService(selectedPatient.id, {
       description: serviceForm.description,
       category: serviceForm.category,
       price: parseFloat(serviceForm.price),
       attendingPhysician: serviceForm.attendingPhysician,
       date: serviceForm.date
      });
    } else {
      console.warn("patientService.addService not available, skipping local update");
    }

    // Reload patient data
    const updatedPatient = (typeof ps.getPatient === "function")
      ? ps.getPatient(selectedPatient.id)
      : selectedPatient;
    setSelectedPatient(updatedPatient);
    fetchPatientsFromDb();
    setShowAddServiceDialog(false);
    resetServiceForm();
    toast.success("Service added successfully!");
  };

  const handleAddMedicine = () => {
    if (!medicineForm.description || !medicineForm.quantity || !medicineForm.unitPrice) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedPatient) {
      toast.error('No patient selected');
      return;
    }

    if (typeof ps.addMedicine === "function") {
      ps.addMedicine(selectedPatient.id, {
       description: medicineForm.description,
       quantity: parseInt(medicineForm.quantity),
       unitPrice: parseFloat(medicineForm.unitPrice),
       prescribedBy: medicineForm.prescribedBy,
       date: medicineForm.date
      });
    } else {
      console.warn("patientService.addMedicine not available, skipping local update");
    }

    // Reload patient data
    const updatedPatient = (typeof ps.getPatient === "function")
      ? ps.getPatient(selectedPatient.id)
      : selectedPatient;
    setSelectedPatient(updatedPatient);
    fetchPatientsFromDb();
    setShowAddMedicineDialog(false);
    resetMedicineForm();
    toast.success("Medicine added successfully!");
  };

  const resetPatientForm = () => {
    setPatientForm({
      name: "",
      dateOfBirth: "",
      sex: "",
      contactNumber: "",
      address: "",
      email: "",
      bloodType: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: ""
    });
  };

  const resetServiceForm = () => {
    setServiceForm({
      description: "",
      category: "",
      price: "",
      attendingPhysician: "",
      date: new Date().toISOString().split('T')[0]
    });
  };

  const resetMedicineForm = () => {
    setMedicineForm({
      description: "",
      quantity: "",
      unitPrice: "",
      prescribedBy: "",
      date: new Date().toISOString().split('T')[0]
    });
  };

  const filteredPatients = patients.filter((patient: any) => {
    const term = (searchQuery || "").toLowerCase();
    const pid = (getDisplayPatientId(patient) || "").toString().toLowerCase();
    const name = (patient?.name || "").toString().toLowerCase();
    const contact = (patient?.contactNumber || "").toString().toLowerCase();
    return pid.includes(term) || name.includes(term) || contact.includes(term);
  });

  const getPatientCharges = (patient: any) => {
    const pid = getInternalPatientKey(patient);
    if (typeof ps.getPatientTotalCharges === "function" && pid) {
      try {
        return ps.getPatientTotalCharges(pid);
      } catch (e) {
        console.error("getPatientTotalCharges error", e);
      }
    }
    return { total: 0, services: 0, medicines: 0, medicinesVAT: 0, subtotal: 0 };
  };

  // Local fallback age calculator (years) when patientService.calculateAge is not available
  const calculateAgeLocal = (dob: string) => {
    if (!dob) return "-";
    try {
      const birth = new Date(dob);
      if (isNaN(birth.getTime())) return "-";
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 ? age : "-";
    } catch (e) {
      return "-";
    }
  };
  return (
    <div>
      {/* Header */}
      <div className="bg-[#358E83] rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-white mb-2">
              Patient Management
            </h2>
            <p className="text-white/90">
              {userSession?.role === 'admin' 
                ? 'Create and manage patient records for the hospital system'
                : 'View patient information, services, and pharmacy purchases'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddPatientDialog(true)}
            className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Patient
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{patients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Stethoscope className="mr-2 h-4 w-4" />
              Total Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {patients.reduce((sum, p) => sum + (p.services?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Pill className="mr-2 h-4 w-4" />
              Total Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {patients.reduce((sum, p) => sum + (p.medicines?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Receipt className="mr-2 h-4 w-4" />
              Total Charges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ₱{patients.reduce((sum, p) => {
                const charges = getPatientCharges(p);
                return sum + (charges?.total || 0);
              }, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      <Card>
        <CardHeader className="bg-[#358E83] text-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Users className="mr-2" size={20} />
                Patient Records
              </CardTitle>
              <CardDescription className="text-white/80">
                View and manage patient information and billing
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto mb-3 opacity-50" size={48} />
                <p>No patients found</p>
              </div>
            ) : (
              filteredPatients.map((patient, idx) => {
                const internalId = getInternalPatientKey(patient) || `p-${idx}`;
                const charges = getPatientCharges(patient);
                const age = (patient?.dateOfBirth)
                  ? (typeof ps.calculateAge === 'function' ? ps.calculateAge(patient.dateOfBirth) : calculateAgeLocal(patient.dateOfBirth))
                  : "-";
                
                return (
                  <div
                    key={internalId}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-[#358E83] text-white flex items-center justify-center">
                            <Users size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">{patient.name}</h4>
                              {patient.createdByRole === 'admin' && (
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
                                  Admin Created
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {getDisplayPatientId(patient)} • {age} years old • {patient.sex}
                              {patient.createdBy && (
                                <span className="text-gray-500"> • Created by {patient.createdBy}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 flex items-center">
                              <Phone size={14} className="mr-1" />
                              Contact
                            </p>
                            <p className="font-medium">{patient.contactNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 flex items-center">
                              <Activity size={14} className="mr-1" />
                              Services
                            </p>
                            <p className="font-medium">{patient.services?.length || 0} services</p>
                          </div>
                          <div>
                            <p className="text-gray-500 flex items-center">
                              <Pill size={14} className="mr-1" />
                              Medicines
                            </p>
                            <p className="font-medium">{patient.medicines?.length || 0} items</p>
                          </div>
                          <div>
                            <p className="text-gray-500 flex items-center">
                              <Receipt size={14} className="mr-1" />
                              Total Charges
                            </p>
                            <p className="font-semibold text-[#358E83]">
                              ₱{charges.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPatient(patient)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {/* Edit and Archive actions are admin-only on cashier/limited roles */}
                        {userSession?.role && userSession.role.toString().toLowerCase() !== 'cashier' ? (
                          <div className="flex gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditPatient(patient)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => confirmArchivePatient(getInternalPatientKey(patient))}>
                              <Trash2 className="h-4 w-4 mr-2" /> Move to Archive
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 mt-2">Edit / Archive (Admin only)</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patient Details Panel (right-side fixed panel) */}
      {showPatientDialog && selectedPatient && (
        <div className="fixed right-0 top-0 h-full w-[min(1000px,85vw)] bg-white p-4 md:p-6 shadow-2xl overflow-auto z-50" role="dialog" aria-modal="true">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Patient Details</h2>
              <p className="text-sm text-gray-600">View and manage patient information, services, and billing</p>
            </div>
            <div>
              <Button variant="ghost" onClick={() => setShowPatientDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="overflow-y-auto pr-2">
              {/* Patient Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label className="text-sm font-medium">Patient ID</Label>
                    <p className="text-lg font-semibold text-gray-900">{getDisplayPatientId(selectedPatient)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sex</Label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.sex}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Contact Number</Label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.contactNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.address || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Blood Type</Label>
                    <p className="text-lg font-semibold text-gray-900">{selectedPatient.bloodType || 'N/A'}</p>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Emergency Contact */}
                <div className="mb-6">
                  <Label className="text-sm font-medium">Emergency Contact</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedPatient.emergencyContact?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Relationship</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedPatient.emergencyContact?.relationship || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedPatient.emergencyContact?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Services and Medicines */}
                <div className="mb-6">
                  <Label className="text-sm font-medium">Services and Medicines</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Services</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedPatient.services?.length || 0} services</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Medicines</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedPatient.medicines?.length || 0} items</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Charges</p>
                      <p className="text-lg font-semibold text-gray-900">₱{getPatientCharges(selectedPatient).total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto pl-2">
                <div className="mb-6">
                  <Label className="text-sm font-medium">Detailed Items</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Services (Local / EMR)</p>
                      <div className="space-y-2">
                        {(selectedPatient.services || []).map((s: any, i: number) => (
                          <div key={`local-s-${i}`} className="p-2 border rounded bg-white">
                            <div className="font-medium">{s.description || s.service || s.name}</div>
                            <div className="text-xs text-gray-500">{s.category || s.group || ''} • {s.quantity || 1} • {s.date || ''}</div>
                            {s.notes && <div className="text-xs text-gray-600 mt-1">{s.notes}</div>}
                          </div>
                        ))}

                        {(() => {
                          try {
                            const emr = getEmrDataForPatient(selectedPatient);
                            if (emr && Array.isArray(emr.services) && emr.services.length > 0) {
                              return emr.services.map((es: any, idx: number) => (
                                <div key={`emr-s-${idx}`} className="p-2 border rounded bg-gray-50 flex items-start justify-between">
                                  <div>
                                    <div className="font-medium">{es.service}</div>
                                    <div className="text-xs text-gray-500">{es.category} • {es.quantity} • {es.date}</div>
                                    {es.notes && <div className="text-xs text-gray-600 mt-1">{es.notes}</div>}
                                  </div>
                                  <div className="ml-3">
                                    <Button size="sm" onClick={() => {
                                      try {
                                        const key = getInternalPatientKey(selectedPatient) || selectedPatient.patientId || selectedPatient.id || selectedPatient._id || getDisplayPatientId(selectedPatient);
                                        const price = PriceListService.getPrice(es.service, es.category) || 0;
                                        const item = { id: `emr-${es.serviceId}-${Date.now()}`, description: es.service, quantity: es.quantity || 1, rate: price, amount: (price * (es.quantity || 1)), category: es.category || 'Service' };
                                        window.dispatchEvent(new CustomEvent('emr-add-to-invoice', { detail: { patientId: key, patientName: selectedPatient.name, item } }));
                                        toast.success(`${es.service} added to invoice builder`);
                                      } catch (e) { console.error(e); toast.error('Failed to add EMR item'); }
                                    }}>Add</Button>
                                  </div>
                                </div>
                              ));
                            }
                          } catch (e) {
                            // ignore
                          }
                          return <div className="text-sm text-gray-500">No EMR services</div>;
                        })()}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-2">Medicines (Local / EMR)</p>
                      <div className="space-y-2">
                        {(selectedPatient.medicines || []).map((m: any, i: number) => (
                          <div key={`local-m-${i}`} className="p-2 border rounded bg-white">
                            <div className="font-medium">{m.name || m.description || 'Medicine'}</div>
                            <div className="text-xs text-gray-500">{m.strength || ''} • Qty: {m.quantity} • {m.datePrescribed || m.date || ''}</div>
                            {m.instructions && <div className="text-xs text-gray-600 mt-1">{m.instructions}</div>}
                          </div>
                        ))}

                        {(() => {
                          try {
                            const emr = getEmrDataForPatient(selectedPatient);
                            if (emr && Array.isArray((emr as any).medicines) && (emr as any).medicines.length > 0) {
                              return (emr as any).medicines.map((med: any, idx: number) => (
                                <div key={`emr-m-${idx}`} className="p-2 border rounded bg-gray-50 flex items-start justify-between">
                                  <div>
                                    <div className="font-medium">{med.name}</div>
                                    <div className="text-xs text-gray-500">{med.strength || med.form || ''} • Qty: {med.quantity} • {med.datePrescribed || med.date}</div>
                                    {med.instructions && <div className="text-xs text-gray-600 mt-1">{med.instructions}</div>}
                                  </div>
                                  <div className="ml-3">
                                    <Button size="sm" onClick={() => {
                                      try {
                                        const key = getInternalPatientKey(selectedPatient) || selectedPatient.patientId || selectedPatient.id || selectedPatient._id || getDisplayPatientId(selectedPatient);
                                        const price = PriceListService.getPrice(med.name || med.description || 'Medicine', 'Pharmacy') || 0;
                                        const item = { id: `pharm-${med.medicineId || idx}-${Date.now()}`, description: `${med.name}${med.strength ? ` (${med.strength})` : ''}`, quantity: med.quantity || 1, rate: price, amount: (price * (med.quantity || 1)), category: 'Pharmacy' };
                                        window.dispatchEvent(new CustomEvent('emr-add-to-invoice', { detail: { patientId: key, patientName: selectedPatient.name, item } }));
                                        toast.success(`${med.name} added to invoice builder`);
                                      } catch (e) { console.error(e); toast.error('Failed to add medicine'); }
                                    }}>Add</Button>
                                  </div>
                                </div>
                              ));
                            }
                          } catch (e) {}
                          return <div className="text-sm text-gray-500">No EMR medicines</div>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col md:flex-row gap-4">
                  {userSession?.role && userSession.role.toString().toLowerCase() !== 'cashier' ? (
                    <>
                      <Button onClick={() => { setShowPatientDialog(false); handleEditPatient(selectedPatient); }} className="flex-1">
                        <Edit className="mr-2 h-4 w-4" /> Edit Patient
                      </Button>
                      <Button variant="destructive" onClick={() => confirmArchivePatient(getInternalPatientKey(selectedPatient))} className="flex-1">
                        <Trash2 className="mr-2 h-4 w-4" /> Move to Archive
                      </Button>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">Editing and archiving patient records requires admin privileges.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Add Patient Dialog */}
      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Patient to Archive?</DialogTitle>
            <DialogDescription>
              Are you sure you want to move this patient to the archive? You can restore the patient later from the Archive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              <div className="font-medium">This action will hide the patient from active lists.</div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => performArchive(archiveTarget)}>
                Move to Archive
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showAddPatientDialog} onOpenChange={setShowAddPatientDialog}>
  <DialogContent className="w-[95vw] max-w-[1200px] max-h-[85vh] p-4 md:p-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              {editingPatientId ? "Edit Patient" : "Add New Patient"}
            </DialogTitle>
            <DialogDescription>
              {editingPatientId 
                ? "Update the patient details and save changes"
                : "Enter the patient details to add a new record"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Name</Label>
              <Input
                id="name"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                placeholder="Enter patient's full name"
                className="mt-1 md:col-span-2"
              />
            </div>

            <div>
              <Label htmlFor="dateOfBirth" className="text-sm font-medium">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={patientForm.dateOfBirth}
                onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="sex" className="text-sm font-medium">Sex</Label>
              <Select
                id="sex"
                value={patientForm.sex}
                onValueChange={(value: string) => setPatientForm({ ...patientForm, sex: value })}
                className="mt-1"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contactNumber" className="text-sm font-medium">Contact Number</Label>
              <Input
                id="contactNumber"
                value={patientForm.contactNumber}
                onChange={(e) => setPatientForm({ ...patientForm, contactNumber: e.target.value })}
                placeholder="Enter contact number"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-sm font-medium">Address</Label>
              <Input
                id="address"
                value={patientForm.address}
                onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                placeholder="Enter address"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={patientForm.email}
                onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="bloodType" className="text-sm font-medium">Blood Type</Label>
              <Select
                id="bloodType"
                value={patientForm.bloodType}
                onValueChange={(value: string) => setPatientForm({ ...patientForm, bloodType: value })}
                className="mt-1"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="emergencyContactName" className="text-sm font-medium">Emergency Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={patientForm.emergencyContactName}
                onChange={(e) => setPatientForm({ ...patientForm, emergencyContactName: e.target.value })}
                placeholder="Enter emergency contact name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="emergencyContactRelationship" className="text-sm font-medium">Relationship</Label>
              <Input
                id="emergencyContactRelationship"
                value={patientForm.emergencyContactRelationship}
                onChange={(e) => setPatientForm({ ...patientForm, emergencyContactRelationship: e.target.value })}
                placeholder="Enter relationship to emergency contact"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="emergencyContactPhone" className="text-sm font-medium">Emergency Contact Phone</Label>
              <Input
                id="emergencyContactPhone"
                value={patientForm.emergencyContactPhone}
                onChange={(e) => setPatientForm({ ...patientForm, emergencyContactPhone: e.target.value })}
                placeholder="Enter emergency contact phone"
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setShowAddPatientDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPatient}
              className="flex-1 bg-[#358E83] hover:bg-[#358E83]/90 text-white"
            >
              {editingPatientId ? "Save Changes" : "Add Patient"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={showAddServiceDialog} onOpenChange={setShowAddServiceDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              Add Service
            </DialogTitle>
            <DialogDescription>
              Enter the service details to add to the patient's record
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Input
                id="description"
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="Enter service description"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Input
                id="category"
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                placeholder="Enter service category"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="price" className="text-sm font-medium">Price</Label>
              <Input
                id="price"
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                placeholder="Enter service price"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="attendingPhysician" className="text-sm font-medium">Attending Physician</Label>
              <Input
                id="attendingPhysician"
                value={serviceForm.attendingPhysician}
                onChange={(e) => setServiceForm({ ...serviceForm, attendingPhysician: e.target.value })}
                placeholder="Enter attending physician's name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="date" className="text-sm font-medium">Date</Label>
              <Input
                id="date"
                type="date"
                value={serviceForm.date}
                onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setShowAddServiceDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddService}
              className="flex-1 bg-[#358E83] hover:bg-[#358E83]/90 text-white"
            >
              Add Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Medicine Dialog */}
      <Dialog open={showAddMedicineDialog} onOpenChange={setShowAddMedicineDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              Add Medicine
            </DialogTitle>
            <DialogDescription>
              Enter the medicine details to add to the patient's record
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="medicineDescription" className="text-sm font-medium">Description</Label>
              <Input
                id="medicineDescription"
                value={medicineForm.description}
                onChange={(e) => setMedicineForm({ ...medicineForm, description: e.target.value })}
                placeholder="Enter medicine description"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="quantity" className="text-sm font-medium">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={medicineForm.quantity}
                onChange={(e) => setMedicineForm({ ...medicineForm, quantity: e.target.value })}
                placeholder="Enter quantity"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="unitPrice" className="text-sm font-medium">Unit Price</Label>
              <Input
                id="unitPrice"
                type="number"
                value={medicineForm.unitPrice}
                onChange={(e) => setMedicineForm({ ...medicineForm, unitPrice: e.target.value })}
                placeholder="Enter unit price"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="prescribedBy" className="text-sm font-medium">Prescribed By</Label>
              <Input
                id="prescribedBy"
                value={medicineForm.prescribedBy}
                onChange={(e) => setMedicineForm({ ...medicineForm, prescribedBy: e.target.value })}
                placeholder="Enter prescriber's name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="medicineDate" className="text-sm font-medium">Date</Label>
              <Input
                id="medicineDate"
                type="date"
                value={medicineForm.date}
                onChange={(e) => setMedicineForm({ ...medicineForm, date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setShowAddMedicineDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMedicine}
              className="flex-1 bg-[#358E83] hover:bg-[#358E83]/90 text-white"
            >
              Add Medicine
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
