import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Archive as ArchiveIcon, Trash2, RefreshCw, RotateCcw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface ArchivedItem {
  id: string;
  name: string;
  type: string;
  archivedAt: string;
  originalData: any;
}

export function Archive() {
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArchivedItems = async () => {
    setLoading(true);
    try {
      // Use unified archive endpoint which returns users, patients and invoices
      const res = await fetch('/api/archive');
      if (!res.ok) throw new Error('Failed to fetch archive');
      const body = await res.json();

      const users = body.data?.users || [];
      const patients = body.data?.patients || [];
      const invoices = body.data?.invoices || [];

      // Also include client-side archived discounts/promotions from local storage service
      let discounts: any[] = [];
      let promotions: any[] = [];
      try {
        const dm = await import("../services/discountManagementService");
        const svc = (dm as any).DiscountManagementService || (dm as any).default || dm;
        discounts = svc.getAllDiscounts().filter((d: any) => d.isArchived);
        promotions = svc.getAllPromotions().filter((p: any) => p.isArchived);
      } catch (e) {
        // ignore if service cannot be used in this environment
      }

      const allArchivedItems = [
        ...users.map((item: any) => ({
          id: item._id || item.id,
          name: item.name || item.email || 'Unnamed',
          type: 'User',
          archivedAt: item.archivedAt ? new Date(item.archivedAt).toLocaleString() : 'Unknown',
          originalData: item
        })),
        ...patients.map((item: any) => ({
          id: item._id || item.id,
          name: item.name || 'Unnamed',
          type: 'Patient',
          archivedAt: item.archivedAt ? new Date(item.archivedAt).toLocaleString() : 'Unknown',
          originalData: item
        })),
        ...invoices.map((item: any) => ({
          id: item._id || item.id,
          name: item.invoiceNumber || item.number || 'Invoice',
          type: 'Invoice',
          archivedAt: item.archivedAt ? new Date(item.archivedAt).toLocaleString() : 'Unknown',
          originalData: item
        })),
        // client-side discounts
        ...discounts.map((d: any) => ({
          id: d.id,
          name: d.name || d.code || 'Discount',
          type: 'Discount',
          archivedAt: d.updatedAt ? new Date(d.updatedAt).toLocaleString() : 'Unknown',
          originalData: d
        })),
        ...promotions.map((p: any) => ({
          id: p.id,
          name: p.title || 'Promotion',
          type: 'Promotion',
          archivedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : 'Unknown',
          originalData: p
        })),
      ];

      setArchivedItems(allArchivedItems);
    } catch (error) {
      toast.error("Failed to fetch archived items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedItems();
  }, []);

  const handleRestore = async (item: ArchivedItem) => {
    try {
      // Client-side discounts/promotions are stored in localStorage service
      if (item.type === 'Discount' || item.type === 'Promotion') {
        try {
          const dm = await import("../services/discountManagementService");
          const svc = (dm as any).DiscountManagementService || (dm as any).default || dm;
          if (item.type === 'Discount') {
            const ok = svc.restoreDiscount(item.id);
            if (!ok) throw new Error('Discount not found');
          } else {
            const ok = svc.restorePromotion(item.id);
            if (!ok) throw new Error('Promotion not found');
          }
          toast.success(`${item.type} restored successfully`);
          fetchArchivedItems();
          return;
        } catch (svcErr) {
          console.error('Client-side restore error', svcErr);
          toast.error(`Failed to restore ${item.type.toLowerCase()}`);
          return;
        }
      }

      // Use archive API to restore for backend resources (users/patients/invoices)
      const typeKey = item.type.toLowerCase() === 'user' ? 'users' : item.type.toLowerCase() === 'patient' ? 'patients' : 'invoices';
      const response = await fetch(`/api/archive/${typeKey}/${item.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to restore item');
      toast.success(`${item.type} restored successfully`);
      fetchArchivedItems(); // Refresh the list
    } catch (error) {
      toast.error(`Failed to restore ${item.type.toLowerCase()}`);
    }
  };

  const handlePermanentDelete = async (item: ArchivedItem) => {
    if (!confirm(`Are you sure you want to permanently delete this ${item.type.toLowerCase()}? This action cannot be undone.`)) {
      return;
    }

    try {
      // client-side discounts/promotions should be removed locally
      if (item.type === 'Discount' || item.type === 'Promotion') {
        try {
          const dm = await import("../services/discountManagementService");
          const svc = (dm as any).DiscountManagementService || (dm as any).default || dm;
          let ok = false;
          if (item.type === 'Discount') ok = svc.deleteDiscount(item.id);
          else ok = svc.deletePromotion(item.id);
          if (!ok) throw new Error('Item not found');
          toast.success(`${item.type} permanently deleted`);
          fetchArchivedItems();
          return;
        } catch (svcErr) {
          console.error('Client-side delete error', svcErr);
          toast.error(`Failed to delete ${item.type.toLowerCase()}`);
          return;
        }
      }

      const typeKey = item.type.toLowerCase() === 'user' ? 'users' : item.type.toLowerCase() === 'patient' ? 'patients' : 'invoices';
      const response = await fetch(`/api/archive/${typeKey}/${item.id}/permanent`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete item');
      toast.success(`${item.type} permanently deleted`);
      fetchArchivedItems(); // Refresh the list
    } catch (error) {
      toast.error(`Failed to delete ${item.type.toLowerCase()}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Archived Items</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchArchivedItems}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Archived Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.archivedAt}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handlePermanentDelete(item)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {archivedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No archived items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}