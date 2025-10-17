"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  TrendingUp,
  FileText,
  Settings as SettingsIcon,
  User as UserIcon,
  ChevronRight,
  BookOpen,
  Plug,
} from "lucide-react";

// Navigation structure based on your specification
const navigationItems = {
  top: [
    { id: "dashboard", icon: LayoutDashboard, label: "Home", path: "/dashboard", description: "Executive overview and retention score" },
    { id: "cohorts", icon: BarChart3, label: "Cohorts", path: "/cohorts", description: "Behavioural and economic segmentation" },
    { id: "products", icon: Package, label: "Products", path: "/products", description: "Product performance, replenishment, and cross-sell insights" },
    { id: "retention", icon: TrendingUp, label: "Retention", path: "/retention", description: "Customer health, loyalty, and churn insights" },
    { id: "reports", icon: FileText, label: "Reports", path: "/reports", description: "AI summaries and executive report builder" },
  ],
  bottom: [
    { id: "integrations", icon: Plug, label: "Integrations", path: "/integrations", description: "Data source status and OAuth management" },
    { id: "guides", icon: BookOpen, label: "Guides", path: "/guides", description: "Education and glossary for metrics and formulas" },
    { id: "settings", icon: SettingsIcon, label: "Settings", path: "/settings", description: "Account preferences, team roles, and RLS visibility" },
  ]
};

export function CleanSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsExpanded(false);
  };

  const getCurrentSection = () => {
    if (pathname.includes("/dashboard")) return "dashboard";
    if (pathname.includes("/cohorts")) return "cohorts";
    if (pathname.includes("/products")) return "products";
    if (pathname.includes("/retention")) return "retention";
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/integrations")) return "integrations";
    if (pathname.includes("/guides")) return "guides";
    if (pathname.includes("/settings")) return "settings";
    return "dashboard";
  };

  const currentSection = getCurrentSection();

  return (
    <div className="fixed left-0 top-0 h-full z-50">
      {/* Main Sidebar */}
      <div 
        className={`bg-slate-900 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-16'
        } h-full flex flex-col border-r border-slate-800`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Logo/Brand */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            {isExpanded && (
              <div className="ml-3">
                <h1 className="text-white font-semibold text-lg">RetentionOS</h1>
                <p className="text-slate-400 text-xs">Analytics Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 flex flex-col py-4">
          {/* Top Section */}
          <div className="mb-6">
            {isExpanded && (
              <div className="px-4 mb-3">
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Core Analytics
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {navigationItems.top.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center px-4 py-3 text-left transition-colors duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {isExpanded && (
                        <span className="ml-3 font-medium">{item.label}</span>
                      )}
                      {isExpanded && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                    
                    {/* Hover Tooltip */}
                    {!isExpanded && hoveredItem === item.id && (
                      <div className="absolute left-16 top-0 z-50 bg-slate-800 text-white px-3 py-2 rounded-lg shadow-lg min-w-48">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-slate-300 mt-1">{item.description}</div>
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-auto">
            {isExpanded && (
              <div className="px-4 mb-3">
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Support & Config
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {navigationItems.bottom.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center px-4 py-3 text-left transition-colors duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {isExpanded && (
                        <span className="ml-3 font-medium">{item.label}</span>
                      )}
                      {isExpanded && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                    
                    {/* Hover Tooltip */}
                    {!isExpanded && hoveredItem === item.id && (
                      <div className="absolute left-16 top-0 z-50 bg-slate-800 text-white px-3 py-2 rounded-lg shadow-lg min-w-48">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-slate-300 mt-1">{item.description}</div>
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-slate-300" />
            </div>
            {isExpanded && (
              <div className="ml-3">
                <div className="text-white font-medium text-sm">RetentionOS User</div>
                <div className="text-slate-400 text-xs">Admin</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CleanSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <CleanSidebar />
      <main className="flex-1 ml-16 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default CleanSidebar;
