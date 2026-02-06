import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { toast } from "sonner";
import { Archive as ArchiveIcon, Trash2, RefreshCw, RotateCcw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";

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
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<ArchivedItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArchivedItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkRestoreDialog, setShowBulkRestoreDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

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

      // Try primary archive endpoint first, fallback to resource restore endpoint used elsewhere
      const typeKey = item.type.toLowerCase() === 'user' ? 'users' : item.type.toLowerCase() === 'patient' ? 'patients' : 'invoices';
      const endpoints = [
        `/api/archive/${typeKey}/${item.id}/restore`,
        `/api/${typeKey}/${item.id}/restore`,
        `/${typeKey}/${item.id}/restore`
      ];

      let restored = false;
      for (const url of endpoints) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            restored = true;
            break;
          }
        } catch (e) {
          // try next endpoint
        }
      }

      if (!restored) throw new Error('Failed to restore item');

      toast.success(`${item.type} restored successfully`);
      fetchArchivedItems(); // Refresh the list
    } catch (error) {
      console.error('Restore error', error);
      toast.error(`Failed to restore ${item.type.toLowerCase()}`);
    }
  };

  const handlePermanentDelete = async (item: ArchivedItem) => {
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
      const endpoints = [
        `/api/archive/${typeKey}/${item.id}/permanent`,
        `/api/${typeKey}/${item.id}`,
        `/${typeKey}/${item.id}`
      ];

      let deleted = false;
      for (const url of endpoints) {
        try {
          const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            deleted = true;
            break;
          }
        } catch (e) {
          // try next endpoint
        }
      }

      if (!deleted) throw new Error('Failed to delete item');

      toast.success(`${item.type} permanently deleted`);
      fetchArchivedItems(); // Refresh the list
    } catch (error) {
      console.error('Delete error', error);
      toast.error(`Failed to delete ${item.type.toLowerCase()}`);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === archivedItems.length) setSelectedIds([]);
    else setSelectedIds(archivedItems.map(i => i.id));
  };

  const confirmBulkRestore = async () => {
    for (const id of selectedIds) {
      const item = archivedItems.find(i => i.id === id);
      if (item) await handleRestore(item);
    }
    setSelectedIds([]);
    setShowBulkRestoreDialog(false);
  };

  const confirmBulkDelete = async () => {
    for (const id of selectedIds) {
      const item = archivedItems.find(i => i.id === id);
      if (item) await handlePermanentDelete(item);
    }
    setSelectedIds([]);
    setShowBulkDeleteDialog(false);
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
          {selectedIds.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">{selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowBulkRestoreDialog(true)}>Restore Selected</Button>
                  <Button size="sm" variant="destructive" onClick={() => setShowBulkDeleteDialog(true)}>Delete Selected</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
                </div>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={archivedItems.length > 0 && selectedIds.length === archivedItems.length} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Archived Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.archivedAt}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRestoreTarget(item); setShowRestoreDialog(true); }}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setDeleteTarget(item); setShowDeleteDialog(true); }}
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
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the archived {restoreTarget?.type?.toLowerCase()} "{restoreTarget?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (restoreTarget) handleRestore(restoreTarget); setShowRestoreDialog(false); setRestoreTarget(null); }} className="bg-[#358E83] hover:bg-[#358E83]/90">
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the archived {deleteTarget?.type?.toLowerCase()} "{deleteTarget?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) handlePermanentDelete(deleteTarget); setShowDeleteDialog(false); setDeleteTarget(null); }} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showBulkRestoreDialog} onOpenChange={setShowBulkRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore selected items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore {selectedIds.length} selected item{selectedIds.length > 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkRestore} className="bg-[#358E83] hover:bg-[#358E83]/90">
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected items permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length} selected item{selectedIds.length > 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
