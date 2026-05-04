/**
 * Customer identity for cohort, LTV, and acquisition diagnostics.
 *
 * Distinct from `Customer` rows in Supabase (`lib/database.ts`): this shape is normalized
 * for metric engines and demo adapters, not persisted storage columns.
 */

export type CustomerId = string;

/** Core economics unit: one shopper keyed for cross-order rollup. */
export interface Customer {
  id: CustomerId;
  /** When the shopper placed their first qualifying order — anchors cohort month and cohort-based LTV. */
  firstOrderAt: string;
  /** Latest observed qualifying order timestamp; used for recency/churn proxies. */
  lastOrderAt?: string;
  /** Normalized attribution for how the shopper was acquired (UTM rollup, Shopify channel tag, referral, etc.). */
  acquisitionChannel?: string;
  /** Product identifier from the shopper's first qualifying order — inputs first-product cohort quality metrics. */
  firstProductId?: string;
}
