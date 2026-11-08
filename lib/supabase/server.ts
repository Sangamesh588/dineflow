import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import dns from "dns";

if (typeof dns !== "undefined" && typeof dns.setDefaultResultOrder === "function") {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // Ignore in edge runtime
  }
}

/**
 * Validates if Supabase server environment variables are configured.
 * Checks NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL and key.
 * Accepts modern sb_publishable_ / sb_secret_ formats and legacy JWTs.
 */
export function isSupabaseServerConfigured(): boolean {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return false;
  }

  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();

  const isPlaceholderUrl =
    trimmedUrl === "" ||
    trimmedUrl.includes("placeholder-project") ||
    trimmedUrl.includes("your-project-id") ||
    trimmedUrl.includes("example.com") ||
    trimmedUrl.startsWith("<");

  const isPlaceholderKey =
    trimmedKey === "" ||
    trimmedKey === "placeholder-anon-key" ||
    trimmedKey === "your-anon-key-here" ||
    trimmedKey.includes("placeholder") ||
    trimmedKey.startsWith("<") ||
    trimmedKey.includes("<my actual");

  if (isPlaceholderUrl || isPlaceholderKey) {
    return false;
  }

  try {
    const parsed = new URL(trimmedUrl);
    if (!parsed.protocol.startsWith("http")) {
      return false;
    }
  } catch {
    return false;
  }

  return trimmedKey.length >= 8;
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  )?.trim();

  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase server client credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Creates an administrative Supabase client using SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
 * Used exclusively for server-side trusted operations (webhooks, automated jobs).
 */
export function createAdminClient() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  )?.trim();

  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (!url || !secretKey) {
    throw new Error(
      "Admin Supabase client requires SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createServerClient(url, secretKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}
