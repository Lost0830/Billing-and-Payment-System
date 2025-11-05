import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowLeft, Archive, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import ArchivedPatients from './ArchivedPatients';

interface Patient {
  _id: string;
  name: string;
  dateOfBirth: string;
  sex: string;
  contactNumber: string;
  email: string;
  bloodType: string;
}

interface PatientsProps {
  onNavigateToView?: (view: string) => void;
}

export function Patients({ onNavigateToView }: PatientsProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<string>("");
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      const data = await response.json();
      if (data.success) {
        setPatients(data.data);
      } else {
        setError(data.message || 'Failed to fetch patients');
      }
    } catch (err) {
      setError('Failed to fetch patients');
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const { userSession } = useAuth();

  const handleArchive = async () => {
    if (!selectedPatient) return;
    try {
      const response = await fetch(`/api/patients/${selectedPatient._id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'current-user-id', // Replace with actual user ID from auth context
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowArchiveDialog(false);
        fetchPatients(); // Refresh the list
      } else {
        setError(data.message || 'Failed to archive patient');
      }
    } catch (err) {
      setError('Failed to archive patient');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Patients Module</h1>
          <Button
            variant="outline"
            onClick={() => onNavigateToView?.("medicare-billing")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Patient Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="active" className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Active Patients
                </TabsTrigger>
                <TabsTrigger value="archived" className="flex items-center">
                  <Archive className="w-4 h-4 mr-2" />
                  Archived Patients
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Sex</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Blood Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient._id}>
                        <TableCell>{patient.name}</TableCell>
                        <TableCell>{patient.dateOfBirth}</TableCell>
                        <TableCell>{patient.sex}</TableCell>
                        <TableCell>{patient.contactNumber}</TableCell>
                        <TableCell>{patient.bloodType}</TableCell>
                        <TableCell>
                          {/* Only admins can archive patients — hide archive control for cashier or other roles */}
                          {userSession && (userSession.role === 'admin' || userSession.role === 'Admin') ? (
                            <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="secondary"
                                  onClick={() => setSelectedPatient(patient)}
                                  className="flex items-center"
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirm Archive</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to archive {patient.name}? The patient record will be moved to the archive.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowArchiveDialog(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="default"
                                    onClick={handleArchive}
                                  >
                                    Archive
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <div className="text-sm text-gray-500">(Admin only)</div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="archived">
                <ArchivedPatients />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}