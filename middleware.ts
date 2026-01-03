import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // never run auth/demo middleware on Next internals or assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") || // optional: only if your middleware shouldn't touch APIs
    pathname === "/favicon.ico" ||
    pathname.startsWith("/avatars/") ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  // Skip authentication in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set({ name, value, ...options });
          }
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  // Protect all routes under (protected) group
  const protectedPaths = ["/dashboard", "/sync", "/connect"];
  const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = { 
  matcher: [
    "/dashboard/:path*",
    "/sync/:path*", 
    "/connect/:path*"
  ] 
};
