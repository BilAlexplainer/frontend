import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Battery, Users, Calendar, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rentalApi, inventoryApi, customerApi } from "@/lib/api";
import { toast } from "sonner";

// Define types based on our backend models
interface Rental {
  id: string;
  batteryId: string;
  customerId: string;
  rentDate: string;
  returnDate: string | null;
  rentalPrice: number;
  isPaid: boolean;
  battery: {
    serialNumber: string;
  };
  customer: {
    name: string;
  };
}

interface Battery {
  id: string;
  serialNumber: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
}

interface Customer {
  id: string;
  name: string;
}

export default function RentalsPage() {
  const [showNewRentalDialog, setShowNewRentalDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [availableBatteries, setAvailableBatteries] = useState<Battery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    active: 0,
    returnedToday: 0,
    overdue: 0
  });
  
  // Form state for new rental
  const [newRental, setNewRental] = useState({
    batteryId: "",
    customerId: "",
    rentalPrice: 75,
    isPaid: false
  });
  
  // Form state for returning a battery
  const [returnData, setReturnData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    isPaid: false
  });

  // Load rentals, available batteries, and customers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [rentalsResponse, batteriesResponse, customersResponse] = await Promise.all([
          rentalApi.getAllRentals(),
          inventoryApi.getAllBatteries(),
          customerApi.getAllCustomers()
        ]);
        
        const allRentals = rentalsResponse.data;
        setRentals(allRentals);
        
        // Filter available batteries
        const availableBats = batteriesResponse.data.filter(
          (battery: Battery) => battery.status === 'AVAILABLE'
        );
        setAvailableBatteries(availableBats);
        
        setCustomers(customersResponse.data);
        
        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        setStats({
          active: allRentals.filter(r => !r.returnDate).length,
          returnedToday: allRentals.filter(r => 
            r.returnDate && r.returnDate.startsWith(today)
          ).length,
          overdue: allRentals.filter(r => {
            if (r.returnDate) return false;
            const rentDate = new Date(r.rentDate);
            const now = new Date();
            // Consider overdue if rented more than 7 days ago
            return (now.getTime() - rentDate.getTime()) > 7 * 24 * 60 * 60 * 1000;
          }).length
        });
      } catch (error) {
        console.error("Error fetching rental data:", error);
        toast.error("Failed to load rental data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle creating a new rental
  const handleCreateRental = async () => {
    try {
      if (!newRental.batteryId || !newRental.customerId || newRental.rentalPrice <= 0) {
        toast.error("Please select a battery, customer, and enter a valid price");
        return;
      }
      
      setLoading(true);
      const response = await rentalApi.createRental(newRental);
      
      // Add the new rental to the list
      const createdRental = response.data;
      
      // Find the battery and customer details to include in the rental
      const battery = availableBatteries.find(b => b.id === newRental.batteryId);
      const customer = customers.find(c => c.id === newRental.customerId);
      
      const rentalWithDetails = {
        ...createdRental,
        battery: { serialNumber: battery?.serialNumber || "" },
        customer: { name: customer?.name || "" }
      };
      
      setRentals([rentalWithDetails, ...rentals]);
      
      // Update stats
      setStats({
        ...stats,
        active: stats.active + 1
      });
      
      // Remove the battery from available batteries
      setAvailableBatteries(availableBatteries.filter(b => b.id !== newRental.batteryId));
      
      // Reset form and close dialog
      setNewRental({
        batteryId: "",
        customerId: "",
        rentalPrice: 75,
        isPaid: false
      });
      setShowNewRentalDialog(false);
      
      toast.success("Rental created successfully");
    } catch (error) {
      console.error("Error creating rental:", error);
      toast.error("Failed to create rental");
    } finally {
      setLoading(false);
    }
  };

  // Handle returning a battery
  const handleReturnBattery = async () => {
    try {
      if (!selectedRentalId) {
        toast.error("No rental selected");
        return;
      }
      
      setLoading(true);
      const response = await rentalApi.returnBattery(selectedRentalId, returnData);
      
      // Update the rental in the list
      const updatedRental = response.data;
      const updatedRentals = rentals.map(rental => 
        rental.id === selectedRentalId ? {
          ...rental,
          returnDate: updatedRental.returnDate,
          isPaid: updatedRental.isPaid
        } : rental
      );
      
      setRentals(updatedRentals);
      
      // Update stats
      const today = new Date().toISOString().split('T')[0];
      setStats({
        ...stats,
        active: stats.active - 1,
        returnedToday: returnData.returnDate === today ? stats.returnedToday + 1 : stats.returnedToday
      });
      
      // Reset form and close dialog
      setReturnData({
        returnDate: new Date().toISOString().split('T')[0],
        isPaid: false
      });
      setSelectedRentalId(null);
      setShowReturnDialog(false);
      
      toast.success("Battery returned successfully");
    } catch (error) {
      console.error("Error returning battery:", error);
      toast.error("Failed to return battery");
    } finally {
      setLoading(false);
    }
  };

  // Filter rentals based on search term
  const filteredRentals = rentals.filter(rental => 
    rental.battery.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rental Management</h1>
        <Button onClick={() => setShowNewRentalDialog(true)} disabled={loading}>
          New Rental
        </Button>
      </div>
      
      {/* Rental Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-100 mr-4">
              <Battery className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Rentals</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-100 mr-4">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Returned Today</p>
              <p className="text-2xl font-bold">{stats.returnedToday}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-red-100 mr-4">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold">{stats.overdue}</p>
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
            placeholder="Search by customer or battery..." 
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
      
      {/* Rental List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading rental data...</div>
        ) : filteredRentals.length === 0 ? (
          <div className="p-8 text-center">No rentals found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Battery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRentals.map((rental) => (
                  <tr key={rental.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{rental.battery.serialNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{rental.customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(rental.rentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rental.returnDate ? new Date(rental.returnDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">${rental.rentalPrice}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rental.isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {rental.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900">View</Button>
                      {!rental.returnDate && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-600 hover:text-green-900"
                          onClick={() => {
                            setSelectedRentalId(rental.id);
                            setShowReturnDialog(true);
                          }}
                        >
                          Return
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* New Rental Dialog */}
      <Dialog open={showNewRentalDialog} onOpenChange={setShowNewRentalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Rental</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Battery</label>
              <Select 
                value={newRental.batteryId} 
                onValueChange={(value) => setNewRental({...newRental, batteryId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select battery" />
                </SelectTrigger>
                <SelectContent>
                  {availableBatteries.map(battery => (
                    <SelectItem key={battery.id} value={battery.id}>
                      {battery.serialNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select 
                value={newRental.customerId} 
                onValueChange={(value) => setNewRental({...newRental, customerId: value})}
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
              <label className="text-sm font-medium">Rental Price</label>
              <Input 
                type="number" 
                placeholder="Enter price" 
                value={newRental.rentalPrice || ''} 
                onChange={(e) => setNewRental({...newRental, rentalPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Status</label>
              <Select 
                value={newRental.isPaid ? "paid" : "unpaid"} 
                onValueChange={(value) => setNewRental({...newRental, isPaid: value === "paid"})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowNewRentalDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateRental} disabled={loading}>Create Rental</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Return Battery Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Battery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Return Date</label>
              <Input 
                type="date" 
                value={returnData.returnDate} 
                onChange={(e) => setReturnData({...returnData, returnDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Status</label>
              <Select 
                value={returnData.isPaid ? "paid" : "unpaid"} 
                onValueChange={(value) => setReturnData({...returnData, isPaid: value === "paid"})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowReturnDialog(false)}>Cancel</Button>
              <Button onClick={handleReturnBattery} disabled={loading}>Confirm Return</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
