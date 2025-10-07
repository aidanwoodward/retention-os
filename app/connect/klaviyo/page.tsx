"use client";

import { useState } from "react";

export default function ConnectKlaviyoPage() {
  const [apiKey, setApiKey] = useState("");

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    alert("In the MVP we’ll store this in Supabase and mark Klaviyo as connected.");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">Connect Klaviyo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter a Private API Key (scoped to Lists, Profiles, and Metrics).
        </p>

        <form onSubmit={onSave} className="mt-6 space-y-3">
          <input
            type="password"
            placeholder="Klaviyo Private API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring"
          />
          <button
            type="submit"
            className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
          >
            Save (placeholder)
          </button>
        </form>
      </div>
    </main>
  );
}
