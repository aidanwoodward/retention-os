"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ShopifyConnectClient() {
  const [isConnected, setIsConnected] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [inputShopDomain, setInputShopDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    checkConnectionStatus();
    
    // Check for OAuth callback results
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    
    if (success) {
      // Refresh connection status after successful OAuth
      setTimeout(checkConnectionStatus, 1000);
    }
    
    if (error) {
      console.error("Shopify OAuth error:", error);
      if (error === "no_shop_domain") {
        alert("Please enter your Shopify store domain");
      } else if (error === "invalid_shop_domain") {
        alert("Please enter a valid Shopify store domain");
      }
    }
  }, [searchParams]);

  const checkConnectionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("shopify_connections")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .single();

      if (!error && data) {
        setIsConnected(true);
        setShopDomain(data.shop_domain);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (!inputShopDomain.trim()) {
      alert("Please enter your Shopify store domain");
      return;
    }
    
    // Redirect to Shopify OAuth with shop domain
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(inputShopDomain.trim())}`;
  };

  const handleDisconnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("shopify_connections")
        .update({ is_active: false })
        .eq("user_id", session.user.id);

      if (!error) {
        setIsConnected(false);
        setShopDomain("");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-6"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">Connect Shopify</h1>
        
        {isConnected ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Connected to {shopDomain}
                  </p>
                  <p className="text-sm text-green-600">
                    Your Shopify store is successfully connected
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDisconnect}
              className="rounded-xl border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50"
            >
              Disconnect Shopify
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Shopify store to sync orders, customers, and analytics data.
            </p>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="shop-domain" className="block text-sm font-medium text-gray-700 mb-1">
                  Shopify Store Domain
                </label>
                <div className="flex">
                  <input
                    id="shop-domain"
                    type="text"
                    placeholder="your-store"
                    value={inputShopDomain}
                    onChange={(e) => setInputShopDomain(e.target.value)}
                    className="flex-1 rounded-l-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    .myshopify.com
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your store name (e.g., &quot;your-store&quot; for your-store.myshopify.com)
                </p>
              </div>
            </div>
            
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">What you&apos;ll get:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Daily sync of orders and customers</li>
                <li>• Churn risk scoring based on purchase patterns</li>
                <li>• Automated winback campaign triggers</li>
                <li>• Real-time retention analytics</li>
              </ul>
            </div>
            
            <button
              onClick={handleConnect}
              disabled={!inputShopDomain.trim()}
              className="w-full rounded-xl bg-black px-4 py-3 text-white hover:opacity-90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect Shopify Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
