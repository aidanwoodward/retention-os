"use client";

import { useState, useEffect } from "react";
import { FilterDemo } from "@/components/ui/filter-demo";
import {
  User,
  Shield,
  Palette,
  Database,
  Users,
  Save,
  AlertTriangle,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode/context";

interface UserSettings {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer' | 'analyst';
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    weekly_reports: boolean;
    sync_alerts: boolean;
  };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer' | 'analyst';
  status: 'active' | 'pending' | 'suspended';
  lastActive: string;
}

interface SettingsResponse {
  success: boolean;
  data: {
    user: UserSettings;
    team: TeamMember[];
    rls_settings: {
      enabled: boolean;
      visibility: 'private' | 'team' | 'public';
      data_retention_days: number;
    };
    account: {
      name: string;
      plan: 'free' | 'pro' | 'enterprise';
      usage: {
        data_sources: number;
        team_members: number;
        storage_gb: number;
      };
    };
  };
  error?: string;
}

const DEFAULT_SETTINGS: SettingsResponse['data'] = {
  user: {
    id: "user-demo",
    name: "Alex Parker",
    email: "alex.parker@example.com",
    role: "admin",
    timezone: "Europe/London",
    language: "en-GB",
    theme: "light",
    notifications: {
      email: true,
      push: true,
      weekly_reports: true,
      sync_alerts: true,
    },
  },
  team: [
    {
      id: "team-1",
      name: "Jamie Lee",
      email: "jamie.lee@example.com",
      role: "analyst",
      status: "active",
      lastActive: "Today",
    },
    {
      id: "team-2",
      name: "Morgan Chen",
      email: "morgan.chen@example.com",
      role: "viewer",
      status: "pending",
      lastActive: "Yesterday",
    },
  ],
  rls_settings: {
    enabled: true,
    visibility: "team",
    data_retention_days: 365,
  },
  account: {
    name: "Retention OS Demo Workspace",
    plan: "pro",
    usage: {
      data_sources: 3,
      team_members: 8,
      storage_gb: 54,
    },
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'security' | 'preferences' | 'workspace'>('profile');
  const { demoMode, setDemoMode, isDemoModeAvailable } = useDemoMode();
  const handleDemoToggle = () => {
    if (!isDemoModeAvailable) return;
    setDemoMode(!demoMode);
  };
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/user');
      const data = await response.json();

      if (data.success) {
        const incoming = data.data ?? {};
        const merged: SettingsResponse['data'] = {
          user: {
            ...DEFAULT_SETTINGS.user,
            ...(incoming.user ?? {}),
          },
          team: Array.isArray(incoming.team) && incoming.team.length > 0
            ? incoming.team
            : DEFAULT_SETTINGS.team,
          rls_settings: {
            ...DEFAULT_SETTINGS.rls_settings,
            ...(incoming.rls_settings ?? {}),
          },
          account: {
            ...DEFAULT_SETTINGS.account,
            ...(incoming.account ?? {}),
            usage: {
              ...DEFAULT_SETTINGS.account.usage,
              ...(incoming.account?.usage ?? {}),
            },
          },
        };
        setSettings(merged);
      } else {
        setError(data.error || 'Failed to fetch settings data');
      }
    } catch (err) {
      console.error('Settings fetch error:', err);
      setSettings(DEFAULT_SETTINGS);
      setError(null);
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    // Implementation for saving settings
    console.log('Saving settings...');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'analyst': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'suspended': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Settings</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <SettingsIcon className="w-5 h-5 text-yellow-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">No Settings Data</h3>
              <p className="text-yellow-600">Settings will be available once your account is fully configured.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage account preferences, team roles, and RLS visibility</p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter Settings</h3>
            <span className="text-sm text-gray-500">Filter by category, role, and preferences</span>
          </div>
          <FilterDemo />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Account Plan</p>
              <p className="text-2xl font-semibold text-gray-900 capitalize">{settings.account.plan}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="text-2xl font-semibold text-gray-900">{settings.team.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Data Sources</p>
              <p className="text-2xl font-semibold text-gray-900">{settings.account.usage.data_sources}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">RLS Status</p>
              <p className="text-2xl font-semibold text-gray-900">
                {settings.rls_settings.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'profile', name: 'Profile', icon: User },
              { id: 'team', name: 'Team', icon: Users },
              { id: 'security', name: 'Security', icon: Shield },
              { id: 'preferences', name: 'Preferences', icon: Palette },
              { id: 'workspace', name: 'Workspace', icon: SettingsIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'profile' | 'team' | 'security' | 'preferences' | 'workspace')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      defaultValue={settings.user.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue={settings.user.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      defaultValue={settings.user.role}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      defaultValue={settings.user.timezone}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                  <Users className="w-4 h-4 mr-2" />
                  Invite Member
                </button>
              </div>
              
              <div className="space-y-4">
                {settings.team.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-600">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <SettingsIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">API Key</div>
                      <div className="text-sm text-gray-600">Use this key to access RetentionOS APIs</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value="sk_live_1234567890abcdef..."
                        readOnly
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Row Level Security (RLS)</div>
                      <div className="text-sm text-gray-600">Control data visibility and access</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        settings.rls_settings.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {settings.rls_settings.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                    <select
                      defaultValue={settings.user.theme}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Notifications</label>
                    <div className="space-y-3">
                      {Object.entries(settings.user.notifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 capitalize">
                            {key.replace('_', ' ')}
                          </span>
                          <input
                            type="checkbox"
                            defaultChecked={value}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Tab */}
          {activeTab === 'workspace' && (
            <div className="space-y-6">
              {!isDemoModeAvailable ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">Demo Mode</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Demo Mode is disabled for this workspace. Contact your administrator to enable it.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Demo Mode</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Show realistic sample data across the workspace and mark integrations as connected. No real data is read or written while this is on.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={demoMode}
                      onClick={handleDemoToggle}
                      className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                        demoMode ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className="sr-only">Toggle demo mode</span>
                      <span
                        className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow transition ${
                          demoMode ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Your setting is saved on this device/workspace.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
