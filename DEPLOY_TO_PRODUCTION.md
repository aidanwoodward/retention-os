# Production Deployment Guide - Tremor Integration

## Step 1: Environment Variables Check ✅

**Action Required**: Verify in Vercel Dashboard

1. Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
2. Confirm these exist for **Production** environment:

### Required:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` 
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Optional (only if integrations are used):
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `KLAVIYO_API_KEY`

### Demo Mode (should be unset):
- `DISABLE_DEMO_MODE` - **Should NOT be set** or should NOT be "true"
  - If unset: Demo Mode defaults OFF in production ✅ (correct)
  - If set to "true": Demo Mode completely disabled (also acceptable)

### Optional:
- `TZ=Europe/London`

**Status**: ⏳ **PENDING YOUR VERIFICATION**

---

## Step 2: Promote Preview → Production 🚀

**Action Required**: Promote in Vercel Dashboard

1. Go to: https://vercel.com/dashboard → Your Project → Deployments
2. Find the latest Preview deployment:
   - **Commit**: `e555df7` - "Add .npmrc to enable legacy-peer-deps for Tremor React 19 compatibility"
   - **Status**: Should show ✅ Ready
3. Click the **"..."** menu (three dots) on that deployment
4. Select **"Promote to Production"**
5. Confirm the promotion

**Expected Result**: 
- If "Promote" option available: Uses existing build (fast, ~30 seconds)
- If rebuild required: New build starts automatically

**If Rebuild Required**:
- Monitor build logs
- Expected: `.npmrc` should be detected, `legacy-peer-deps=true` applied
- Build should complete in ~18-20 seconds
- Look for: "✓ Compiled successfully"

**Status**: ⏳ **PENDING YOUR ACTION**

---

## Step 3: Post-Deploy Smoke Test 🧪

**Action Required**: Test Production URL after promotion

### Production URL:
`https://retention-os-nine.vercel.app` (or your custom domain)

### Test Checklist:

#### Page Load Tests:
- [ ] `/customers` - Loads correctly
- [ ] `/retention` - Loads correctly  
- [ ] `/products` - Loads correctly
- [ ] `/segments` - Loads correctly
- [ ] `/financials` - Loads correctly
- [ ] `/reports` - Loads correctly
- [ ] `/integrations` - Loads correctly

#### Demo Mode Test:
1. [ ] Navigate to `/settings`
2. [ ] Find "Demo Mode" toggle in Workspace tab
3. [ ] Toggle **ON** → Verify charts render with data
4. [ ] Toggle **OFF** → Verify "connect your data" empty states appear

#### Chart Functionality Tests:
Pick one chart per page to verify:

**Retention Curve** (`/retention/curve`):
- [ ] Chart renders (Tremor LineChart)
- [ ] Values formatted as percentages (e.g., "64.5%")
- [ ] Legend is visible and focusable
- [ ] Tooltip appears on hover

**Product Performance** (`/products/performance`):
- [ ] Chart renders (Tremor BarChart)
- [ ] Values formatted as GBP currency (e.g., "£1,234")
- [ ] Chart styling matches design tokens (rounded corners, shadows)

**Churn Risk** (`/retention/churn`):
- [ ] Chart renders (Tremor AreaChart)
- [ ] Values formatted as compact numbers (e.g., "1.2K")
- [ ] Stacked areas display correctly

#### Console Check:
- [ ] Open Browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Verify: No hydration errors
- [ ] Verify: No React warnings
- [ ] Verify: No Tremor-related errors
- [ ] Verify: No Tailwind class warnings

**Status**: ⏳ **PENDING YOUR TESTING**

---

## Step 4: Report Back 📊

**Copy and fill out this template:**

```
Production URL: <paste your production URL here>

Smoke Test Summary:

✅ Pages load (Customers/Retention/Products/Segments/Financials/Reports/Integrations)
✅ Tremor charts styled & rendering
✅ Demo Mode toggle works (ON → charts, OFF → empty)
✅ Formatters correct (GBP/percent/compact)
✅ No console/hydration warnings

Build Log Notes: <paste any notable items from build logs, build time>

Status: ✅ PRODUCTION LIVE — Tremor integration + UI polish
```

---

## Rollback Plan (If Needed) 🔄

**If deployment fails or issues found:**

1. Go to Vercel Dashboard → Deployments
2. Find the **previous working production deployment**
3. Click **"..."** menu → **"Promote to Production"**
4. Confirm rollback

**Previous stable commit**: `fd8f264` (before Tremor migration)

---

## Troubleshooting

### Build Fails:
- Check if `.npmrc` file exists in repo
- Verify `legacy-peer-deps=true` is set
- Check build logs for npm install errors

### Charts Don't Render:
- Check browser console for errors
- Verify Tremor components are imported correctly
- Check if Demo Mode is ON (required for charts to show)

### Demo Mode Not Working:
- Verify `DISABLE_DEMO_MODE` is not set to "true" in Production env vars
- Check browser localStorage for demo mode state
- Verify Settings page loads correctly

---

**Ready to proceed?** Start with Step 1 (Environment Variables check) and report back!

