/**
 * Channel label for attribution and blending marketing spend vs outcomes.
 *
 * Keep as opaque string keys (e.g. `meta_paid`, `google_paid_search`) — normalization happens in ingestion.
 */
export type ChannelKey = string;

/** Optional richer channel record for lookups and dashboards without forcing every API to hydrate it. */
export interface Channel {
  key: ChannelKey;
  displayName?: string;
}

/** Calendar bucket of discretionary acquisition spend usable for blended CAC. */
export interface MarketingSpend {
  /** Calendar month anchor (recommended `YYYY-MM-01`) for aligning cohorts vs spend calendars. */
  month: string;
  channel?: ChannelKey;
  /** Dollars spent excluding internal labor for MVP simplicity. */
  spend: number;
}
