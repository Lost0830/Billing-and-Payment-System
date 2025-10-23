import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

interface PatientsProps {
  onNavigateToView?: (view: string) => void;
}

export function Patients({ onNavigateToView }: PatientsProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
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
        
        <Card>
          <CardHeader>
            <CardTitle>Patient Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This module would contain patient management functionality including patient registration, 
              medical records, appointment history, and more.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}