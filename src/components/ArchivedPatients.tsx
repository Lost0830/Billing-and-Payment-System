import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
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

interface Patient {
  _id: string;
  name: string;
  dateOfBirth: string;
  contactNumber: string;
  email: string;
  archivedAt: string;
  archivedBy: string;
}

export default function ArchivedPatients() {
  const [archivedPatients, setArchivedPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchArchivedPatients = async () => {
    try {
      const response = await fetch('/api/patients/archived');
      const data = await response.json();
      if (data.success) {
        setArchivedPatients(data.data);
      } else {
        setError(data.message || 'Failed to fetch archived patients');
      }
    } catch (err) {
      setError('Failed to fetch archived patients');
    }
  };

  useEffect(() => {
    fetchArchivedPatients();
  }, []);

  const handleRestore = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/restore`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        fetchArchivedPatients(); // Refresh the list
      } else {
        setError(data.message || 'Failed to restore patient');
      }
    } catch (err) {
      setError('Failed to restore patient');
    }
  };

  const handleDelete = async () => {
    if (!selectedPatient) return;
    try {
      const response = await fetch(`/api/patients/${selectedPatient._id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setShowDeleteDialog(false);
        fetchArchivedPatients(); // Refresh the list
      } else {
        setError(data.message || 'Failed to delete patient');
      }
    } catch (err) {
      setError('Failed to delete patient');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Archived Patients</h2>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Archived Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {archivedPatients.map((patient) => (
            <TableRow key={patient._id}>
              <TableCell>{patient.name}</TableCell>
              <TableCell>{patient.dateOfBirth}</TableCell>
              <TableCell>{patient.contactNumber}</TableCell>
              <TableCell>{patient.email}</TableCell>
              <TableCell>{new Date(patient.archivedAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleRestore(patient._id)}
                  >
                    Restore
                  </Button>
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Permanent Deletion</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to permanently delete {patient.name}? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                        >
                          Delete Permanently
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}