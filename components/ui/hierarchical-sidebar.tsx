"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  Package,
  Users,
  TrendingUp,
  FileText,
  Plug,
  BookOpen,
  Settings as SettingsIcon,
  User as UserIcon,
  ChevronRight,
  ChevronDown,
  Home,
  DollarSign,
  Target,
  ShoppingCart,
  UserCheck,
  AlertTriangle,
  Activity,
  RefreshCw,
  Calendar,
  Star,
  Shield,
} from "lucide-react";

// Navigation structure based on your specification
const navigationStructure = {
  top: [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/dashboard",
      description: "Executive summary, key highlights, alerts and insights",
      subPages: []
    },
    {
      id: "cohorts",
      label: "Cohorts",
      icon: BarChart3,
      path: "/cohorts",
      description: "Revenue cohorts, customer composition, category cohorts",
      subPages: [
        { label: "Revenue Cohorts", path: "/cohorts/revenue", icon: DollarSign },
        { label: "Customer Composition", path: "/cohorts/composition", icon: Users },
        { label: "Category Cohorts", path: "/cohorts/category", icon: Target },
      ]
    },
    {
      id: "products",
      label: "Products",
      icon: Package,
      path: "/products",
      description: "Product performance, cross-sell analysis, replenishment metrics",
      subPages: [
        { label: "Product Performance", path: "/products/performance", icon: BarChart3 },
        { label: "Cross-Sell Analysis", path: "/products/cross-sell", icon: ShoppingCart },
        { label: "Replenishment Metrics", path: "/products/replenishment", icon: RefreshCw },
      ]
    },
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      path: "/customers",
      description: "Customer list, segments, individual customer profile",
      subPages: [
        { label: "Customer List", path: "/customers/list", icon: Users },
        { label: "Segments (RFM, High Value, At Risk)", path: "/customers/segments", icon: UserCheck },
        { label: "Individual Customer Profile", path: "/customers/profile", icon: UserIcon },
      ]
    },
    {
      id: "retention",
      label: "Retention",
      icon: TrendingUp,
      path: "/retention",
      description: "Retention curve, churn risk, reactivation",
      subPages: [
        { label: "Retention Curve", path: "/retention/curve", icon: TrendingUp },
        { label: "Churn Risk", path: "/retention/churn", icon: AlertTriangle },
        { label: "Reactivation", path: "/retention/reactivation", icon: Activity },
      ]
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      path: "/reports",
      description: "Weekly summary, executive report",
      subPages: [
        { label: "Weekly Summary", path: "/reports/weekly", icon: Calendar },
        { label: "Executive Report", path: "/reports/executive", icon: FileText },
      ]
    },
  ],
  bottom: [
    {
      id: "integrations",
      label: "Integrations",
      icon: Plug,
      path: "/integrations",
      description: "Data source status and sync health",
      subPages: []
    },
    {
      id: "guides",
      label: "Guides",
      icon: BookOpen,
      path: "/guides",
      description: "Metric definitions, scoring framework, interpretation playbook",
      subPages: [
        { label: "Metric Definitions", path: "/guides/metrics", icon: BookOpen },
        { label: "Scoring Framework (RFM)", path: "/guides/rfm", icon: Star },
        { label: "Interpretation Playbook", path: "/guides/playbook", icon: Shield },
      ]
    },
    {
      id: "settings",
      label: "Settings",
      icon: SettingsIcon,
      path: "/settings",
      description: "Account and permissions, preferences",
      subPages: [
        { label: "Account & Permissions", path: "/settings/account", icon: UserIcon },
        { label: "Preferences", path: "/settings/preferences", icon: SettingsIcon },
      ]
    },
  ]
};

export function HierarchicalSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsExpanded(false);
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getCurrentSection = () => {
    if (pathname.includes("/dashboard")) return "home";
    if (pathname.includes("/cohorts")) return "cohorts";
    if (pathname.includes("/products")) return "products";
    if (pathname.includes("/customers")) return "customers";
    if (pathname.includes("/retention")) return "retention";
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/integrations")) return "integrations";
    if (pathname.includes("/guides")) return "guides";
    if (pathname.includes("/settings")) return "settings";
    return "home";
  };

  const currentSection = getCurrentSection();

  const renderNavigationItem = (item: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    description: string;
    subPages?: Array<{
      label: string;
      path: string;
      icon: React.ComponentType<{ className?: string }>;
    }>;
  }, isSubItem = false) => {
    const Icon = item.icon;
    const isActive = currentSection === item.id;
    const isExpanded = expandedItems.has(item.id);
    const hasSubPages = item.subPages && item.subPages.length > 0;

    return (
      <div key={item.id} className="relative">
        <button
          onClick={() => {
            if (hasSubPages) {
              toggleExpanded(item.id);
            } else {
              handleNavigation(item.path);
            }
          }}
          className={`w-full flex items-center px-4 py-3 text-left transition-colors duration-200 ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          } ${isSubItem ? 'ml-6' : ''}`}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {(isExpanded || hoveredItem === item.id) && (
            <span className="ml-3 font-medium">{item.label}</span>
          )}
          {(isExpanded || hoveredItem === item.id) && hasSubPages && (
            <div className="ml-auto">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
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

        {/* Sub-pages */}
        {isExpanded && hasSubPages && item.subPages && (
          <div className="bg-slate-800/50">
            {item.subPages.map((subPage: {
              label: string;
              path: string;
              icon: React.ComponentType<{ className?: string }>;
            }) => {
              const SubIcon = subPage.icon;
              const isSubActive = pathname === subPage.path;
              
              return (
                <button
                  key={subPage.path}
                  onClick={() => handleNavigation(subPage.path)}
                  className={`w-full flex items-center px-4 py-2 text-left transition-colors duration-200 ${
                    isSubActive
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <SubIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="ml-3 text-sm">{subPage.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed left-0 top-0 h-full z-50">
      {/* Main Sidebar */}
      <div 
        className={`bg-slate-900 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-16'
        } h-full flex flex-col border-r border-slate-800`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          setIsExpanded(false);
          setHoveredItem(null);
        }}
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
                  Core Analytics & Insight Creation
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {navigationStructure.top.map((item) => renderNavigationItem(item))}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-auto">
            {isExpanded && (
              <div className="px-4 mb-3">
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Support & Configuration
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {navigationStructure.bottom.map((item) => renderNavigationItem(item))}
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

export function HierarchicalSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <HierarchicalSidebar />
      <main className="flex-1 ml-16 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default HierarchicalSidebar;
