import {
  Shield, Upload, LayoutDashboard, Network, AlertTriangle,
  Building2, FileText, FileSearch, BarChart3, Search,
  ChevronLeft, ChevronRight, Zap
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";

const navItems = [
  { path: "/", icon: Upload, label: "Upload" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/network", icon: Network, label: "Fraud Network" },
  { path: "/flagged", icon: AlertTriangle, label: "Flagged Cases" },
  { path: "/vendors", icon: Building2, label: "Vendor Registry" },
  { path: "/dossiers", icon: FileSearch, label: "Dossiers" },
  { path: "/tenders", icon: FileText, label: "Tender Explorer" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/search", icon: Search, label: "Search" },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { isScanning } = useApp();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 bg-[#0E1A14] border-r border-[#24402E] flex flex-col items-center py-4 z-50 transition-all duration-300">
      {/* Logo */}
      <div className="mb-8 p-2">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D9BE7E] to-[#8FB27A] flex items-center justify-center transition-transform duration-500 hover:rotate-[8deg] hover:scale-110 shadow-[0_0_22px_-6px_rgba(217,190,126,.65)]">
          <Shield className="w-5 h-5 text-[#0A1410]" />
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 w-full px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "w-full flex items-center justify-center py-2.5 rounded-lg transition-all duration-300 group relative hover:scale-[1.08] active:scale-95",
                isActive
                  ? "bg-[#D9BE7E]/10 text-[#D9BE7E]"
                  : "text-[#A3A88F] hover:text-[#F2E8D5] hover:bg-white/5"
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#D9BE7E] rounded-r shadow-[0_0_10px_rgba(217,190,126,.9)] animate-[pop-in_.35s_var(--ease-out)]" />
              )}
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-2 py-1 bg-[#1A2C20] text-[#F2E8D5] text-xs rounded opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none whitespace-nowrap transition-all duration-300 z-50 shadow-lg border border-[#2B4A36]">
                {item.label}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Scanning indicator */}
      {isScanning && (
        <div className="mb-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#D9BE7E]/30 border-t-[#D9BE7E] animate-spin" />
        </div>
      )}

      {/* Status dot */}
      <div className="mb-2">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full",
          isScanning ? "bg-[#E0A83C] pulse-dot" : "bg-[#86B96A]"
        )} />
      </div>
    </aside>
  );
}
