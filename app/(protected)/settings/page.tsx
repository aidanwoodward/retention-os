"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDemoMode } from "@/lib/demo-mode/context";
import { supabase } from "@/lib/supabaseClient";

interface SessionIdentity {
  email: string;
  name: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const { demoMode, setDemoMode, isDemoModeAvailable } = useDemoMode();

  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled) {
        if (user) {
          setIdentity({
            email: user.email ?? "",
            name: user.user_metadata?.full_name ?? "User",
          });
        }
        setLoading(false);
      }
    }

    void loadIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDemoToggle = () => {
    if (!isDemoModeAvailable) return;
    setDemoMode(!demoMode);
  };

  const handleSignOut = async () => {
    try {
      await fetch("/auth/signout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      await supabase.auth.signOut();
      router.push("/login");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Workspace preferences and session controls for this command centre.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Workspace</h2>
          {!isDemoModeAvailable ? (
            <p className="mt-1 text-sm text-gray-600">
              Demo Mode is disabled for this workspace.
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Demo Mode</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    When enabled, non-GET network writes are skipped on this device so you can explore without persisting changes. Demo dataset metrics on the command centre are separate from your CSV upload on Data.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={demoMode}
                  onClick={handleDemoToggle}
                  className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    demoMode ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span className="sr-only">Toggle demo mode</span>
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow transition ${
                      demoMode ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Your preference is saved on this device.
              </p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Session</h2>
          <p className="mt-1 text-sm text-gray-600">
            Signed-in identity when available. Profile editing is not available in this MVP.
          </p>

          {loading ? (
            <div className="mt-4 animate-pulse space-y-2">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="h-4 w-56 rounded bg-gray-200" />
            </div>
          ) : identity ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-gray-700">Name</dt>
                <dd className="text-gray-900">{identity.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Email</dt>
                <dd className="text-gray-900">{identity.email || "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-gray-600">No signed-in session detected.</p>
          )}

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-6 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
