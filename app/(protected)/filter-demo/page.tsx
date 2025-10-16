import { FilterDemo } from "@/components/ui/filter-demo";

export default function FilterDemoPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">RetentionOS Filters Demo</h1>
        <p className="text-gray-600">Advanced filtering system for retention analytics</p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filter System</h2>
        <p className="text-gray-600 mb-6">
          Use the filter button below to explore different filter types for retention analytics:
        </p>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Available Filter Types:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Date Range:</strong> Filter by time periods (Last 30 days, Last 90 days, etc.)</li>
              <li>• <strong>Customer Type:</strong> New, Repeat, One-time, Loyal, VIP customers</li>
              <li>• <strong>Retention Status:</strong> Active, At Risk, Dormant, Churned, Reactivated</li>
              <li>• <strong>Revenue Tier:</strong> High Value, Medium Value, Low Value, Premium</li>
              <li>• <strong>Activity Level:</strong> Very Active, Active, Moderate, Low, Inactive</li>
              <li>• <strong>Cohort Period:</strong> Different time periods for cohort analysis</li>
              <li>• <strong>Order Frequency:</strong> Frequent, Regular, Occasional, One-time buyers</li>
              <li>• <strong>Last Purchase:</strong> When customers last made a purchase</li>
            </ul>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-2">Try the Filter System:</h3>
            <FilterDemo />
          </div>
        </div>
      </div>
    </div>
  );
}
