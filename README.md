# Retention OS

A Next.js 15 application for e-commerce retention analytics, built with Supabase authentication and designed to integrate with Shopify and Klaviyo.

<!-- Updated: Enhanced with 5-year growth patterns and geographic insights -->
<!-- Force deployment: Revenue Cohorts page with AI Analysis -->
<!-- Fixed Git email configuration for Vercel deployment -->
<!-- Fresh commit with correct author email for Vercel -->
<!-- Final fix: Repository-level Git config -->

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase with SSR cookies
- **Deployment**: Vercel
- **Database**: Supabase (PostgreSQL)

## Features

- 🔐 **Flexible Auth**: Magic link and 6-digit OTP flows powered by Supabase
- 🛡️ **Protected Workspace**: Middleware-enforced access with shared layout, navigation, and session-aware header
- 📊 **Analytics Modules**: Executive dashboards, revenue cohorts, retention curves, LTV summaries, KPI snapshots, and downloadable reports
- 🧠 **AI Insights**: Cohort analysis assistants in `components/ai/AIAnalysis.tsx` synthesize notable trends and suggested next steps
- 🧭 **Customer & Product Intelligence**: Dedicated areas for customer lists, segments, profiles, product performance, cross-sell, and replenishment views
- 🔄 **Data Operations**: Sync status, dummy-data generation endpoints, and canonical schema queries for customers/orders
- 🔌 **Integrations**: Shopify OAuth flow, Klaviyo connection scaffold, and integration status surface
- 🎨 **Modern UI**: Premium gradient design, responsive navigation, and consistent UX patterns built with Tailwind

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

# Shopify Configuration (for OAuth)
SHOPIFY_API_KEY=your_shopify_app_api_key
SHOPIFY_API_SECRET=your_shopify_app_api_secret

# Klaviyo Configuration (for API integration)
KLAVIYO_API_KEY=your_klaviyo_private_api_key
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

The app uses Supabase for authentication with the following flow:

### Login Options
- **Magic Link**: Click the link in your email to sign in
- **6-Digit Code**: Enter the code sent to your email on the verify page

### Protected Workspace Modules

- **Executive**
  - `/executive` – Home overview dashboard with high-level KPIs
  - `/executive/reconciliation` – Data reconciliation panel
  - `/executive/exports` – Export management
- **Cohorts**
  - `/cohorts` – Cohort explorer with filters and export actions
  - `/cohorts/category` – Category-level cohort comparisons
  - `/cohorts/composition` – Composition breakdowns
- **Retention & LTV**
  - `/retention-ltv/revenue-cohorts` – Revenue cohort analysis
  - `/retention-ltv/curves` – Retention curves
  - `/retention-ltv/ltv-cohorts` – CLR & LTV cohorts
  - `/retention-ltv/repeat-rates` – Repeat purchase rates
- **Retention Strategies**
  - `/retention` – Retention command center
  - `/retention/churn` – Churn diagnostics (placeholder)
  - `/retention/curve` – Curve visualization (placeholder)
  - `/retention/reactivation` – Reactivation opportunities (placeholder)
- **Customers**
  - `/customers` – Customer overview (placeholder)
  - `/customers/list` – Tabular customer listing
  - `/customers/profile` – Customer profile drill-down
  - `/customers/segments` – Segment membership view
- **Customer Intelligence**
  - `/customer-intelligence/composition` – Customer composition
  - `/customer-intelligence/segments` – Segment breakdowns
  - `/customer-intelligence/profiles` – Persona-style profiles
- **Products**
  - `/products` – Product overview
  - `/products/performance` – Performance dashboard
  - `/products/replenishment` – Replenishment planner
  - `/products/cross-sell` – Cross-sell insights
- **Product Economics**
  - `/product-economics/performance` – Performance metrics
  - `/product-economics/concentration` – Concentration curve
  - `/product-economics/discounts` – Discount usage
  - `/product-economics/replenishment` – Replenishment frequency
- **Financials**
  - `/financials/revenue` – Revenue intelligence
  - `/financials/ltv-summary` – LTV summary
  - `/financials/forecasts` – Forecasts & scenarios
- **Reports & Guides**
  - `/reports` – Reporting hub
  - `/guides` – Best-practice guides
- **Integrations & Sync**
  - `/connect/shopify` – Shopify OAuth connection flow
  - `/connect/klaviyo` – Klaviyo connection scaffold
  - `/integrations` – Integration status board
  - `/sync` – Sync job overview
- **Feedback & Settings**
  - `/feedback` – Feedback submission
  - `/settings` – Account settings
  - `/settings/integrations` – Integration management
  - `/settings/feedback` – Support & feedback inbox

### Auth Components
- **Header**: Shows user email and logout button (only on protected pages)
- **Middleware**: Automatically redirects unauthenticated users to login
- **Server-side logout**: POST to `/auth/signout` clears SSR cookies

## Project Structure

```
app/
├── (protected)/              # Protected workspace layout, navigation, modules
│   ├── cohorts/              # Cohort analytics surfaces
│   ├── connect/              # Integration setup pages (Shopify, Klaviyo)
│   ├── customer-intelligence/# Customer composition, segments, profiles
│   ├── customers/            # Customer list, profile, and segments
│   ├── dashboard/            # Executive dashboard shell
│   ├── executive/            # Executive summaries and exports
│   ├── financials/           # Revenue, LTV, and forecast views
│   ├── guides/               # Guides library
│   ├── integrations/         # Integration status surface
│   ├── product-economics/    # Economics dashboards
│   ├── products/             # Product performance + cross-sell
│   ├── reports/              # Reporting hub
│   ├── retention/            # Retention strategy workbench
│   ├── retention-ltv/        # Retention cohorts + curves
│   ├── segments/             # Segment explorer
│   ├── settings/             # Settings + feedback
│   └── sync/                 # Sync status + tooling
├── api/                      # Edge routes for metrics, reports, integrations
├── auth/                     # OAuth callback + signout
├── components/               # Reusable UI components (including AI widgets)
├── login/                    # Login page with dual auth options
├── verify/                   # 6-digit code verification
└── globals.css               # Global styles
```

## Deployment

The app is deployed on Vercel and automatically builds from the `main` branch:

**Live URL**: https://retention-os-nine.vercel.app

### Supabase Configuration

Ensure your Supabase project has:
- Auth redirect URL set to: `https://your-domain.vercel.app/auth/callback`
- Email templates configured for magic links and OTP codes
- Run the database migration: `supabase/migrations/001_create_shopify_connections.sql`

### Shopify App Setup

To enable Shopify integration:

1. **Create a Shopify App**:
   - Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
   - Create a new app and note your API key and secret
   - Set the redirect URL to: `https://your-domain.vercel.app/api/shopify/callback`

2. **Configure Environment Variables**:
   - Add `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` to your `.env.local`
   - Add the same variables to your Vercel deployment settings

3. **Install the App**:
   - Users can now connect their Shopify stores via `/connect/shopify`
   - The app will have access to read products, orders, and customers

## Development Notes

- Uses `@supabase/ssr` for proper server-side rendering with cookies
- Protected routes are wrapped in a route group `(protected)` for shared layout
- All auth state changes are handled client-side with real-time updates
- Middleware protects routes without breaking SSR performance
