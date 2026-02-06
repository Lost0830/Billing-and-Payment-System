import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Users,
  UserPlus,
  Filter,
  Eye,
  Mail,
  Calendar,
  CheckSquare,
  Square,
  Download,
  UserCheck,
  UserX,
  Key,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Cashier";
  status: "Active" | "Inactive";
  lastLogin: string;
  createdAt: string;
  permissions: string[];
}

interface UserManagementProps {
  onNavigateToView: (view: string) => void;
}

export function UserManagement({ onNavigateToView }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserPassword, setEditUserPassword] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);

  // start with an empty list and fetch from backend on mount
  const [users, setUsers] = useState<User[]>([]);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Cashier" as "Admin" | "Cashier",
    permissions: [] as string[]
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesStatus = selectedStatus === "all" || user.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Role-based permissions
  const rolePermissions = {
    Admin: ["Full Access", "User Management", "System Settings", "Billing Management", "Invoice Generation", "Payment Processing", "Reports", "Discounts Management"],
    Cashier: ["Billing Management", "Invoice Generation", "Payment Processing", "Reports"]
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/users');
      // read text first so we can show helpful errors if the server returns HTML (e.g. an index.html or error page)
      const text = await res.text();
      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (!res.ok) {
        // include a snippet of the response body to aid debugging
        const snippet = text ? text.substring(0, 400) : '';
        throw new Error(`Server returned ${res.status}: ${snippet}`);
      }

      if (!contentType.includes('application/json')) {
        const snippet = text ? text.substring(0, 400) : '';
        throw new Error(`Expected JSON but server returned '${contentType}'. Response snippet: ${snippet}`);
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Failed to parse JSON response: ${err instanceof Error ? err.message : String(err)}. Response snippet: ${text.substring(0,400)}`);
      }

      // Support multiple shapes: array or { users: [...] } or { data: [...] }
      const rawList: any[] = Array.isArray(data) ? data : data.users || data.data || [];

      const mapped: User[] = rawList.map((u: any, idx: number) => ({
        id: (u._id && String(u._id)) || (u.id && String(u.id)) || String(Date.now() + idx),
        name: u.name || u.fullName || u.displayName || (u.email ? u.email.split('@')[0] : 'Unknown'),
        email: u.email || '',
        // Normalize role coming from backend which stores roles lowercased (e.g. 'admin')
        role: (u.role && (typeof u.role === 'string') && u.role.toLowerCase() === 'admin') ? 'Admin' : 'Cashier',
        status: u.status === 'Inactive' ? 'Inactive' : 'Active',
        lastLogin: u.lastLogin || 'Never',
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : (u.createdAt || new Date().toISOString().split('T')[0]),
        permissions: u.permissions || []
      }));

      setUsers(mapped);
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to fetch users');
      // toast is available via import above
      // @ts-ignore -- toast type could be different in this bundle
      toast.error(err?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // fetch users once on mount
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = () => {
    // local validation
    if (!newUser.name) return toast.error("Name is required");
    if (!newUser.email) return toast.error("Email is required");
    if (!newUser.password) return toast.error("Password is required");
    if (newUser.password.length < 8) return toast.error("Password must be at least 8 characters long");
    if (newUser.password !== newUser.confirmPassword) return toast.error("Passwords do not match");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) return toast.error("Please enter a valid email address");

    const userExists = users.some(user => user.email.toLowerCase() === newUser.email.toLowerCase());
    if (userExists) return toast.error("User with this email already exists");

    const payload = { name: newUser.name, email: newUser.email.toLowerCase(), password: newUser.password, role: newUser.role.toLowerCase(), status: 'Active' };

    setCreateLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const text = await res.text();
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok) throw new Error(text || `Server returned ${res.status}`);
        const body = contentType.includes('application/json') && text ? JSON.parse(text) : {};
        const created = body.data || body;
        const mapped: User = {
          id: (created._id && String(created._id)) || (created.id && String(created.id)) || String(Date.now()),
          name: created.name || payload.name,
          email: created.email || payload.email,
          role: (created.role && (typeof created.role === 'string') && created.role.toLowerCase() === 'admin' ? 'Admin' : 'Cashier') || (payload.role === 'admin' ? 'Admin' : 'Cashier'),
          status: created.status || 'Active',
          lastLogin: created.lastLogin || 'Never',
          createdAt: created.createdAt ? new Date(created.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          permissions: created.permissions || (payload.role === 'admin' ? rolePermissions.Admin : rolePermissions.Cashier),
        };

        setUsers(prev => [...prev, mapped]);
        setNewUser({ name: "", email: "", password: "", confirmPassword: "", role: "Cashier", permissions: [] });
        setIsCreateDialogOpen(false);
        toast.success(body?.message || 'User created successfully');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to create user');
      } finally {
        setCreateLoading(false);
      }
    })();
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserPassword({ newPassword: "", confirmPassword: "" });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    // Validate password if provided
    if (editUserPassword.newPassword) {
      if (editUserPassword.newPassword.length < 8) return toast.error("Password must be at least 8 characters long");
      if (editUserPassword.newPassword !== editUserPassword.confirmPassword) return toast.error("Passwords do not match");
    }

    setEditLoading(true);
    (async () => {
      try {
        const payload: any = { name: selectedUser.name, email: selectedUser.email, role: selectedUser.role.toLowerCase(), status: selectedUser.status };
        if (editUserPassword.newPassword) payload.password = editUserPassword.newPassword;

        const res = await fetch(`/api/users/${selectedUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const text = await res.text();
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok) throw new Error(text || `Server returned ${res.status}`);
        const body = contentType.includes('application/json') && text ? JSON.parse(text) : {};
        const updated = body.data || body;
        const mapped: User = {
          id: (updated._id && String(updated._id)) || (updated.id && String(updated.id)) || selectedUser.id,
          name: updated.name || selectedUser.name,
          email: updated.email || selectedUser.email,
          role: (updated.role && (typeof updated.role === 'string') && updated.role.toLowerCase() === 'admin' ? 'Admin' : 'Cashier') || selectedUser.role,
          status: updated.status || selectedUser.status,
          lastLogin: updated.lastLogin || selectedUser.lastLogin,
          createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString().split('T')[0] : selectedUser.createdAt,
          permissions: updated.permissions || selectedUser.permissions,
        };

        setUsers(prev => prev.map(u => u.id === mapped.id ? mapped : u));
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        setEditUserPassword({ newPassword: "", confirmPassword: "" });
        toast.success(body?.message || 'User updated successfully');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update user');
      } finally {
        setEditLoading(false);
      }
    })();
  };

  const handleToggleUserStatus = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user && user.role === "Admin" && user.status === "Active") {
      // Prevent deactivating the last admin
      const activeAdminCount = users.filter(u => u.role === "Admin" && u.status === "Active").length;
      if (activeAdminCount <= 1) {
        toast.error("Cannot deactivate the last active admin user");
        return;
      }
    }
    
    setUsers(users.map(user => {
      if (user.id === userId) {
        const newStatus = user.status === "Active" ? "Inactive" : "Active";
        toast.success(`User ${user.email} ${newStatus.toLowerCase()}`);
        return { ...user, status: newStatus };
      }
      return user;
    }));
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const adminCount = users.filter(u => u.role === "Admin" && u.status === "Active").length;
    if (user.role === "Admin" && adminCount <= 1) {
      toast.error("Cannot delete the last active admin user");
      return;
    }

    setDeleteTarget(user);
    setIsDeleteDialogOpen(true);
  };

  const performDelete = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const previous = users;
    setUsers(prev => prev.filter(u => u.id !== userId));
    setDeletingIds(prev => [...prev, userId]);

    try {
      // Move user to archive instead of permanent delete
      const res = await fetch(`/api/archive/users/${userId}/archive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivedBy: 'admin' }) });
      const text = await res.text();
      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (!res.ok) {
        const snippet = text ? text.substring(0, 400) : '';
        throw new Error(`Server returned ${res.status}: ${snippet}`);
      }

      let body: any = {};
      if (contentType.includes('application/json') && text) {
        try { body = JSON.parse(text); } catch (e) { /* ignore */ }
      }

      toast.success(body?.message || 'User moved to archive');
    } catch (err: any) {
      setUsers(previous);
      toast.error(err?.message || 'Failed to move user to archive');
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== userId));
      setDeleteTarget(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const getRoleBadgeColor = (role: string) => {
    return role === "Admin" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleBulkActivate = () => {
    setUsers(users.map(user => 
      selectedUsers.includes(user.id) ? { ...user, status: "Active" as const } : user
    ));
    setSelectedUsers([]);
    toast.success(`${selectedUsers.length} users activated`);
  };

  const handleBulkDeactivate = () => {
    const adminIds = users.filter(u => u.role === "Admin" && u.status === "Active").map(u => u.id);
    const selectedAdmins = selectedUsers.filter(id => adminIds.includes(id));
    
    if (selectedAdmins.length === adminIds.length && adminIds.length > 0) {
      toast.error("Cannot deactivate all admin users");
      return;
    }
    
    setUsers(users.map(user => 
      selectedUsers.includes(user.id) ? { ...user, status: "Inactive" as const } : user
    ));
    setSelectedUsers([]);
    toast.success(`${selectedUsers.length} users deactivated`);
  };

  const handleExportUsers = () => {
    const csvData = [
      ["Name", "Email", "Role", "Status", "Last Login", "Created", "Permissions"],
      ...filteredUsers.map(user => [
        user.name,
        user.email,
        user.role,
        user.status,
        user.lastLogin,
        user.createdAt,
        user.permissions.join("; ")
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("User data exported successfully");
  };

  const handleResetPassword = (user: User) => {
    // Call backend to send password reset email
    (async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/reset`, { method: 'POST' });
        const text = await res.text();
        const contentType = (res.headers.get('content-type') || '').toLowerCase();

        if (!res.ok) {
          const snippet = text ? text.substring(0, 400) : '';
          throw new Error(snippet || `Server returned ${res.status}`);
        }

        let body: any = {};
        if (contentType.includes('application/json') && text) {
          try { body = JSON.parse(text); } catch (e) { /* ignore */ }
        }

        if (body?.previewUrl) {
          // If using Ethereal test account, provide preview link
          toast.success(`Password reset email sent to ${user.email} (preview available)`);
          // show preview URL in console for convenience
          console.info('Password reset preview URL:', body.previewUrl);
          // also show a clickable browser alert (non-blocking) - keep short
          // (UI to show link could be added later)
        } else {
          toast.success(body?.message || `Password reset email sent to ${user.email}`);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to send password reset email');
      }
    })();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-[#358E83] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">User Management</h2>
            <p className="text-white/90 mt-1">Manage system users, roles, and permissions</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30" onClick={fetchUsers} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the billing system with appropriate role and permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@hospital.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Enter a secure password"
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      placeholder="Confirm your password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUser.role} onValueChange={(value: "Admin" | "Cashier") => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Cashier">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="bg-[#358E83] hover:bg-[#2a6f66]" onClick={() => setShowCreateConfirm(true)} disabled={!newUser.name || !newUser.email || !newUser.password || !newUser.confirmPassword}>
                      Create User
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirm Create User?</DialogTitle>
                  <DialogDescription>
                    Review details before creating the user.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Name</span><span className="font-medium">{newUser.name || '-'}</span></div>
                  <div className="flex justify-between"><span>Email</span><span className="font-medium">{newUser.email || '-'}</span></div>
                  <div className="flex justify-between"><span>Role</span><span className="font-medium">{newUser.role}</span></div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateConfirm(false)}>Cancel</Button>
                  <Button className="bg-[#358E83] hover:bg-[#2a6f66]" onClick={() => { setShowCreateConfirm(false); handleCreateUser(); }}>
                    Confirm
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              +1 from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === "Active").length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((users.filter(u => u.status === "Active").length / users.length) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === "Admin").length}</div>
            <p className="text-xs text-muted-foreground">
              Full system access
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cashiers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === "Cashier").length}</div>
            <p className="text-xs text-muted-foreground">
              Billing system access
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Search and filter users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {fetchError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-start justify-between">
                <div className="text-sm text-red-800">{fetchError}</div>
                <div>
                  <Button size="sm" variant="outline" onClick={fetchUsers}>Retry</Button>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Cashier">Cashier</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportUsers}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleBulkActivate}>
                    <UserCheck className="h-4 w-4 mr-1" />
                    Activate
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBulkDeactivate}>
                    <UserX className="h-4 w-4 mr-1" />
                    Deactivate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedUsers([])}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-8 w-8 p-0"
                    >
                      {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectUser(user.id)}
                        className="h-8 w-8 p-0"
                      >
                        {selectedUsers.includes(user.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#358E83] rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{user.lastLogin}</TableCell>
                    <TableCell className="text-sm text-gray-600">{user.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleUserStatus(user.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {user.status === "Active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          {deletingIds.includes(user.id) ? (
                            <DropdownMenuItem className="text-red-600 opacity-70" disabled>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => { setDeleteTarget(user); setIsDeleteDialogOpen(true); }} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move User to Archive?</DialogTitle>
            <DialogDescription>
              Are you sure you want to move this user to the archive? You can restore the user later from the Archive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              {deleteTarget ? (
                <>
                  <div className="font-medium">{deleteTarget.name} ({deleteTarget.email})</div>
                  <div className="text-xs text-gray-500 mt-1">Role: {deleteTarget.role} • Status: {deleteTarget.status}</div>
                </>
              ) : (
                <div className="text-sm">No user selected</div>
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => deleteTarget && performDelete(deleteTarget.id)}>
                  Move to Archive
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={selectedUser.role} 
                  onValueChange={(value: "Admin" | "Cashier") => {
                    const permissions = value === "Admin" 
                      ? rolePermissions.Admin 
                      : rolePermissions.Cashier;
                    setSelectedUser({ ...selectedUser, role: value, permissions });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch 
                    checked={selectedUser.status === "Active"}
                    onCheckedChange={(checked: boolean) => 
                      setSelectedUser({ ...selectedUser, status: checked ? "Active" : "Inactive" })
                    }
                  />
                  <span className="text-sm">{selectedUser.status}</span>
                </div>
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-1">
                  {selectedUser.permissions.map((permission, index) => (
                    <div key={index} className="text-sm text-gray-600 flex items-center">
                      <span className="w-2 h-2 bg-[#358E83] rounded-full mr-2"></span>
                      {permission}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#358E83] hover:bg-[#2a6f66]" onClick={handleUpdateUser}>
                  Update User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
