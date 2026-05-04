import Link from "next/link";

export default function DataPage() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold text-gray-900">Data</h1>
      <p className="mt-3 text-sm text-gray-600">
        Coming next — demo mode, source status, and import paths will live here. No data operations on this page yet.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
