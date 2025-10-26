"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { LoadingButton } from "@/components/ui/loading-buttons";

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

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@brand.com"
              className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Enter 6-digit code
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="text-center text-sm text-gray-600">
              {code === "" ? (
                <>Enter the 6-digit code sent to your email.</>
              ) : (
                <>You entered: {code}</>
              )}
            </div>
          </div>
          
          <LoadingButton
            isLoading={status === "verifying"}
            onClick={onSubmit}
            loadingText="Verifying..."
            className="w-full rounded-xl bg-black p-3 text-white hover:opacity-90"
          >
            Verify Code
          </LoadingButton>
        </form>

        {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      </div>
    </div>
  );
}