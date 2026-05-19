"use client";

import { Suspense } from "react";
import { FeedbackTool } from "@/components/ui/feedback-tool";
import { useSearchParams } from "next/navigation";

function FeedbackContent() {
  const searchParams = useSearchParams();
  const area = searchParams.get("area");

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback & Support</h1>
          <p className="text-gray-600">
            Your feedback helps us build a better Retention OS experience
          </p>
          {area && (
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Context: {area.charAt(0).toUpperCase() + area.slice(1).replace(/-/g, " ")}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex justify-center">
          <FeedbackTool />
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need immediate help? Contact us at{" "}
            <a href="mailto:support@retention-os.com" className="text-blue-600 hover:underline">
              support@retention-os.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      </div>
    }>
      <FeedbackContent />
    </Suspense>
  );
}
