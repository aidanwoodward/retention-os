import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-6"></div>
            <div className="h-12 bg-gray-200 rounded mb-3"></div>
            <div className="flex gap-2">
              <div className="h-12 bg-gray-200 rounded flex-1"></div>
              <div className="h-12 bg-gray-200 rounded flex-1"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginClient />
    </Suspense>
  );
}
