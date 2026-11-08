import { NextResponse } from "next/server";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_auth_code`);
  }

  if (!isSupabaseServerConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=supabase_not_configured`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has an existing restaurant membership
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: member } = await supabase
          .from("restaurant_members")
          .select("restaurant_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        // If user has no restaurant yet and target wasn't explicitly set, route to onboarding
        if (!member && next === "/dashboard") {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      const forwardUrl = next.startsWith("/") ? `${origin}${next}` : next;
      return NextResponse.redirect(forwardUrl);
    }

    console.error("Auth callback code exchange error:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown auth callback error";
    console.error("Auth callback exception:", message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    );
  }
}
