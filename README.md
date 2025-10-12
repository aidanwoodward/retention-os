# Retention OS

A Next.js 15 application for e-commerce retention analytics, built with Supabase authentication and designed to integrate with Shopify and Klaviyo.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase with SSR cookies
- **Deployment**: Vercel
- **Database**: Supabase (PostgreSQL)

## Features

- 🔐 **Authentication**: Magic link and 6-digit OTP via Supabase
- 🛡️ **Protected Routes**: Middleware-based route protection
- 📊 **Dashboard**: Analytics overview for retention metrics
- 🔌 **Integrations**: Shopify and Klaviyo connection placeholders
- 🎨 **Modern UI**: Clean, responsive design with loading states

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

### Protected Routes
- `/dashboard` - Main analytics dashboard
- `/connect/shopify` - Shopify integration setup
- `/connect/klaviyo` - Klaviyo integration setup

### Auth Components
- **Header**: Shows user email and logout button (only on protected pages)
- **Middleware**: Automatically redirects unauthenticated users to login
- **Server-side logout**: POST to `/auth/signout` clears SSR cookies

## Project Structure

```
app/
├── (protected)/           # Protected route group with header
│   ├── layout.tsx        # Protected layout with Header component
│   ├── dashboard/        # Analytics dashboard
│   └── connect/          # Integration setup pages
├── auth/
│   ├── callback/         # OAuth callback handler
│   └── signout/          # Server-side logout route
├── components/           # Reusable UI components
├── login/               # Login page with dual auth options
├── verify/              # 6-digit code verification
└── globals.css          # Global styles
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
