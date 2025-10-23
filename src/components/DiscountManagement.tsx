import { useState, useEffect } from "react";
import { Tag, Plus, Search, Edit, Trash2, Eye, Percent, Calendar, Users, Gift, ToggleLeft, ToggleRight, User, Calculator, FileCheck, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { toast } from "sonner@2.0.3";
import { DiscountManagementService, Discount, Promotion } from "../services/discountManagementService";

interface DiscountManagementProps {
  onNavigateToView: (view: string) => void;
}

const DISCOUNT_CATEGORIES = [
  { value: 'senior', label: 'Senior Citizen', color: 'bg-blue-100 text-blue-800' },
  { value: 'pwd', label: 'PWD', color: 'bg-green-100 text-green-800' },
  { value: 'employee', label: 'Employee', color: 'bg-purple-100 text-purple-800' },
  { value: 'insurance', label: 'Insurance', color: 'bg-orange-100 text-orange-800' },
  { value: 'promotional', label: 'Promotional', color: 'bg-pink-100 text-pink-800' },
  { value: 'seasonal', label: 'Seasonal', color: 'bg-yellow-100 text-yellow-800' }
];

const HOSPITAL_SERVICES = [
  "General Consultation", "Specialist Consultation", "Emergency Consultation",
  "Blood Test", "X-Ray", "CT Scan", "MRI", "Ultrasound", "ECG",
  "Minor Surgery", "Major Surgery", "Physical Therapy", "Pharmacy Services"
];

export function DiscountManagement({ onNavigateToView }: DiscountManagementProps) {
  const [showCreateDiscount, setShowCreateDiscount] = useState(false);
  const [showCreatePromotion, setShowCreatePromotion] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);
  const [showDeletePromoDialog, setShowDeletePromoDialog] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<string | null>(null);
  const [isCreatingDiscount, setIsCreatingDiscount] = useState(false);
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false);
  
  // Load discounts and promotions from service
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  // Load data on mount and when changes occur
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setDiscounts(DiscountManagementService.getAllDiscounts());
    setPromotions(DiscountManagementService.getAllPromotions());
  };

  const [newDiscount, setNewDiscount] = useState({
    code: "",
    name: "",
    type: "percentage" as 'percentage' | 'fixed' | 'service',
    value: 0,
    description: "",
    category: "",
    startDate: "",
    endDate: "",
    conditions: ""
  });

  const [newPromotion, setNewPromotion] = useState({
    title: "",
    description: "",
    discountCode: "",
    validFrom: "",
    validTo: "",
    targetAudience: ""
  });

  const toggleDiscountStatus = (id: string) => {
    try {
      DiscountManagementService.toggleDiscountStatus(id);
      loadData();
      toast.success('Discount status updated');
    } catch (error) {
      toast.error('Failed to update discount status');
    }
  };

  const handleCreateDiscount = () => {
    if (!newDiscount.code || !newDiscount.name || !newDiscount.category || !newDiscount.startDate || !newDiscount.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreatingDiscount(true);

    try {
      const discount = DiscountManagementService.createDiscount({
        code: newDiscount.code,
        name: newDiscount.name,
        type: newDiscount.type,
        value: newDiscount.value,
        description: newDiscount.description,
        category: newDiscount.category as any,
        startDate: newDiscount.startDate,
        endDate: newDiscount.endDate,
        isActive: true,
        conditions: newDiscount.conditions
      }, 'Admin');

      loadData();
      
      // Reset form
      setNewDiscount({
        code: "",
        name: "",
        type: "percentage",
        value: 0,
        description: "",
        category: "",
        startDate: "",
        endDate: "",
        conditions: ""
      });
      
      setShowCreateDiscount(false);
      toast.success(`Discount code "${discount.code}" created successfully!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create discount');
    } finally {
      setIsCreatingDiscount(false);
    }
  };

  const handleDeleteDiscount = (id: string) => {
    setDiscountToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDiscount = () => {
    if (discountToDelete) {
      try {
        DiscountManagementService.deleteDiscount(discountToDelete);
        loadData();
        toast.success('Discount deleted successfully');
      } catch (error) {
        toast.error('Failed to delete discount');
      }
      setDiscountToDelete(null);
    }
    setShowDeleteDialog(false);
  };

  const handleCreatePromotion = () => {
    if (!newPromotion.title || !newPromotion.discountCode || !newPromotion.validFrom || !newPromotion.validTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreatingPromotion(true);

    try {
      DiscountManagementService.createPromotion({
        title: newPromotion.title,
        description: newPromotion.description,
        discountCode: newPromotion.discountCode,
        validFrom: newPromotion.validFrom,
        validTo: newPromotion.validTo,
        isActive: true,
        targetAudience: newPromotion.targetAudience
      }, 'Admin');

      loadData();
      
      // Reset form
      setNewPromotion({
        title: "",
        description: "",
        discountCode: "",
        validFrom: "",
        validTo: "",
        targetAudience: ""
      });
      
      setShowCreatePromotion(false);
      toast.success('Promotion created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create promotion');
    } finally {
      setIsCreatingPromotion(false);
    }
  };

  const handleDeletePromotion = (id: string) => {
    setPromotionToDelete(id);
    setShowDeletePromoDialog(true);
  };

  const confirmDeletePromotion = () => {
    if (promotionToDelete) {
      try {
        DiscountManagementService.deletePromotion(promotionToDelete);
        loadData();
        toast.success('Promotion deleted successfully');
      } catch (error) {
        toast.error('Failed to delete promotion');
      }
      setPromotionToDelete(null);
    }
    setShowDeletePromoDialog(false);
  };

  const togglePromotionStatus = (id: string) => {
    try {
      DiscountManagementService.togglePromotionStatus(id);
      loadData();
      toast.success('Promotion status updated');
    } catch (error) {
      toast.error('Failed to update promotion status');
    }
  };

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = 
      discount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || discount.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeColor = (category: string) => {
    const cat = DISCOUNT_CATEGORIES.find(c => c.value === category);
    return cat ? cat.color : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Discounts</p>
                <p className="text-2xl font-bold">{discounts.length}</p>
              </div>
              <Tag className="text-[#358E83]" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Discounts</p>
                <p className="text-2xl font-bold text-green-600">{discounts.filter(d => d.isActive).length}</p>
              </div>
              <ToggleRight className="text-green-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold">{discounts.reduce((sum, d) => sum + d.usageCount, 0)}</p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Promotions</p>
                <p className="text-2xl font-bold">{promotions.length}</p>
              </div>
              <Gift className="text-purple-600" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="discounts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
          <TabsTrigger value="promotions">Promotional Campaigns</TabsTrigger>
        </TabsList>

        {/* Discounts Tab */}
        <TabsContent value="discounts" className="space-y-4">
          <Card>
            <CardHeader className="bg-[#358E83] text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Tag className="mr-2" size={20} />
                    Discount Management
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Create, manage, and track discount codes
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowCreateDiscount(true)}
                  className="bg-white text-[#358E83] hover:bg-gray-100"
                >
                  <Plus className="mr-2" size={16} />
                  Create Discount
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search and Filter */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search discounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {DISCOUNT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discounts List */}
              <div className="space-y-3">
                {filteredDiscounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="mx-auto mb-3 opacity-50" size={48} />
                    <p>No discounts found</p>
                  </div>
                ) : (
                  filteredDiscounts.map(discount => (
                    <div
                      key={discount.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold">{discount.name}</h4>
                            <Badge className={getCategoryBadgeColor(discount.category)}>
                              {DISCOUNT_CATEGORIES.find(c => c.value === discount.category)?.label}
                            </Badge>
                            {discount.isActive ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-2">
                            <div>
                              <p className="text-gray-500">Code</p>
                              <p className="font-mono font-semibold">{discount.code}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Discount</p>
                              <p className="font-semibold">
                                {discount.type === 'percentage' ? `${discount.value}%` : `₱${discount.value}`}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Usage</p>
                              <p className="font-semibold">{discount.usageCount} times</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Valid Until</p>
                              <p className="font-semibold">{new Date(discount.endDate).toLocaleDateString('en-PH')}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{discount.description}</p>
                          {discount.conditions && (
                            <p className="text-xs text-gray-500 mt-1 italic">{discount.conditions}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Switch
                            checked={discount.isActive}
                            onCheckedChange={() => toggleDiscountStatus(discount.id)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDiscount(discount.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-4">
          <Card>
            <CardHeader className="bg-[#358E83] text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Gift className="mr-2" size={20} />
                    Promotional Campaigns
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Manage marketing promotions and campaigns
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowCreatePromotion(true)}
                  className="bg-white text-[#358E83] hover:bg-gray-100"
                >
                  <Plus className="mr-2" size={16} />
                  Create Promotion
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {promotions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Gift className="mx-auto mb-3 opacity-50" size={48} />
                    <p>No promotions found</p>
                  </div>
                ) : (
                  promotions.map(promo => (
                    <div
                      key={promo.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold">{promo.title}</h4>
                            {promo.isActive ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{promo.description}</p>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500">Discount Code</p>
                              <p className="font-mono font-semibold">{promo.discountCode}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Valid Period</p>
                              <p className="font-semibold">
                                {new Date(promo.validFrom).toLocaleDateString('en-PH')} - {new Date(promo.validTo).toLocaleDateString('en-PH')}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Target Audience</p>
                              <p className="font-semibold">{promo.targetAudience}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Switch
                            checked={promo.isActive}
                            onCheckedChange={() => togglePromotionStatus(promo.id)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePromotion(promo.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Discount Dialog */}
      <Dialog open={showCreateDiscount} onOpenChange={setShowCreateDiscount}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Discount</DialogTitle>
            <DialogDescription>
              Set up a new discount code for patients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-code">Discount Code *</Label>
                <Input
                  id="discount-code"
                  placeholder="e.g., SENIOR20"
                  value={newDiscount.code}
                  onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-name">Discount Name *</Label>
                <Input
                  id="discount-name"
                  placeholder="e.g., Senior Citizen Discount"
                  value={newDiscount.name}
                  onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-type">Type *</Label>
                <Select 
                  value={newDiscount.type} 
                  onValueChange={(value: any) => setNewDiscount({ ...newDiscount, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-value">Value *</Label>
                <Input
                  id="discount-value"
                  type="number"
                  placeholder={newDiscount.type === 'percentage' ? '20' : '500'}
                  value={newDiscount.value || ''}
                  onChange={(e) => setNewDiscount({ ...newDiscount, value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-category">Category *</Label>
                <Select 
                  value={newDiscount.category} 
                  onValueChange={(value) => setNewDiscount({ ...newDiscount, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-description">Description</Label>
              <Textarea
                id="discount-description"
                placeholder="Describe the discount..."
                value={newDiscount.description}
                onChange={(e) => setNewDiscount({ ...newDiscount, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newDiscount.startDate}
                  onChange={(e) => setNewDiscount({ ...newDiscount, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newDiscount.endDate}
                  onChange={(e) => setNewDiscount({ ...newDiscount, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditions">Terms and Conditions</Label>
              <Textarea
                id="conditions"
                placeholder="Enter any conditions or restrictions..."
                value={newDiscount.conditions}
                onChange={(e) => setNewDiscount({ ...newDiscount, conditions: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCreateDiscount(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDiscount}
                disabled={isCreatingDiscount}
                className="bg-[#358E83] hover:bg-[#358E83]/90"
              >
                {isCreatingDiscount ? 'Creating...' : 'Create Discount'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Promotion Dialog */}
      <Dialog open={showCreatePromotion} onOpenChange={setShowCreatePromotion}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>
              Set up a promotional campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promo-title">Promotion Title *</Label>
              <Input
                id="promo-title"
                placeholder="e.g., New Year Health Package"
                value={newPromotion.title}
                onChange={(e) => setNewPromotion({ ...newPromotion, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-description">Description *</Label>
              <Textarea
                id="promo-description"
                placeholder="Describe the promotion..."
                value={newPromotion.description}
                onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-code">Discount Code *</Label>
                <Input
                  id="promo-code"
                  placeholder="e.g., NEWYEAR2025"
                  value={newPromotion.discountCode}
                  onChange={(e) => setNewPromotion({ ...newPromotion, discountCode: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-audience">Target Audience</Label>
                <Input
                  id="target-audience"
                  placeholder="e.g., General Public"
                  value={newPromotion.targetAudience}
                  onChange={(e) => setNewPromotion({ ...newPromotion, targetAudience: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-start">Valid From *</Label>
                <Input
                  id="promo-start"
                  type="date"
                  value={newPromotion.validFrom}
                  onChange={(e) => setNewPromotion({ ...newPromotion, validFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-end">Valid To *</Label>
                <Input
                  id="promo-end"
                  type="date"
                  value={newPromotion.validTo}
                  onChange={(e) => setNewPromotion({ ...newPromotion, validTo: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCreatePromotion(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePromotion}
                disabled={isCreatingPromotion}
                className="bg-[#358E83] hover:bg-[#358E83]/90"
              >
                {isCreatingPromotion ? 'Creating...' : 'Create Promotion'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Discount Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this discount code. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDiscount} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Promotion Confirmation */}
      <AlertDialog open={showDeletePromoDialog} onOpenChange={setShowDeletePromoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this promotional campaign. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePromotion} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
