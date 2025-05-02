import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, DollarSign, Calendar, CreditCard, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { paymentApi, rentalApi, customerApi } from "@/lib/api";
import { toast } from "sonner";

// Define types based on our backend models
interface Payment {
  id: string;
  rentalId: string;
  customerId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
  rental: {
    battery: {
      serialNumber: string;
    };
  };
  customer: {
    name: string;
  };
}

interface Rental {
  id: string;
  batteryId: string;
  customerId: string;
  rentalPrice: number;
  isPaid: boolean;
  battery: {
    serialNumber: string;
  };
}

interface Customer {
  id: string;
  name: string;
}

export default function PaymentsPage() {
  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidRentals, setUnpaidRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Stats
  const [stats, setStats] = useState({
    todayEarnings: 0,
    monthEarnings: 0,
    outstanding: 0
  });
  
  // Form state for new payment
  const [newPayment, setNewPayment] = useState({
    rentalId: "",
    customerId: "",
    amount: 0,
    paymentMethod: "CASH"
  });

  // Load payments, unpaid rentals, and customers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [paymentsResponse, rentalsResponse, customersResponse, financialResponse] = await Promise.all([
          paymentApi.getAllPayments(),
          rentalApi.getActiveRentals(),
          customerApi.getAllCustomers(),
          paymentApi.getFinancialSummary()
        ]);
        
        setPayments(paymentsResponse.data);
        
        // Filter unpaid rentals
        const unpaid = rentalsResponse.data.filter(
          (rental: Rental) => !rental.isPaid
        );
        setUnpaidRentals(unpaid);
        
        setCustomers(customersResponse.data);
        
        // Set financial stats
        const financial = financialResponse.data;
        setStats({
          todayEarnings: financial.earnedToday,
          monthEarnings: financial.earnedThisMonth,
          outstanding: financial.totalDue
        });
      } catch (error) {
        console.error("Error fetching payment data:", error);
        toast.error("Failed to load payment data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle creating a new payment
  const handleCreatePayment = async () => {
    try {
      if (!newPayment.rentalId || !newPayment.customerId || newPayment.amount <= 0) {
        toast.error("Please select a rental, customer, and enter a valid amount");
        return;
      }
      
      setLoading(true);
      const response = await paymentApi.createPayment(newPayment);
      
      // Add the new payment to the list
      const createdPayment = response.data;
      
      // Find the rental and customer details to include in the payment
      const rental = unpaidRentals.find(r => r.id === newPayment.rentalId);
      const customer = customers.find(c => c.id === newPayment.customerId);
      
      const paymentWithDetails = {
        ...createdPayment,
        rental: { battery: { serialNumber: rental?.battery.serialNumber || "" } },
        customer: { name: customer?.name || "" }
      };
      
      setPayments([paymentWithDetails, ...payments]);
      
      // Update stats
      setStats({
        ...stats,
        todayEarnings: stats.todayEarnings + newPayment.amount,
        monthEarnings: stats.monthEarnings + newPayment.amount,
        outstanding: stats.outstanding - newPayment.amount
      });
      
      // Reset form and close dialog
      setNewPayment({
        rentalId: "",
        customerId: "",
        amount: 0,
        paymentMethod: "CASH"
      });
      setShowNewPaymentDialog(false);
      
      toast.success("Payment recorded successfully");
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment => 
    payment.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.rental.battery.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle customer selection in the form
  const handleCustomerChange = (customerId: string) => {
    setNewPayment({...newPayment, customerId});
    
    // Filter unpaid rentals for this customer
    const customerRentals = unpaidRentals.filter(rental => rental.customerId === customerId);
    
    // If there's only one rental, auto-select it
    if (customerRentals.length === 1) {
      setNewPayment(prev => ({...prev, rentalId: customerRentals[0].id}));
    }
  };
  
  // Get the maximum amount that can be paid for a rental
  const getMaxAmount = () => {
    if (!newPayment.rentalId) return 0;
    
    const rental = unpaidRentals.find(r => r.id === newPayment.rentalId);
    return rental ? rental.rentalPrice : 0;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Management</h1>
        <Button onClick={() => setShowNewPaymentDialog(true)} disabled={loading}>
          New Payment
        </Button>
      </div>
      
      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-100 mr-4">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today's Earnings</p>
              <p className="text-2xl font-bold">${stats.todayEarnings}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-100 mr-4">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold">${stats.monthEarnings}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-red-100 mr-4">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-2xl font-bold">${stats.outstanding}</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            className="pl-10" 
            placeholder="Search by customer or rental..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button variant="outline" className="flex items-center" disabled={loading}>
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>
      
      {/* Payment List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading payment data...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rental</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{payment.customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.rental.battery.serialNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">${payment.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.paymentMethod === 'CASH' ? 'bg-green-100 text-green-800' :
                        payment.paymentMethod === 'MOBILE_MONEY' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {payment.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900">View</Button>
                      <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-900">Receipt</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* New Payment Dialog */}
      <Dialog open={showNewPaymentDialog} onOpenChange={setShowNewPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select 
                value={newPayment.customerId} 
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rental</label>
              <Select 
                value={newPayment.rentalId} 
                onValueChange={(value) => setNewPayment({...newPayment, rentalId: value})}
                disabled={!newPayment.customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rental" />
                </SelectTrigger>
                <SelectContent>
                  {unpaidRentals
                    .filter(rental => rental.customerId === newPayment.customerId)
                    .map(rental => (
                      <SelectItem key={rental.id} value={rental.id}>
                        {rental.battery.serialNumber} (Unpaid: ${rental.rentalPrice})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input 
                type="number" 
                placeholder="Enter amount" 
                value={newPayment.amount || ''} 
                onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                max={getMaxAmount()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select 
                value={newPayment.paymentMethod} 
                onValueChange={(value) => setNewPayment({...newPayment, paymentMethod: value as 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER'})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowNewPaymentDialog(false)}>Cancel</Button>
              <Button onClick={handleCreatePayment} disabled={loading}>Record Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
