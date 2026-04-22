// Edge Function: admin-set-role
// Changes a user's role in user_profiles. Caller must be ADMIN.
// JWT verified with ANON-key client; admin actions use SERVICE_ROLE client.

import { verifyAdminCaller, createAdminClient } from "../_shared/supabase.ts";
import { handleCorsPreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateUserId, validateRole } from "../_shared/validators.ts";

interface Body {
  user_id?: string;
  role?: "ADMIN" | "STAFF";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const authResult = await verifyAdminCaller(req);
    if (authResult instanceof Response) return authResult;

    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body.user_id || !validateUserId(body.user_id)) {
      return errorResponse("Missing or invalid user_id (must be UUID)", 400);
    }
    if (!body.role || !validateRole(body.role)) {
      return errorResponse("Role must be 'ADMIN' or 'STAFF'", 400);
    }

    const adminClient = createAdminClient();
    const { data: profile, error } = await adminClient
      .from("user_profiles")
      .update({ role: body.role })
      .eq("id", body.user_id)
      .select()
      .single();

    if (error) {
      return errorResponse(`Failed to update role: ${error.message}`, 500);
    }

    return jsonResponse({
      success: true,
      message: `Role updated to ${body.role}`,
      profile: profile ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return errorResponse(message, 500);
  }
});
