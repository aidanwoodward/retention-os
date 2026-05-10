import { NextResponse } from "next/server";

/**
 * MVP demo surface: redirects legacy/prototype URLs to the command-centre spine.
 * Keeps /settings (account) and auth routes reachable.
 */
export function getMvpContainmentRedirect(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";

  if (path === "/") return null;

  if (path === "/login" || path === "/verify" || path.startsWith("/auth/")) {
    return null;
  }

  if (path === "/settings" || path.startsWith("/settings/")) {
    return null;
  }

  const mvpExact = new Set([
    "/dashboard",
    "/cohorts",
    "/retention",
    "/ltv",
    "/insights",
    "/data",
  ]);
  if (mvpExact.has(path)) return null;

  if (path.startsWith("/cohorts/")) return "/cohorts";
  if (path.startsWith("/retention/")) return "/retention";
  if (path.startsWith("/ltv/")) return "/ltv";
  if (path.startsWith("/insights/")) return "/insights";
  if (path.startsWith("/data/")) return "/data";
  if (path.startsWith("/dashboard/")) return "/dashboard";

  return "/dashboard";
}

/** Blocks destructive seed/reset helpers outside local development. */
export function assertDestructiveDevApiAllowed(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "Forbidden",
        message:
          "This development-only endpoint is disabled in production builds.",
      },
      { status: 403 },
    );
  }
  return null;
}
