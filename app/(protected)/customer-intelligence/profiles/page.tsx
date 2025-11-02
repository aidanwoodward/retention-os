"use client";

import { useState, useEffect } from "react";
import { User, ShoppingBag, Calendar, DollarSign, TrendingUp, Mail, MapPin } from "lucide-react";

interface CustomerProfile {
  id: string;
  email: string;
  name: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order: string;
  last_order: string;
  ltv: number;
  favorite_category: string;
  location: string;
}

export default function CustomerProfilesPage() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock customer profile
    setCustomer({
      id: '1',
      email: 'customer@example.com',
      name: 'John Doe',
      total_orders: 15,
      total_spent: 1250,
      avg_order_value: 83.33,
      first_order: '2024-01-15',
      last_order: '2025-10-25',
      ltv: 1500,
      favorite_category: 'Electronics',
      location: 'New York, US',
    });
    setLoading(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading || !customer) {
    return <div className="w-full px-4 py-8"><div className="animate-pulse h-96 bg-gray-200 rounded"></div></div>;
  }

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-primary rounded-2xl p-8 text-primary-foreground">
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <User className="w-10 h-10 mr-3" />
            Customer Profile
          </h1>
          <p className="opacity-90 text-lg">Individual customer insights and history</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center mb-3">
                <ShoppingBag className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="text-sm font-medium text-blue-900">Total Orders</h3>
              </div>
              <p className="text-3xl font-bold text-blue-900">{customer.total_orders}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center mb-3">
                <DollarSign className="w-6 h-6 text-green-600 mr-2" />
                <h3 className="text-sm font-medium text-green-900">Total Spent</h3>
              </div>
              <p className="text-3xl font-bold text-green-900">{formatCurrency(customer.total_spent)}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center mb-3">
                <TrendingUp className="w-6 h-6 text-purple-600 mr-2" />
                <h3 className="text-sm font-medium text-purple-900">Lifetime Value</h3>
              </div>
              <p className="text-3xl font-bold text-purple-900">{formatCurrency(customer.ltv)}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-base font-medium text-gray-900">{customer.email}</p>
                </div>
              </div>

              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-base font-medium text-gray-900">{customer.location}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">First Order</p>
                  <p className="text-base font-medium text-gray-900">{customer.first_order}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Last Order</p>
                  <p className="text-base font-medium text-gray-900">{customer.last_order}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

