import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side sign-out route that clears SSR cookies and redirects to login
 */
export async function POST() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({ name, value, ...options });
          }
        },
      },
    }
  );

  // Sign out the user and clear session cookies
  await supabase.auth.signOut();

  // Redirect to login page with 303 status (See Other)
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), {
    status: 303,
  });
}
