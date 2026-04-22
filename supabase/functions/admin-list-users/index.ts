// Edge Function: admin-list-users
// Returns all user_profiles rows. Caller must be ADMIN.
// JWT verified with ANON-key client; admin actions use SERVICE_ROLE client.

import { verifyAdminCaller, createAdminClient } from "../_shared/supabase.ts";
import { handleCorsPreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return errorResponse("Method not allowed", 405);
    }

    const authResult = await verifyAdminCaller(req);
    if (authResult instanceof Response) return authResult;

    const adminClient = createAdminClient();
    const { data: users, error } = await adminClient
      .from("user_profiles")
      .select("id, email, role, created_at, full_name")
      .order("created_at", { ascending: true });

    if (error) {
      return errorResponse(`Failed to fetch users: ${error.message}`, 500);
    }

    return jsonResponse({ users: users ?? [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return errorResponse(message, 500);
  }
});
