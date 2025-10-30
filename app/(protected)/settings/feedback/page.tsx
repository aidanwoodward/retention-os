import { FeedbackTool } from "@/components/ui/feedback-tool";

export default function FeedbackPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback & Support</h1>
          <p className="text-gray-600">
            Your feedback helps us build a better Retention OS experience
          </p>
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
