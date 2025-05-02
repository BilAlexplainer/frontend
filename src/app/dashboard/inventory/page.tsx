import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Battery, Plus, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inventoryApi } from "@/lib/api";
import { toast } from "sonner";

// Define types based on our backend models
interface Battery {
  id: string;
  serialNumber: string;
  price: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
  dateAdded: string;
}

interface InventorySummary {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
}

export default function InventoryPage() {
  const [showAddBatteryDialog, setShowAddBatteryDialog] = useState(false);
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    total: 0,
    available: 0,
    rented: 0,
    maintenance: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state for adding a new battery
  const [newBattery, setNewBattery] = useState({
    serialNumber: "",
    price: 0
  });

  // Load batteries and summary on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [batteriesResponse, summaryResponse] = await Promise.all([
          inventoryApi.getAllBatteries(),
          inventoryApi.getInventorySummary()
        ]);
        
        setBatteries(batteriesResponse.data);
        setSummary(summaryResponse.data);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        toast.error("Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle adding a new battery
  const handleAddBattery = async () => {
    try {
      if (!newBattery.serialNumber || newBattery.price <= 0) {
        toast.error("Please enter a valid serial number and price");
        return;
      }
      
      setLoading(true);
      const response = await inventoryApi.addBattery(newBattery);
      
      // Add the new battery to the list
      setBatteries([response.data, ...batteries]);
      
      // Update the summary
      setSummary({
        ...summary,
        total: summary.total + 1,
        available: summary.available + 1
      });
      
      // Reset form and close dialog
      setNewBattery({ serialNumber: "", price: 0 });
      setShowAddBatteryDialog(false);
      
      toast.success("Battery added successfully");
    } catch (error) {
      console.error("Error adding battery:", error);
      toast.error("Failed to add battery");
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a battery
  const handleDeleteBattery = async (id: string) => {
    try {
      if (!confirm("Are you sure you want to delete this battery?")) {
        return;
      }
      
      setLoading(true);
      await inventoryApi.deleteBattery(id);
      
      // Remove the battery from the list
      const updatedBatteries = batteries.filter(battery => battery.id !== id);
      setBatteries(updatedBatteries);
      
      // Update the summary
      setSummary({
        ...summary,
        total: summary.total - 1,
        // Decrement the appropriate status count
        available: summary.available - (batteries.find(b => b.id === id)?.status === 'AVAILABLE' ? 1 : 0),
        rented: summary.rented - (batteries.find(b => b.id === id)?.status === 'RENTED' ? 1 : 0),
        maintenance: summary.maintenance - (batteries.find(b => b.id === id)?.status === 'MAINTENANCE' ? 1 : 0)
      });
      
      toast.success("Battery deleted successfully");
    } catch (error) {
      console.error("Error deleting battery:", error);
      toast.error("Failed to delete battery");
    } finally {
      setLoading(false);
    }
  };

  // Filter batteries based on search term
  const filteredBatteries = batteries.filter(battery => 
    battery.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Button onClick={() => setShowAddBatteryDialog(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          Add Battery
        </Button>
      </div>
      
      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-100 mr-4">
              <Battery className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available</p>
              <p className="text-2xl font-bold">{summary.available}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-gray-100 mr-4">
              <Battery className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rented</p>
              <p className="text-2xl font-bold">{summary.rented}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-yellow-100 mr-4">
              <Battery className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Maintenance</p>
              <p className="text-2xl font-bold">{summary.maintenance}</p>
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
            placeholder="Search by serial number..." 
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
      
      {/* Battery List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading inventory data...</div>
        ) : filteredBatteries.length === 0 ? (
          <div className="p-8 text-center">No batteries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBatteries.map((battery) => (
                  <tr key={battery.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{battery.serialNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        battery.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                        battery.status === 'RENTED' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {battery.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">${battery.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(battery.dateAdded).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900">
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteBattery(battery.id)}
                        disabled={battery.status === 'RENTED'}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* Add Battery Dialog */}
      <Dialog open={showAddBatteryDialog} onOpenChange={setShowAddBatteryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Battery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Number</label>
              <Input 
                placeholder="Enter serial number" 
                value={newBattery.serialNumber}
                onChange={(e) => setNewBattery({...newBattery, serialNumber: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price</label>
              <Input 
                type="number" 
                placeholder="Enter price" 
                value={newBattery.price || ''}
                onChange={(e) => setNewBattery({...newBattery, price: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddBatteryDialog(false)}>Cancel</Button>
              <Button onClick={handleAddBattery} disabled={loading}>Add Battery</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
