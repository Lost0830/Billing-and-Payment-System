import { useState } from "react";
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
  Send,
} from "lucide-react";
import { toast } from "sonner@2.0.3";

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

  // Mock user data
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Dr. Maria Santos",
      email: "admin@hospital.com",
      role: "Admin",
      status: "Active",
      lastLogin: "2024-01-15 09:30 AM",
      createdAt: "2023-12-01",
      permissions: ["Full Access", "User Management", "System Settings"]
    },
    {
      id: "2",
      name: "Ana Cruz",
      email: "billing.cashier@hospital.com",
      role: "Cashier",
      status: "Active",
      lastLogin: "2024-01-15 08:45 AM",
      createdAt: "2023-12-15",
      permissions: ["Billing Management", "Invoice Generation", "Payment Processing"]
    },
    {
      id: "3",
      name: "Roberto Dela Cruz",
      email: "cashier@hospital.com",
      role: "Cashier",
      status: "Active",
      lastLogin: "2024-01-14 05:20 PM",
      createdAt: "2024-01-02",
      permissions: ["Billing Management", "Invoice Generation", "Payment Processing", "Reports"]
    },
    {
      id: "4",
      name: "Juan Lopez",
      email: "cashier2@hospital.com",
      role: "Cashier",
      status: "Inactive",
      lastLogin: "2024-01-10 02:15 PM",
      createdAt: "2024-01-08",
      permissions: ["Billing Management", "Invoice Generation"]
    }
  ]);

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

  const handleCreateUser = () => {
    if (!newUser.name) {
      toast.error("Name is required");
      return;
    }

    if (!newUser.email) {
      toast.error("Email is required");
      return;
    }

    if (!newUser.password) {
      toast.error("Password is required");
      return;
    }

    if (newUser.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const userExists = users.some(user => user.email.toLowerCase() === newUser.email.toLowerCase());
    if (userExists) {
      toast.error("User with this email already exists");
      return;
    }

    const permissions = newUser.role === "Admin" 
      ? rolePermissions.Admin 
      : [...rolePermissions.Cashier];

    const user: User = {
      id: Date.now().toString(), // Use timestamp for unique ID
      name: newUser.name,
      email: newUser.email.toLowerCase(),
      role: newUser.role,
      status: "Active",
      lastLogin: "Never",
      createdAt: new Date().toISOString().split('T')[0],
      permissions
    };

    setUsers([...users, user]);
    setNewUser({ name: "", email: "", password: "", confirmPassword: "", role: "Cashier", permissions: [] });
    setIsCreateDialogOpen(false);
    toast.success(`User ${newUser.name} created successfully with secure password`);
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
      if (editUserPassword.newPassword.length < 8) {
        toast.error("Password must be at least 8 characters long");
        return;
      }
      if (editUserPassword.newPassword !== editUserPassword.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setUsers(users.map(user => 
      user.id === selectedUser.id ? selectedUser : user
    ));
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    setEditUserPassword({ newPassword: "", confirmPassword: "" });
    
    const message = editUserPassword.newPassword 
      ? "User updated successfully with new password" 
      : "User updated successfully";
    toast.success(message);
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
    if (user) {
      // Prevent deleting the last admin
      const adminCount = users.filter(u => u.role === "Admin" && u.status === "Active").length;
      if (user.role === "Admin" && adminCount <= 1) {
        toast.error("Cannot delete the last active admin user");
        return;
      }
      
      setUsers(users.filter(u => u.id !== userId));
      toast.success(`User ${user.email} deleted successfully`);
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
    // Simulate sending password reset email
    toast.success(`Password reset email sent to ${user.email}`);
  };

  const handleSendInvitation = (user: User) => {
    // Simulate sending invitation email
    toast.success(`Invitation email sent to ${user.email}`);
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
                <Button className="bg-[#358E83] hover:bg-[#2a6f66]" onClick={handleCreateUser}>
                  Create User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                          <DropdownMenuItem onClick={() => handleSendInvitation(user)}>
                            <Send className="mr-2 h-4 w-4" />
                            Send Invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
                                handleDeleteUser(user.id);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
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
                    onCheckedChange={(checked) => 
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