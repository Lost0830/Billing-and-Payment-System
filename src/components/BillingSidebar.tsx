import React from "react";
import { Button } from "./ui/button";
import { Activity, ChevronLeft } from "lucide-react";

type BillingItem = {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  description?: string;
};

interface BillingSidebarProps {
  items: BillingItem[];
  currentView: string;
  onNavigate: (id: string) => void;
  onBack: () => void;
  getCurrentDateTime: () => string;
}

export function BillingSidebar({ items, currentView, onNavigate, onBack, getCurrentDateTime }: BillingSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
        <div className="w-8 h-8 bg-[#358E83] rounded-md flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div className="text-lg font-semibold text-gray-900">HIMS</div>

        <Button variant="ghost" size="sm" className="ml-auto text-gray-400 hover:text-gray-600" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xs ml-1 hidden sm:inline">Back to HIMS</span>
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Navigation</h3>
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive ? "bg-[#358E83] text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Date/Time at bottom */}
        <div className="mt-auto text-xs text-gray-400">{getCurrentDateTime()}</div>
      </div>
    </aside>
  );
}
