/**
 * Two-client pattern for Edge Functions:
 * - userClient: ANON key + incoming Authorization header → used ONLY for auth.getUser() to verify JWT.
 * - adminClient: SERVICE_ROLE key → used for Admin API and DB writes (never for JWT verification).
 *
 * Required env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { errorResponse } from "./cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("APP_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function ensureEnv(): void {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not set");
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_ANON_KEY / APP_ANON_KEY is not set. Set it via: supabase secrets set APP_ANON_KEY=your_anon_key"
    );
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
}

/**
 * Create a Supabase client that forwards the caller's JWT.
 * Use this ONLY to call auth.getUser(jwt) to verify the token (GoTrue validates with anon key).
 */
export function createUserClient(jwt: string): SupabaseClient {
  ensureEnv();
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
  });
}

/**
 * Create admin client (service role). Use for Admin API and DB operations that bypass RLS.
 * Never use for JWT verification.
 */
export function createAdminClient(): SupabaseClient {
  ensureEnv();
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface VerifyAdminResult {
  userId: string;
}

/**
 * 1) Read Authorization header.
 * 2) Get user via userClient.auth.getUser(jwt) (anon-key client → correct JWT validation).
 * 3) Check user_profiles.role = 'ADMIN' via adminClient.
 * Returns { userId } or a Response to return (401/403/500 with CORS).
 */
export async function verifyAdminCaller(
  req: Request
): Promise<VerifyAdminResult | Response> {
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!jwt) {
    return errorResponse("Missing or invalid Authorization header", 401);
  }

  let userClient: SupabaseClient;
  try {
    userClient = createUserClient(jwt);
  } catch (e) {
    return errorResponse(
      e instanceof Error ? e.message : "Invalid configuration",
      500
    );
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(jwt);

  if (userError || !user?.id) {
    return errorResponse("Invalid or expired JWT", 401);
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (profileError) {
    return errorResponse("Failed to verify admin role", 500);
  }
  if (!profile) {
    return errorResponse("Forbidden: caller is not ADMIN", 403);
  }

  return { userId: user.id };
}
