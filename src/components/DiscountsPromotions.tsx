import { useState } from "react";
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

interface DiscountsPromotionsProps {
  onNavigateToView: (view: string) => void;
}

interface Discount {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed' | 'service';
  value: number;
  description: string;
  category: 'senior' | 'pwd' | 'employee' | 'insurance' | 'promotional' | 'seasonal';
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  applicableServices?: string[];
  conditions?: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  discountCode: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  targetAudience: string;
  bannerImage?: string;
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

const PREDEFINED_PATIENTS = [
  { id: "P001", name: "Maria Santos", fullDisplay: "Maria Santos (P001)" },
  { id: "P002", name: "Juan Dela Cruz", fullDisplay: "Juan Dela Cruz (P002)" },
  { id: "P003", name: "Anna Reyes", fullDisplay: "Anna Reyes (P003)" },
  { id: "P004", name: "Roberto Cruz", fullDisplay: "Roberto Cruz (P004)" },
  { id: "P005", name: "Carmen Flores", fullDisplay: "Carmen Flores (P005)" },
  { id: "P006", name: "Miguel Torres", fullDisplay: "Miguel Torres (P006)" },
  { id: "P007", name: "Sofia Garcia", fullDisplay: "Sofia Garcia (P007)" },
  { id: "P008", name: "Pedro Gonzales", fullDisplay: "Pedro Gonzales (P008)" },
  { id: "P009", name: "Elena Ramirez", fullDisplay: "Elena Ramirez (P009)" },
  { id: "P010", name: "Carlos Mendoza", fullDisplay: "Carlos Mendoza (P010)" }
];

interface DiscountApplication {
  id: string;
  discountCode: string;
  patientId: string;
  patientName: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedDate: string;
  invoiceNumber: string;
  status: 'pending' | 'approved' | 'applied';
}

export function DiscountsPromotions({ onNavigateToView }: DiscountsPromotionsProps) {
  const [showCreateDiscount, setShowCreateDiscount] = useState(false);
  const [showCreatePromotion, setShowCreatePromotion] = useState(false);
  const [showApplyDiscount, setShowApplyDiscount] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);
  const [showDeletePromoDialog, setShowDeletePromoDialog] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<string | null>(null);
  const [isCreatingDiscount, setIsCreatingDiscount] = useState(false);
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false);
  
  // Sample discounts data
  const [discounts, setDiscounts] = useState<Discount[]>([
    {
      id: "1",
      code: "SENIOR20",
      name: "Senior Citizen Discount",
      type: "percentage",
      value: 20,
      description: "20% discount for senior citizens (60 years and above)",
      category: "senior",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      isActive: true,
      usageCount: 145,
      conditions: "Valid ID required. Cannot be combined with other offers."
    },
    {
      id: "2",
      code: "PWD20",
      name: "PWD Discount",
      type: "percentage",
      value: 20,
      description: "20% discount for Persons with Disabilities",
      category: "pwd",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      isActive: true,
      usageCount: 89,
      conditions: "Valid PWD ID required."
    },
    {
      id: "3",
      code: "EMP15",
      name: "Employee Discount",
      type: "percentage",
      value: 15,
      description: "15% discount for hospital employees and their families",
      category: "employee",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      isActive: true,
      usageCount: 67,
      conditions: "Valid employee ID required."
    },
    {
      id: "4",
      code: "NEWYEAR2025",
      name: "New Year Health Check",
      type: "percentage",
      value: 30,
      description: "30% off all diagnostic tests for January",
      category: "seasonal",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
      isActive: true,
      usageCount: 23,
      maxUsage: 100,
      applicableServices: ["Blood Test", "X-Ray", "ECG", "Ultrasound"]
    }
  ]);

  // Sample discount applications
  const [discountApplications, setDiscountApplications] = useState<DiscountApplication[]>([
    {
      id: "app_001",
      discountCode: "SENIOR20",
      patientId: "P001",
      patientName: "Maria Santos",
      originalAmount: 5000,
      discountAmount: 1000,
      finalAmount: 4000,
      appliedDate: "2025-01-05",
      invoiceNumber: "INV-2025-001",
      status: "applied"
    },
    {
      id: "app_002", 
      discountCode: "PWD20",
      patientId: "P003",
      patientName: "Anna Reyes",
      originalAmount: 3500,
      discountAmount: 700,
      finalAmount: 2800,
      appliedDate: "2025-01-04",
      invoiceNumber: "INV-2025-003",
      status: "applied"
    }
  ]);

  // Sample promotions data
  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: "1",
      title: "New Year Health Package",
      description: "Start your year right with our comprehensive health check package at 30% off!",
      discountCode: "NEWYEAR2025",
      validFrom: "2025-01-01",
      validTo: "2025-01-31",
      isActive: true,
      targetAudience: "General Public"
    },
    {
      id: "2",
      title: "Valentine's Couple Checkup",
      description: "Bring your loved one for a health screening and save 25% on both consultations.",
      discountCode: "VALENTINE25",
      validFrom: "2025-02-01",
      validTo: "2025-02-28",
      isActive: false,
      targetAudience: "Couples"
    }
  ]);

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

  const [discountApplication, setDiscountApplication] = useState({
    patientId: "",
    discountCode: "",
    originalAmount: "",
    invoiceNumber: ""
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
    setDiscounts(discounts.map(discount => 
      discount.id === id 
        ? { ...discount, isActive: !discount.isActive }
        : discount
    ));
  };

  const handleCreateDiscount = () => {
    if (!newDiscount.code || !newDiscount.name || !newDiscount.category || !newDiscount.startDate || !newDiscount.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const discount: Discount = {
      id: Date.now().toString(),
      code: newDiscount.code,
      name: newDiscount.name,
      type: newDiscount.type,
      value: newDiscount.value,
      description: newDiscount.description,
      category: newDiscount.category as any,
      startDate: newDiscount.startDate,
      endDate: newDiscount.endDate,
      isActive: true,
      usageCount: 0,
      conditions: newDiscount.conditions
    };

    setDiscounts([...discounts, discount]);
    
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
    alert(`Discount code "${discount.code}" created successfully!`);
  };

  const handleDeleteDiscount = (id: string) => {
    setDiscountToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDiscount = () => {
    if (discountToDelete) {
      setDiscounts(discounts.filter(d => d.id !== discountToDelete));
      toast.success('Discount deleted successfully');
      setShowDeleteDialog(false);
      setDiscountToDelete(null);
    }
  };

  const handleApplyDiscount = () => {
    if (!discountApplication.patientId || !discountApplication.discountCode || !discountApplication.originalAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const discount = discounts.find(d => d.code === discountApplication.discountCode && d.isActive);
    if (!discount) {
      toast.error('Invalid or inactive discount code');
      return;
    }

    const originalAmount = parseFloat(discountApplication.originalAmount);
    if (originalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const patient = PREDEFINED_PATIENTS.find(p => p.id === discountApplication.patientId);
    if (!patient) {
      toast.error('Please select a valid patient');
      return;
    }

    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (originalAmount * discount.value) / 100;
    } else if (discount.type === 'fixed') {
      discountAmount = Math.min(discount.value, originalAmount);
    }

    const application: DiscountApplication = {
      id: Date.now().toString(),
      discountCode: discount.code,
      patientId: patient.id,
      patientName: patient.name,
      originalAmount,
      discountAmount,
      finalAmount: originalAmount - discountAmount,
      appliedDate: new Date().toISOString().split('T')[0],
      invoiceNumber: discountApplication.invoiceNumber || `INV-${Date.now()}`,
      status: 'applied'
    };

    setDiscountApplications([...discountApplications, application]);
    
    // Update discount usage count
    setDiscounts(discounts.map(d => 
      d.id === discount.id 
        ? { ...d, usageCount: d.usageCount + 1 }
        : d
    ));

    // Reset form
    setDiscountApplication({
      patientId: "",
      discountCode: "",
      originalAmount: "",
      invoiceNumber: ""
    });

    setShowApplyDiscount(false);
    toast.success(`Discount applied successfully! Saved ₱${discountAmount.toLocaleString()}`);
  };

  const calculateDiscountPreview = () => {
    if (!discountApplication.discountCode || !discountApplication.originalAmount) return null;
    
    const discount = discounts.find(d => d.code === discountApplication.discountCode && d.isActive);
    if (!discount) return null;
    
    const originalAmount = parseFloat(discountApplication.originalAmount);
    if (originalAmount <= 0) return null;
    
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (originalAmount * discount.value) / 100;
    } else if (discount.type === 'fixed') {
      discountAmount = Math.min(discount.value, originalAmount);
    }
    
    return {
      original: originalAmount,
      discount: discountAmount,
      final: originalAmount - discountAmount
    };
  };

  const handleCreatePromotion = async () => {
    if (!newPromotion.title || !newPromotion.discountCode || !newPromotion.validFrom || !newPromotion.validTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreatingPromotion(true);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const promotion: Promotion = {
      id: Date.now().toString(),
      title: newPromotion.title,
      description: newPromotion.description,
      discountCode: newPromotion.discountCode,
      validFrom: newPromotion.validFrom,
      validTo: newPromotion.validTo,
      isActive: new Date(newPromotion.validFrom) <= new Date() && new Date(newPromotion.validTo) >= new Date(),
      targetAudience: newPromotion.targetAudience
    };

    setPromotions([...promotions, promotion]);
    
    // Reset form
    setNewPromotion({
      title: "",
      description: "",
      discountCode: "",
      validFrom: "",
      validTo: "",
      targetAudience: ""
    });
    
    setIsCreatingPromotion(false);
    setShowCreatePromotion(false);
    toast.success(`Promotion "${promotion.title}" created successfully!`);
  };

  const handleDeletePromotion = (id: string) => {
    setPromotionToDelete(id);
    setShowDeletePromoDialog(true);
  };

  const confirmDeletePromotion = () => {
    if (promotionToDelete) {
      setPromotions(promotions.filter(p => p.id !== promotionToDelete));
      toast.success('Promotion deleted successfully');
      setShowDeletePromoDialog(false);
      setPromotionToDelete(null);
    }
  };

  const getCategoryInfo = (category: string) => {
    return DISCOUNT_CATEGORIES.find(c => c.value === category) || DISCOUNT_CATEGORIES[0];
  };

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discount.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || discount.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getDiscountDisplay = (discount: Discount) => {
    switch (discount.type) {
      case 'percentage':
        return `${discount.value}%`;
      case 'fixed':
        return `₱${discount.value.toLocaleString()}`;
      case 'service':
        return 'Service Specific';
      default:
        return discount.value.toString();
    }
  };

  const activeDiscounts = discounts.filter(d => d.isActive).length;
  const totalUsage = discounts.reduce((sum, d) => sum + d.usageCount, 0);
  const averageDiscount = discounts.reduce((sum, d) => sum + (d.type === 'percentage' ? d.value : 0), 0) / discounts.filter(d => d.type === 'percentage').length;
  const totalSavings = discountApplications.reduce((sum, app) => sum + app.discountAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowApplyDiscount(true)}
            variant="outline"
            className="border-[#358E83] text-[#358E83] hover:bg-[#358E83] hover:text-white"
          >
            <Calculator className="mr-2" size={16} />
            Apply Discount
          </Button>
          <Button 
            onClick={() => setShowCreatePromotion(true)}
            variant="outline"
            className="border-[#E94D61] text-[#E94D61] hover:bg-[#E94D61] hover:text-white"
          >
            <Gift className="mr-2" size={16} />
            Create Promotion
          </Button>
          <Button 
            onClick={() => setShowCreateDiscount(true)}
            className="bg-[#E94D61] hover:bg-[#E94D61]/90 text-white"
          >
            <Plus className="mr-2" size={16} />
            Create Discount
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Discounts</p>
                <p className="text-2xl font-bold text-green-600">{activeDiscounts}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Tag className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold text-blue-600">{totalUsage}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="text-blue-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Discount</p>
                <p className="text-2xl font-bold text-purple-600">{averageDiscount.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Percent className="text-purple-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Savings</p>
                <p className="text-2xl font-bold text-green-600">₱{totalSavings.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Calculator className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Promos</p>
                <p className="text-2xl font-bold text-orange-600">{promotions.filter(p => p.isActive).length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Gift className="text-orange-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apply Discount Dialog */}
      <Dialog open={showApplyDiscount} onOpenChange={setShowApplyDiscount}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="text-[#358E83]" size={20} />
              Apply Discount
            </DialogTitle>
            <DialogDescription>
              Apply a discount code to a patient's bill
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="patientSelect">Select Patient</Label>
              <Select 
                value={discountApplication.patientId} 
                onValueChange={(value) => setDiscountApplication({...discountApplication, patientId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_PATIENTS.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.fullDisplay}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discountCodeSelect">Discount Code</Label>
              <Select 
                value={discountApplication.discountCode} 
                onValueChange={(value) => setDiscountApplication({...discountApplication, discountCode: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select discount code" />
                </SelectTrigger>
                <SelectContent>
                  {discounts.filter(d => d.isActive).map((discount) => (
                    <SelectItem key={discount.code} value={discount.code}>
                      {discount.code} - {getDiscountDisplay(discount)} OFF
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="originalAmount">Original Amount (₱)</Label>
                <Input
                  id="originalAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountApplication.originalAmount}
                  onChange={(e) => setDiscountApplication({...discountApplication, originalAmount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="invoiceNumberApply">Invoice Number</Label>
                <Input
                  id="invoiceNumberApply"
                  value={discountApplication.invoiceNumber}
                  onChange={(e) => setDiscountApplication({...discountApplication, invoiceNumber: e.target.value})}
                  placeholder="INV-XXXX-XXX"
                />
              </div>
            </div>

            {(() => {
              const preview = calculateDiscountPreview();
              return preview ? (
                <div className="bg-[#358E83]/10 p-4 rounded-lg">
                  <h4 className="font-medium text-[#358E83] mb-2">Discount Preview:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Original Amount:</span>
                      <span>₱{preview.original.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-₱{preview.discount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-1">
                      <span>Final Amount:</span>
                      <span>₱{preview.final.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="flex gap-3 pt-4">
              <Button 
                className="bg-[#358E83] hover:bg-[#358E83]/90 flex-1"
                onClick={handleApplyDiscount}
              >
                Apply Discount
              </Button>
              <Button variant="outline" onClick={() => setShowApplyDiscount(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Promotion Form */}
      {showCreatePromotion && (
        <Card>
          <CardHeader className="bg-[#E94D61] text-white">
            <CardTitle className="flex items-center">
              <Gift className="mr-2" size={20} />
              Create New Promotion
            </CardTitle>
            <CardDescription className="text-white/80">
              Set up a new promotional campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promotionTitle">Promotion Title</Label>
                <Input
                  id="promotionTitle"
                  value={newPromotion.title}
                  onChange={(e) => setNewPromotion({...newPromotion, title: e.target.value})}
                  placeholder="e.g., New Year Health Package"
                />
              </div>
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input
                  id="targetAudience"
                  value={newPromotion.targetAudience}
                  onChange={(e) => setNewPromotion({...newPromotion, targetAudience: e.target.value})}
                  placeholder="e.g., General Public, Couples"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="promotionDescription">Description</Label>
              <Textarea
                id="promotionDescription"
                value={newPromotion.description}
                onChange={(e) => setNewPromotion({...newPromotion, description: e.target.value})}
                placeholder="Describe the promotional offer and its benefits"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="promotionDiscountCode">Associated Discount Code</Label>
                <Select 
                  value={newPromotion.discountCode} 
                  onValueChange={(value) => setNewPromotion({...newPromotion, discountCode: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select discount code" />
                  </SelectTrigger>
                  <SelectContent>
                    {discounts.map((discount) => (
                      <SelectItem key={discount.code} value={discount.code}>
                        {discount.code} - {getDiscountDisplay(discount)} OFF
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="promotionValidFrom">Valid From</Label>
                <Input
                  id="promotionValidFrom"
                  type="date"
                  value={newPromotion.validFrom}
                  onChange={(e) => setNewPromotion({...newPromotion, validFrom: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="promotionValidTo">Valid To</Label>
                <Input
                  id="promotionValidTo"
                  type="date"
                  value={newPromotion.validTo}
                  onChange={(e) => setNewPromotion({...newPromotion, validTo: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                className="bg-[#E94D61] hover:bg-[#E94D61]/90"
                onClick={handleCreatePromotion}
              >
                Create Promotion
              </Button>
              <Button variant="outline" onClick={() => setShowCreatePromotion(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Discount Form */}
      {showCreateDiscount && (
        <Card>
          <CardHeader className="bg-[#358E83] text-white">
            <CardTitle className="flex items-center">
              <Tag className="mr-2" size={20} />
              Create New Discount
            </CardTitle>
            <CardDescription className="text-white/80">
              Set up a new discount code for patients
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountCode">Discount Code</Label>
                <Input
                  id="discountCode"
                  value={newDiscount.code}
                  onChange={(e) => setNewDiscount({...newDiscount, code: e.target.value.toUpperCase()})}
                  placeholder="e.g., SENIOR20, PWD15"
                />
              </div>
              <div>
                <Label htmlFor="discountName">Discount Name</Label>
                <Input
                  id="discountName"
                  value={newDiscount.name}
                  onChange={(e) => setNewDiscount({...newDiscount, name: e.target.value})}
                  placeholder="e.g., Senior Citizen Discount"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="discountCategory">Category</Label>
                <Select value={newDiscount.category} onValueChange={(value) => setNewDiscount({...newDiscount, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discountType">Discount Type</Label>
                <Select value={newDiscount.type} onValueChange={(value: 'percentage' | 'fixed' | 'service') => setNewDiscount({...newDiscount, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                    <SelectItem value="service">Service Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discountValue">
                  {newDiscount.type === 'percentage' ? 'Percentage (%)' : 
                   newDiscount.type === 'fixed' ? 'Amount (₱)' : 'Value'}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  max={newDiscount.type === 'percentage' ? "100" : undefined}
                  value={newDiscount.value}
                  onChange={(e) => setNewDiscount({...newDiscount, value: parseFloat(e.target.value) || 0})}
                  placeholder={newDiscount.type === 'percentage' ? '20' : '1000'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newDiscount.startDate}
                  onChange={(e) => setNewDiscount({...newDiscount, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newDiscount.endDate}
                  onChange={(e) => setNewDiscount({...newDiscount, endDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newDiscount.description}
                onChange={(e) => setNewDiscount({...newDiscount, description: e.target.value})}
                placeholder="Describe the discount and its purpose"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="conditions">Terms & Conditions</Label>
              <Textarea
                id="conditions"
                value={newDiscount.conditions}
                onChange={(e) => setNewDiscount({...newDiscount, conditions: e.target.value})}
                placeholder="List any conditions or requirements for this discount"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                className="bg-[#358E83] hover:bg-[#358E83]/90"
                onClick={handleCreateDiscount}
              >
                Create Discount
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDiscount(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="discounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="discounts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Discount Codes</CardTitle>
                  <CardDescription>Manage available discount codes and their usage</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border rounded-lg px-3 py-2">
                    <Search className="mr-2 text-gray-400" size={16} />
                    <Input 
                      placeholder="Search discounts..." 
                      className="border-0 p-0 focus-visible:ring-0"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {DISCOUNT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredDiscounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="mx-auto mb-4 text-gray-400" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No discounts found</h3>
                    <p className="text-gray-600">
                      {searchTerm || selectedCategory !== 'all' 
                        ? 'Try adjusting your search criteria or filters.' 
                        : 'Create your first discount code to get started.'
                      }
                    </p>
                  </div>
                ) : (
                  filteredDiscounts.map((discount) => {
                  const categoryInfo = getCategoryInfo(discount.category);
                  return (
                    <div key={discount.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-[#358E83]/10 rounded-lg">
                            <Tag className="text-[#358E83]" size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{discount.code}</h3>
                              <Badge className={categoryInfo.color}>
                                {categoryInfo.label}
                              </Badge>
                              <Badge variant="outline" className="font-bold">
                                {getDiscountDisplay(discount)} OFF
                              </Badge>
                              {discount.isActive ? (
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{discount.name}</h4>
                            <p className="text-sm text-gray-600 mb-2">{discount.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>{new Date(discount.startDate).toLocaleDateString()} - {new Date(discount.endDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users size={12} />
                                <span>Used {discount.usageCount} times</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`toggle-${discount.id}`} className="text-sm">
                              {discount.isActive ? 'Active' : 'Inactive'}
                            </Label>
                            <Switch
                              id={`toggle-${discount.id}`}
                              checked={discount.isActive}
                              onCheckedChange={() => toggleDiscountStatus(discount.id)}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye size={16} />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-800"
                              onClick={() => handleDeleteDiscount(discount.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Discount Applications</CardTitle>
                  <CardDescription>Track applied discounts and patient savings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {discountApplications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileCheck className="mx-auto mb-4 text-gray-400" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No discount applications</h3>
                    <p className="text-gray-600">Start applying discounts to patient bills to see them here.</p>
                  </div>
                ) : (
                  discountApplications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-[#358E83]/10 rounded-lg">
                            <Calculator className="text-[#358E83]" size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{application.discountCode}</h3>
                              <Badge className="bg-green-100 text-green-800">Applied</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <User size={14} />
                                <span>{application.patientName} ({application.patientId})</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>{new Date(application.appliedDate).toLocaleDateString()}</span>
                              </div>
                              <Badge variant="outline">{application.invoiceNumber}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Original:</span>
                                <div className="font-medium">₱{application.originalAmount.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Discount:</span>
                                <div className="font-medium text-green-600">-₱{application.discountAmount.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Final:</span>
                                <div className="font-bold">₱{application.finalAmount.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye size={16} />
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

        <TabsContent value="promotions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Promotions</CardTitle>
                  <CardDescription>Manage promotional campaigns and offers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {promotions.map((promotion) => (
                  <div key={promotion.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[#E94D61]/10 rounded-lg">
                          <Gift className="text-[#E94D61]" size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{promotion.title}</h3>
                            {promotion.isActive ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">Scheduled</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Tag size={12} />
                              <span>Code: {promotion.discountCode}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{new Date(promotion.validFrom).toLocaleDateString()} - {new Date(promotion.validTo).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={12} />
                              <span>{promotion.targetAudience}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDeletePromotion(promotion.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Discount Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this discount code? This action cannot be undone and may affect existing applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteDiscount}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Promotion Confirmation Dialog */}
      <AlertDialog open={showDeletePromoDialog} onOpenChange={setShowDeletePromoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this promotion? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePromotion}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Dialog for Discount Creation */}
      <Dialog open={isCreatingDiscount} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Creating Discount</DialogTitle>
            <DialogDescription className="sr-only">Please wait while we create the discount code</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 border-4 border-[#358E83] border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating Discount</h3>
            <p className="text-sm text-gray-600 text-center">Please wait while we create the discount code...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Dialog for Promotion Creation */}
      <Dialog open={isCreatingPromotion} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Creating Promotion</DialogTitle>
            <DialogDescription className="sr-only">Please wait while we create the promotion</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 border-4 border-[#E94D61] border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating Promotion</h3>
            <p className="text-sm text-gray-600 text-center">Please wait while we create the promotion...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}