/**
 * MVP marketing spend CSV contract (Sprint 4C).
 *
 * One row per month × channel slice (duplicates are aggregated with a warning — see `normalise-marketing-spend.ts`).
 * Preview/import only — no persistence or CAC wiring in this sprint.
 */

/** Canonical headers (case-insensitive; normalised to snake_case). */
export const MARKETING_SPEND_CSV_COLUMNS = [
  "month",
  "channel",
  "spend",
  "platform",
  "campaign",
  "country",
  "objective",
  "ad_account",
] as const;

export type MarketingSpendCsvColumn = (typeof MARKETING_SPEND_CSV_COLUMNS)[number];

export const MARKETING_SPEND_CSV_REQUIRED_COLUMNS: readonly MarketingSpendCsvColumn[] = ["month", "channel", "spend"];

export const MARKETING_SPEND_CSV_FIELD_HELP: Readonly<Record<MarketingSpendCsvColumn, string>> = {
  month: "Calendar month for the spend bucket (YYYY-MM preferred; ISO or common date strings accepted). Output is always YYYY-MM.",
  channel: "Stable opaque channel key (e.g. paid_social, google_search) for later CAC joins.",
  spend: "Non-negative spend amount in base currency for this month × channel (currency symbol and commas tolerated).",
  platform: "Optional ad platform or publisher label — stored on row when present.",
  campaign: "Optional campaign name — stored when present.",
  country: "Optional country or geo slice.",
  objective: "Optional campaign objective.",
  ad_account: "Optional ad account or MCC id.",
};
