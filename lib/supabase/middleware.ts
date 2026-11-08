import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();

  const isConfigured = Boolean(
    trimmedUrl &&
    trimmedKey &&
    !trimmedUrl.includes("placeholder-project") &&
    !trimmedUrl.includes("your-project-id") &&
    !trimmedUrl.includes("example.com") &&
    !trimmedUrl.startsWith("<") &&
    trimmedKey !== "placeholder-anon-key" &&
    trimmedKey !== "your-anon-key-here" &&
    !trimmedKey.includes("placeholder") &&
    !trimmedKey.startsWith("<") &&
    trimmedKey.length >= 8
  );

  // If Supabase is not yet configured, allow browsing
  if (!isConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient(trimmedUrl, trimmedKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/forgot-password");

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/onboarding") ||
    request.nextUrl.pathname.startsWith("/super-admin");

  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow users to reach login if customer mode is active or logging into different shop
  const isCustomerMode = request.nextUrl.searchParams.get("mode") === "customer";
  if (user && isAuthRoute && !isCustomerMode && !request.nextUrl.searchParams.get("switch")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
