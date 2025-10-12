"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

/**
 * Header component with authentication state and logout functionality
 * Hides itself on public/auth pages (/login, /verify, /auth/callback)
 */
export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hide header on public/auth pages
  const publicPaths = ["/login", "/verify", "/auth/callback"];
  const isPublicPage = publicPaths.some(path => pathname.startsWith(path));

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Handle logout by calling server-side signout route
   */
  const handleLogout = async () => {
    try {
      await fetch("/auth/signout", { method: "POST" });
      // The server route will redirect, but we can also navigate client-side as backup
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: sign out on client side
      await supabase.auth.signOut();
      router.push("/login");
    }
  };

  // Don't render header on public pages
  if (isPublicPage) {
    return null;
  }

  // Don't render until we know the auth state
  if (loading) {
    return (
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Retention OS</h1>
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
    );
  }

  // Don't render if no user (should be redirected by middleware)
  if (!user) {
    return null;
  }

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Retention OS</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
