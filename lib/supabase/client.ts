import { createBrowserClient } from "@supabase/ssr";

/**
 * Validates if Supabase client environment variables are configured.
 * Strictly reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (with NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY fallback).
 * Accepts modern sb_publishable_ keys as well as legacy JWT keys.
 * Does NOT require legacy JWT formatting.
 */
export function isSupabaseConfigured(): boolean {
  // Browser client reads NEXT_PUBLIC_ environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return false;
  }

  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();

  // Check against known placeholder values
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

  // Ensure it is a valid URL
  try {
    const parsed = new URL(trimmedUrl);
    if (!parsed.protocol.startsWith("http")) {
      return false;
    }
  } catch {
    return false;
  }

  // Accepts both modern sb_publishable_ keys and legacy JWT keys (at least 8 characters)
  return trimmedKey.length >= 8;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase client credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createBrowserClient(url, anonKey);
}
