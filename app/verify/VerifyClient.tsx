"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState<string>(params.get("email") ?? "");
  const [code, setCode] = useState<string>("");
  const [status, setStatus] = useState<"idle"|"verifying"|"error">("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("verifying");
    setMessage("");

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      console.error("OTP verification error:", error);
      return;
    }

    console.log("OTP verified successfully:", data);
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-semibold">Enter 6-digit code</h1>
        <p className="mb-6 text-sm text-gray-600">
          We sent a code to your email. Paste it below to sign in.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@brand.com"
            className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring"
          />
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="w-full rounded-lg border border-gray-300 p-3 tracking-[0.3em] text-center font-mono text-lg"
          />
          <button
            type="submit"
            disabled={status === "verifying"}
            className="w-full rounded-xl bg-black p-3 text-white hover:opacity-90 disabled:opacity-50"
          >
            {status === "verifying" ? "Verifying…" : "Verify code"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      </div>
    </div>
  );
}