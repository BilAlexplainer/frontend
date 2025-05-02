import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Battery, Users, DollarSign, AlertCircle } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { toast } from "sonner";

// Define types based on our backend models
interface DashboardSummary {
  inventory: {
    total: number;
    available: number;
    rented: number;
  };
  financial: {
    earnedToday: number;
    totalDue: number;
  };
  customers: {
    topRenters: {
      id: string;
      name: string;
      phoneNumber: string;
      rentalCount: number;
      creditRating: number;
    }[];
    worstCreditRatings: {
      id: string;
      name: string;
      phoneNumber: string;
      creditRating: number;
    }[];
  };
}

interface ActivityItem {
  action: string;
  details: string;
  time: string;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Sample activity data (would come from backend in a real implementation)
  const recentActivity: ActivityItem[] = [
    { 
      action: "Battery Rented", 
      details: "Battery #B-1234 rented to John Smith", 
      time: "2 hours ago" 
    },
    { 
      action: "Payment Received", 
      details: "$75 payment from Sarah Johnson", 
      time: "3 hours ago" 
    },
    { 
      action: "Battery Returned", 
      details: "Battery #B-5678 returned by Michael Brown", 
      time: "5 hours ago" 
    },
    { 
      action: "New Customer", 
      details: "Emily Davis registered as a new customer", 
      time: "1 day ago" 
    },
    { 
      action: "Battery Added", 
      details: "New battery #B-9012 added to inventory", 
      time: "1 day ago" 
    }
  ];

  // Load dashboard summary on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getDashboardSummary();
        setSummary(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard data...</div>;
  }

  if (!summary) {
    return <div className="p-8 text-center">Failed to load dashboard data</div>;
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Inventory" 
          value={summary.inventory.total.toString()} 
          description="Batteries in system" 
          icon={Battery} 
          color="bg-blue-500" 
        />
        <MetricCard 
          title="Available Batteries" 
          value={summary.inventory.available.toString()} 
          description="Ready to rent" 
          icon={Battery} 
          color="bg-green-500" 
        />
        <MetricCard 
          title="Rented Batteries" 
          value={summary.inventory.rented.toString()} 
          description="Currently with customers" 
          icon={Battery} 
          color="bg-gray-700" 
        />
        <MetricCard 
          title="Due Balance" 
          value={`$${summary.financial.totalDue}`} 
          description="Outstanding payments" 
          icon={DollarSign} 
          color="bg-red-500" 
        />
      </div>
      
      {/* Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Top Customers</h2>
          <div className="space-y-4">
            {summary.customers.topRenters.map((customer, index) => (
              <CustomerRow 
                key={customer.id} 
                name={customer.name} 
                rentals={customer.rentalCount} 
                rating={customer.creditRating} 
              />
            ))}
          </div>
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Credit Concerns</h2>
          <div className="space-y-4">
            {summary.customers.worstCreditRatings.map((customer, index) => (
              <CustomerRow 
                key={customer.id} 
                name={customer.name} 
                rentals={0} // We don't have this data in the worst ratings list
                rating={customer.creditRating} 
              />
            ))}
          </div>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <ActivityItem 
              key={index}
              action={activity.action} 
              details={activity.details} 
              time={activity.time} 
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: any;
  color: string;
}

function MetricCard({ title, value, description, icon: Icon, color }: MetricCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className={`p-2 rounded-full ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

interface CustomerRowProps {
  name: string;
  rentals: number;
  rating: number;
}

function CustomerRow({ name, rentals, rating }: CustomerRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
          <Users className="w-4 h-4 text-gray-500" />
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-gray-500">{rentals} rentals</p>
        </div>
      </div>
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`text-sm ${i < rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
        ))}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  action: string;
  details: string;
  time: string;
}

function ActivityItem({ action, details, time }: ActivityItemProps) {
  return (
    <div className="flex items-start">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
        <AlertCircle className="w-4 h-4 text-blue-500" />
      </div>
      <div>
        <p className="font-medium">{action}</p>
        <p className="text-sm text-gray-500">{details}</p>
        <p className="text-xs text-gray-400">{time}</p>
      </div>
    </div>
  );
}
