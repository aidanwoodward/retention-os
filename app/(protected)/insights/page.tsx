import Link from "next/link";

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold text-gray-900">Insights</h1>
      <p className="mt-3 text-sm text-gray-600">
        Coming next — deterministic diagnostic cards and decisions will live here. No live metrics on this page yet.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
