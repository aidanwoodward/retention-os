import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Handles Shopify OAuth callback
 * Exchanges authorization code for access token and stores connection data
 */
export async function GET(request: NextRequest) {
  console.log("Shopify callback received:", request.url);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop");
  
  console.log("Callback params:", { code: !!code, state, shop });
  
  if (!code || !state || !shop) {
    return NextResponse.redirect(new URL("/connect/shopify?error=invalid_callback", request.url));
  }

  const cookieStore = await cookies();
  
  // Verify state parameter for security
  const storedState = cookieStore.get("shopify_oauth_state")?.value;
  const userId = cookieStore.get("shopify_oauth_user_id")?.value;
  
  console.log("Stored state:", storedState);
  console.log("Received state:", state);
  console.log("User ID from cookie:", userId);
  
  if (!storedState || state !== storedState || !userId) {
    console.log("State or user ID validation failed");
    return NextResponse.redirect(new URL("/connect/shopify?error=invalid_state", request.url));
  }

  // Clear OAuth cookies
  cookieStore.delete("shopify_oauth_state");
  cookieStore.delete("shopify_oauth_user_id");

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const { access_token } = await tokenResponse.json();

    // Get Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // Store Shopify connection in database
    const { error: insertError } = await supabase
      .from("shopify_connections")
      .upsert({
        user_id: userId,
        shop_domain: shop,
        access_token: access_token, // In production, encrypt this
        connected_at: new Date().toISOString(),
        is_active: true,
      });

    if (insertError) {
      console.error("Failed to store Shopify connection:", insertError);
      console.error("User ID:", userId);
      console.error("Shop domain:", shop);
      return NextResponse.redirect(new URL("/connect/shopify?error=database_error", request.url));
    }

    // Redirect to success page
    return NextResponse.redirect(new URL("/connect/shopify?success=true", request.url));

  } catch (error) {
    console.error("Shopify OAuth error:", error);
    return NextResponse.redirect(new URL("/connect/shopify?error=oauth_failed", request.url));
  }
}
