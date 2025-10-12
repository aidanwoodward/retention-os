"use client";

import { useState, FormEvent, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] =
    useState<"idle" | "sending_link" | "sending_code" | "sent" | "error">(
      "idle"
    );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "auth_callback_failed") {
      setStatus("error");
      setMessage("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  async function sendMagicLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending_link");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Magic link sent. Check your inbox.");
  }

  async function sendEmailCode() {
    setStatus("sending_code");
    setMessage("");

    // Use signInWithOtp without emailRedirectTo to get OTP code
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { 
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      console.error("OTP send error:", error);
      return;
    }

    console.log("OTP sent successfully:", data);

    setStatus("sent");
    setMessage("6-digit code sent. Check your email.");
    router.push(`/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-gray-600">
          Use a magic link or a 6-digit code.
        </p>

        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@brand.com"
            className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={status === "sending_link"}
              className="w-full rounded-xl bg-black p-3 text-white hover:opacity-90 disabled:opacity-50"
            >
              {status === "sending_link" ? "Sending…" : "Send magic link"}
            </button>

            <button
              type="button"
              onClick={sendEmailCode}
              disabled={status === "sending_code" || !email}
              className="w-full rounded-xl border p-3 hover:bg-gray-50 disabled:opacity-50"
              title={!email ? "Enter email first" : ""}
            >
              {status === "sending_code" ? "Sending…" : "Send 6-digit code"}
            </button>
          </div>
        </form>

        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      </div>
    </div>
  );
}
