"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CohortPeriod {
  period_number: number
  order_month: string
  active_customers: number
  total_orders: number
  total_revenue: number
  retention_rate_percent: number
}

interface CohortData {
  cohort_month: string
  cohort_size: number
  periods: CohortPeriod[]
}

interface CohortRetentionTableProps {
  cohorts: CohortData[]
  maxWeeks?: number
  className?: string
}

/**
 * Calculate background color intensity based on retention rate
 * Week 0 is always darkest blue (100%), subsequent weeks scale from retention percentage
 * Colors match the reference design: darker blue for higher retention, lighter for lower
 */
function getCellBackgroundColor(week: number, retentionRate: number): string {
  if (week === 0) {
    return "bg-blue-700" // Darkest blue for Week 0 (always 100%)
  }
  
  // Scale from dark blue (high retention) to very light blue (low retention)
  // Matching the visual gradient from the reference image
  if (retentionRate >= 70) return "bg-blue-500"
  if (retentionRate >= 50) return "bg-blue-400"
  if (retentionRate >= 30) return "bg-blue-300"
  if (retentionRate >= 15) return "bg-blue-200"
  return "bg-blue-100"
}

function getCellTextColor(week: number, retentionRate: number): string {
  if (week === 0) {
    return "text-white" // White text on dark blue Week 0
  }
  // For subsequent weeks, use dark text on lighter backgrounds
  if (retentionRate >= 30) {
    return "text-gray-900" // Dark text on medium-light backgrounds
  }
  return "text-gray-800" // Slightly lighter dark text for very light backgrounds
}

export function CohortRetentionTable({
  cohorts,
  maxWeeks = 10,
  className,
}: CohortRetentionTableProps) {
  // Format cohort date
  const formatCohortDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Format customer count
  const formatCustomerCount = (count: number) => {
    return count.toLocaleString()
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white border-r border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex flex-col">
                <span>Cohort</span>
                <span className="text-[10px] font-normal text-gray-400 mt-0.5">
                  Initial customers
                </span>
              </div>
            </th>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <th
                key={i}
                className="border-b border-gray-200 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]"
              >
                Week {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort, cohortIndex) => {
            // Find Week 0 period (period_number === 0)
            const week0Period = cohort.periods.find((p) => p.period_number === 0)
            const initialCustomers = week0Period?.active_customers ?? cohort.cohort_size

            return (
              <tr
                key={cohort.cohort_month}
                className={cn(
                  "border-b border-gray-100",
                  cohortIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                )}
              >
                {/* Cohort column */}
                <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCohortDate(cohort.cohort_month)}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {formatCustomerCount(initialCustomers)} customers
                    </span>
                  </div>
                </td>

                {/* Week columns */}
                {Array.from({ length: maxWeeks }, (_, weekIndex) => {
                  const period = cohort.periods.find((p) => p.period_number === weekIndex)
                  
                  if (!period) {
                    // Empty cell for future weeks - light grey with horizontal bar placeholder
                    return (
                      <td
                        key={weekIndex}
                        className="px-3 py-4 text-center bg-gray-50/80 border-r border-gray-100"
                      >
                        <div className="flex items-center justify-center h-16">
                          <div className="w-3/4 h-0.5 bg-gray-300 rounded" />
                        </div>
                      </td>
                    )
                  }

                  const retentionRate = period.retention_rate_percent
                  const customerCount = period.active_customers
                  const bgColor = getCellBackgroundColor(weekIndex, retentionRate)
                  const textColor = getCellTextColor(weekIndex, retentionRate)

                  return (
                    <td
                      key={weekIndex}
                      className={cn(
                        "px-3 py-4 text-center border-r border-gray-100 transition-colors",
                        bgColor
                      )}
                    >
                      <div className="flex flex-col items-center justify-center min-h-[64px]">
                        <span
                          className={cn(
                            "text-sm font-semibold mb-1",
                            textColor
                          )}
                        >
                          {retentionRate.toFixed(1)}%
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            weekIndex === 0 ? "text-blue-50" : textColor
                          )}
                        >
                          {formatCustomerCount(customerCount)}
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

