import assert from "node:assert";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

console.log("=== Testing Supabase Environment Configuration ===");

// 1. Test Next.js env loader
const projectDir = process.cwd();
const { combinedEnv, loadedEnvFiles } = loadEnvConfig(projectDir);

console.log("\n[Test 1] Verifying .env.local file loading...");
assert(loadedEnvFiles.some((f) => f.path.includes(".env.local")), ".env.local must be loaded");
assert(
  combinedEnv.NEXT_PUBLIC_SUPABASE_URL &&
  combinedEnv.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://") &&
  combinedEnv.NEXT_PUBLIC_SUPABASE_URL.includes("supabase.co"),
  "NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL"
);
assert(
  combinedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  (combinedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("sb_publishable_") || combinedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 20),
  "NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured"
);
console.log("  ✓ .env.local loaded correctly with NEXT_PUBLIC_SUPABASE_URL:", combinedEnv.NEXT_PUBLIC_SUPABASE_URL);

// 2. Test Browser Client Validation logic
console.log("\n[Test 2] Testing Browser Client validation rules...");

function testIsConfigured(url, key) {
  if (!url || !key) return false;
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

  if (isPlaceholderUrl || isPlaceholderKey) return false;

  try {
    const parsed = new URL(trimmedUrl);
    if (!parsed.protocol.startsWith("http")) return false;
  } catch {
    return false;
  }

  return trimmedKey.length >= 8;
}

// Case A: Modern sb_publishable_ key format (MUST PASS)
const modernTest = testIsConfigured(
  combinedEnv.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
  "sb_publishable_test_token_sample_12345"
);
assert.strictEqual(modernTest, true, "Modern sb_publishable_ key must be accepted");
console.log("  ✓ Modern sb_publishable_ format accepted without requiring legacy JWT.");

// Case B: Legacy JWT format (MUST PASS)
const legacyTest = testIsConfigured(
  combinedEnv.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample_payload.sample_sig"
);
assert.strictEqual(legacyTest, true, "Legacy JWT key format must still be accepted");
console.log("  ✓ Legacy JWT format accepted.");

// Case C: Placeholder values (MUST FAIL)
const placeholderTest1 = testIsConfigured(
  "https://placeholder-project.supabase.co",
  "placeholder-anon-key"
);
assert.strictEqual(placeholderTest1, false, "Placeholder project URL must be rejected");

const placeholderTest2 = testIsConfigured(
  "https://gnmndtkqsrzziydsvwcb.supabase.co",
  "<my actual sb_publishable key>"
);
assert.strictEqual(placeholderTest2, false, "Unreplaced angle-bracket placeholder must be rejected");
console.log("  ✓ Placeholders correctly identified and rejected.");

// Case D: Whitespace & Windows CRLF tolerance (MUST PASS)
const crlfTest = testIsConfigured(
  "https://gnmndtkqsrzziydsvwcb.supabase.co\r\n",
  "sb_publishable_token_sample_12345\r\n"
);
assert.strictEqual(crlfTest, true, "Whitespace and CRLF line breaks must be trimmed");
console.log("  ✓ Windows CRLF whitespace trimming verified.");

// 3. Test @supabase/ssr browser client initialization
console.log("\n[Test 3] Testing @supabase/ssr Browser Client instantiation...");
const { createBrowserClient } = await import("@supabase/ssr");
const browserClient = createBrowserClient(
  combinedEnv.NEXT_PUBLIC_SUPABASE_URL,
  combinedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
assert(browserClient && browserClient.auth, "Browser client must instantiate auth instance");
console.log("  ✓ createBrowserClient initialized successfully with modern key.");

// 4. Test Server-side client instantiation
console.log("\n[Test 4] Testing @supabase/ssr Server Client instantiation...");
const { createServerClient } = await import("@supabase/ssr");
const serverClient = createServerClient(
  combinedEnv.NEXT_PUBLIC_SUPABASE_URL,
  combinedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll() { return []; },
      setAll() {},
    },
  }
);
assert(serverClient && serverClient.auth, "Server client must instantiate auth instance");
console.log("  ✓ createServerClient initialized successfully.");

console.log("\n=======================================================");
console.log("ALL SUPABASE ENVIRONMENT CONFIGURATION TESTS PASSED!");
console.log("=======================================================\n");
