# Production Deployment Checklist - Tremor Integration

## ✅ Preflight Checks (COMPLETED)

- ✅ **Lint**: Passed with no errors
- ✅ **Typecheck**: Passed with no errors  
- ✅ **Build**: Completed successfully in 18.0s
- ✅ **No Tremor warnings**: Clean build
- ✅ **No Demo Mode issues**: Logic verified
- ✅ **No Tailwind v4 issues**: Build successful

## 🔐 Environment Variables (Verify in Vercel Dashboard)

### Required Production Variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional Integration Variables:
- `SHOPIFY_API_KEY` - Shopify OAuth API key (if using Shopify integration)
- `SHOPIFY_API_SECRET` - Shopify OAuth secret (if using Shopify integration)
- `KLAVIYO_API_KEY` - Klaviyo private API key (if using Klaviyo integration)

### Demo Mode Configuration:
- `DISABLE_DEMO_MODE` - Should be **unset** or **not set to "true"** in Production
  - If unset: Demo Mode defaults to OFF in production (correct behavior)
  - If set to "true": Demo Mode completely disabled (also acceptable)

### Optional:
- `TZ=Europe/London` - Timezone setting (optional but recommended)

## 🚀 Promote Preview → Production

### Steps:
1. Go to Vercel Dashboard → Your Project
2. Find the latest Preview deployment (commit: e555df7)
3. Click "Promote to Production" button
4. Confirm promotion (no rebuild needed if Preview build is recent)

### If Rebuild Required:
- Monitor build logs for any errors
- Expected: npm install should use `.npmrc` with `legacy-peer-deps=true`
- Build should complete successfully (~18-20 seconds)

## 🧪 Post-Deploy Smoke Test Checklist

### Pages to Test:
- [ ] `/customers` - Should show Tremor charts
- [ ] `/retention` - Should show Tremor charts  
- [ ] `/products` - Should show Tremor charts
- [ ] `/segments` - Should show Tremor charts
- [ ] `/financials` - Should show Tremor charts
- [ ] `/reports` - Should show Tremor charts
- [ ] `/integrations` - Should render correctly

### Demo Mode Test:
1. [ ] Go to `/settings`
2. [ ] Toggle Demo Mode **ON**
3. [ ] Verify charts render with deterministic data
4. [ ] Toggle Demo Mode **OFF**
5. [ ] Verify "connect your data" empty states appear

### Chart Functionality Test (one per page):
- [ ] **Retention Curve** (`/retention/curve`): 
  - GBP/percent formatting correct
  - Legend is focusable
  - Tooltip appears on hover
- [ ] **Product Performance** (`/products/performance`):
  - Currency formatting (GBP)
  - Chart renders correctly
- [ ] **Churn Risk** (`/retention/churn`):
  - Compact number formatting
  - Area chart stacks correctly

### Console Check:
- [ ] Open browser DevTools Console
- [ ] No hydration errors
- [ ] No React warnings
- [ ] No Tremor-related errors
- [ ] No Tailwind class warnings

## 📊 Expected Results

### Build Output:
- Build time: ~18-20 seconds
- All routes generated successfully
- No errors or warnings
- Tremor components bundled correctly

### Runtime:
- Charts render with Tremor styling
- Design tokens applied (rounded-2xl, shadows, spacing)
- Demo Mode toggle works correctly
- Formatters display GBP/percent/compact numbers correctly

## 📝 Production URL

After deployment, production URL will be:
`https://retention-os-nine.vercel.app` (or your custom domain)

## 🎯 Release Notes

**Release**: Production – Tremor integration + UI polish

**Changes**:
- Migrated all charts from Recharts to Tremor (with Recharts fallback)
- Added chart formatters (currency, percent, compact numbers)
- Applied consistent design tokens across all charts
- Maintained Demo Mode functionality
- Preserved all existing routes and data shapes

**Breaking Changes**: None

**Dependencies Added**: `@tremor/react@3.18.7` (with React 19 compatibility via legacy-peer-deps)

