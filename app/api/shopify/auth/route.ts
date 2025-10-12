import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Initiates Shopify OAuth flow
 * Redirects user to Shopify's authorization page
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");
  
  if (!shop) {
    return NextResponse.redirect(new URL("/connect/shopify?error=no_shop_domain", request.url));
  }

  // Validate shop domain format - allow store names without .myshopify.com
  const cleanShop = shop.replace(".myshopify.com", "").toLowerCase();
  if (!cleanShop || cleanShop.length < 3) {
    return NextResponse.redirect(new URL("/connect/shopify?error=invalid_shop_domain", request.url));
  }

  const cookieStore = await cookies();
  
  // Get the current user's session to associate the Shopify connection
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}, // Server Components can't mutate headers
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Shopify OAuth parameters
  const shopifyApiKey = process.env.SHOPIFY_API_KEY;
  const shopifyScopes = "read_products,read_orders,read_customers,read_analytics";
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/shopify/callback`;
  
  if (!shopifyApiKey) {
    return NextResponse.json({ error: "Shopify API key not configured" }, { status: 500 });
  }

  // Generate a random state parameter for security
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store state and user ID in cookie for verification
  cookieStore.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });
  
  cookieStore.set("shopify_oauth_user_id", session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });

  // Normalize shop domain
  const shopDomain = `${cleanShop}.myshopify.com`;

  // Build Shopify OAuth URL
  const shopifyAuthUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  shopifyAuthUrl.searchParams.set("client_id", shopifyApiKey);
  shopifyAuthUrl.searchParams.set("scope", shopifyScopes);
  shopifyAuthUrl.searchParams.set("redirect_uri", redirectUri);
  shopifyAuthUrl.searchParams.set("state", state);

  console.log("Redirecting to Shopify OAuth:", shopifyAuthUrl.toString());
  console.log("User ID:", session.user.id);
  console.log("Shop domain:", shopDomain);

  return NextResponse.redirect(shopifyAuthUrl.toString());
}
