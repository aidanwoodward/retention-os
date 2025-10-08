import { Suspense } from "react";
import VerifyClient from "./VerifyClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-6"></div>
            <div className="h-12 bg-gray-200 rounded mb-3"></div>
            <div className="h-12 bg-gray-200 rounded mb-3"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    }>
      <VerifyClient />
    </Suspense>
  );
}
