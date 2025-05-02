import { UserButton } from "@clerk/nextjs";
import { ReactNode } from "react";
import Link from "next/link";
import { LucideIcon, Battery, Users, BarChart3, Settings, CreditCard, Repeat } from "lucide-react";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

const SidebarItem = ({ icon: Icon, label, href }: SidebarItemProps) => {
  return (
    <Link href={href} className="flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors">
      <Icon className="w-5 h-5 mr-3 text-gray-500" />
      <span>{label}</span>
    </Link>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Battery Manager</h1>
        </div>
        
        <nav className="space-y-1">
          <SidebarItem icon={BarChart3} label="Dashboard" href="/dashboard" />
          <SidebarItem icon={Battery} label="Inventory" href="/dashboard/inventory" />
          <SidebarItem icon={Users} label="Customers" href="/dashboard/customers" />
          <SidebarItem icon={Repeat} label="Rentals" href="/dashboard/rentals" />
          <SidebarItem icon={CreditCard} label="Payments" href="/dashboard/payments" />
          <SidebarItem icon={Settings} label="Settings" href="/dashboard/settings" />
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Dashboard</h2>
            <div className="flex items-center space-x-4">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
