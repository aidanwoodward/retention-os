# RetentionOS

RetentionOS is a customer-economics operating system for ecommerce brands. Its current MVP is an eight-route Revenue Durability Command Centre for understanding cohorts, retention, LTV, acquisition economics, first-product customer quality, and diagnostic insights.

The canonical architecture and complete route/API/dependency audit live in [docs/RETENTIONOS_ARCHITECTURE.md](docs/RETENTIONOS_ARCHITECTURE.md).

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase with SSR cookies; route coverage is partial and under investigation
- **Deployment**: Vercel
- **Database**: Supabase (PostgreSQL)

## Features

- **Canonical metric path:** `RetentionOSDataset → lib/metrics → view models → UI`
- **Two explicit sources:** deterministic demo data or a validated CSV saved to the current browser session
- **Customer economics:** cohort retention, repeat purchase behavior, revenue/contribution LTV, CAC, LTV:CAC, payback, and first-product quality
- **Revenue Durability Posture:** transparent `Healthy` / `Mixed` / `Watch` rules, not a numeric score
- **Rules-based insights:** deterministic evidence cards from `lib/insights`, not hidden AI output
- **Supabase authentication:** magic link and OTP flows. Middleware session enforcement is limited to the path prefixes listed in `middleware.ts::protectedPaths`; coverage elsewhere is partial or unresolved.

CSV remains the supported session-based ingestion, QA, and fallback workflow. It is not persisted to Supabase and is frozen against feature expansion. Shopify is the intended future primary commercial connection after persistence, normalization, security, and canonical metric-parity work.

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account and project
- Vercel account (for deployment)

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Shopify investigation configuration (not a supported install flow)
SHOPIFY_API_KEY=your_shopify_app_api_key
SHOPIFY_API_SECRET=your_shopify_app_api_secret

```

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd retention-os
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication Flow

The app implements Supabase login, verification, callback, and signout flows. This does not imply universal workspace protection: `middleware.ts::protectedPaths` currently session-gates only `/dashboard`, `/sync`, and `/connect` prefixes in production, while `/dashboard` also has a page-level gate. Authentication policy for other retained routes remains unresolved and is tracked in the canonical architecture investigation register.

### Login Options
- **Magic Link**: Click the link in your email to sign in
- **6-Digit Code**: Enter the code sent to your email on the verify page

### Command-centre and settings routes

- `/dashboard` — executive customer-economics overview and Revenue Durability Posture
- `/cohorts` — acquisition-month cohorts and UTC Month+N matrix
- `/retention` — repeat, first-to-second, and calendar-month retention
- `/ltv` — revenue and contribution LTV ladders
- `/acquisition` — CAC, LTV:CAC, and payback when spend is available
- `/products` — first-product customer quality
- `/insights` — deterministic diagnostic cards
- `/data` — demo/CSV source control, validation, spend, and margin assumptions
- `/settings` — primary-navigation settings prototype under investigation; displayed account, team, RLS, and usage state is not yet trustworthy live state

Other page and API files remain in the repository but are classified and contained according to the canonical architecture audit. Do not build new features on quarantined routes.

### Auth Components
- **Auth UI**: Login, verification, callback, and signout components exist; layout or route-group names do not prove authorization coverage
- **Middleware**: Refreshes Supabase sessions broadly but redirects unauthenticated requests only for the prefixes in `middleware.ts::protectedPaths`
- **Server-side logout**: `POST /auth/signout` clears SSR cookies and is retained auth infrastructure, but the active `NavUser` logout item is not wired to it

## Project Structure

```
app/
├── (protected)/              # Command-centre pages plus contained legacy files
├── api/                      # Parallel API/integration surface; see architecture audit
├── auth/                     # Supabase callback and signout
├── login/                    # Login page
└── verify/                   # OTP verification
lib/
├── data-source/              # RetentionOSDataset source selection and session state
├── demo/                     # Deterministic demo fixture
├── import/                   # CSV detection, validation, normalization, and preview
├── metrics/                  # Canonical pure metrics and page view models
├── insights/                 # Rules-based diagnostic layer
├── mvp/                      # Command-centre cohesion and containment
└── types/                    # Shared domain contracts
```

## Deployment

The canonical integration and PR target branch is `restart-retentionos-mvp`; sprint work occurs on scoped feature branches.

**Live URL**: https://retention-os-nine.vercel.app

### Supabase Configuration

Ensure your Supabase project has:
- Auth redirect URL set to: `https://your-domain.vercel.app/auth/callback`
- Email templates configured for magic links and OTP codes

### Shopify architecture status

`/connect/shopify` is currently redirected/contained and is not a supported installation workflow. The Shopify pages and handlers remain **investigate** architecture. Shopify is the intended future primary commercial connection only after account-scoped persistence, canonical normalization, security review, and metric-parity work are approved. Until then, use the session-based CSV path on `/data` for ingestion, QA, and fallback testing.

## Development Notes

- Uses `@supabase/ssr` for proper server-side rendering with cookies
- The `(protected)` route-group name organizes shared layout but does not itself enforce authentication
- Login/verification use client flows; callback and signout use server route handlers
- Current middleware enforcement is limited to `middleware.ts::protectedPaths`; see the canonical architecture auth investigation
