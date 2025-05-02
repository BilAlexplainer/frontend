import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Users, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { customerApi } from "@/lib/api";
import { toast } from "sonner";

// Define types based on our backend models
interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  address: string;
  creditRating: number;
  dueBalance?: number;
}

export default function CustomersPage() {
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    withDues: 0,
    fiveStars: 0
  });
  
  // Form state for adding a new customer
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phoneNumber: "",
    address: ""
  });

  // Load customers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [customersResponse, duesResponse] = await Promise.all([
          customerApi.getAllCustomers(),
          customerApi.getCustomersWithDues()
        ]);
        
        const allCustomers = customersResponse.data;
        const customersWithDues = duesResponse.data;
        
        // Merge due balances into customer data
        const customersWithDueInfo = allCustomers.map(customer => {
          const dueInfo = customersWithDues.find(c => c.id === customer.id);
          return {
            ...customer,
            dueBalance: dueInfo ? dueInfo.dueAmount : 0
          };
        });
        
        setCustomers(customersWithDueInfo);
        
        // Calculate stats
        setStats({
          total: customersWithDueInfo.length,
          withDues: customersWithDues.length,
          fiveStars: customersWithDueInfo.filter(c => c.creditRating === 5).length
        });
      } catch (error) {
        console.error("Error fetching customer data:", error);
        toast.error("Failed to load customer data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle adding a new customer
  const handleAddCustomer = async () => {
    try {
      if (!newCustomer.name || !newCustomer.phoneNumber) {
        toast.error("Please enter a name and phone number");
        return;
      }
      
      setLoading(true);
      const response = await customerApi.addCustomer(newCustomer);
      
      // Add the new customer to the list
      const addedCustomer = {
        ...response.data,
        dueBalance: 0
      };
      
      setCustomers([addedCustomer, ...customers]);
      
      // Update stats
      setStats({
        ...stats,
        total: stats.total + 1
      });
      
      // Reset form and close dialog
      setNewCustomer({ name: "", phoneNumber: "", address: "" });
      setShowAddCustomerDialog(false);
      
      toast.success("Customer added successfully");
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phoneNumber.includes(searchTerm)
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Management</h1>
        <Button onClick={() => setShowAddCustomerDialog(true)} disabled={loading}>
          <Users className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>
      
      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-100 mr-4">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-red-100 mr-4">
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">With Due Balance</p>
              <p className="text-2xl font-bold">{stats.withDues}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-100 mr-4">
              <Star className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">5-Star Customers</p>
              <p className="text-2xl font-bold">{stats.fiveStars}</p>
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
            placeholder="Search by name or phone..." 
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
      
      {/* Customer List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading customer data...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center">No customers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{customer.phoneNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{customer.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-sm ${i < customer.creditRating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={customer.dueBalance && customer.dueBalance > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                        ${customer.dueBalance || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900">View</Button>
                      <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-900">Rent</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input 
                placeholder="Enter customer name" 
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input 
                placeholder="Enter phone number" 
                value={newCustomer.phoneNumber}
                onChange={(e) => setNewCustomer({...newCustomer, phoneNumber: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address/Location</label>
              <Input 
                placeholder="Enter address or location" 
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddCustomerDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCustomer} disabled={loading}>Add Customer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
