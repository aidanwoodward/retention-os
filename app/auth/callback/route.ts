import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    // Exchange the one-time code for a session and set cookies
    await supabase.auth.exchangeCodeForSession(code);
  }

  // After login, go to the dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
