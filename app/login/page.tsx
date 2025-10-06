"use client";

import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) { setStatus("error"); setMessage(error.message); return; }
    setStatus("sent"); setMessage("Check your email for the sign-in link.");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-gray-600">
          Enter your email and we’ll send you a magic link.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@brand.com"
            className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring"
          />
          <button
            type="submit" disabled={status==="sending"}
            className="w-full rounded-xl bg-black p-3 text-white hover:opacity-90 disabled:opacity-50"
          >
            {status==="sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      </div>
    </div>
  );
}
