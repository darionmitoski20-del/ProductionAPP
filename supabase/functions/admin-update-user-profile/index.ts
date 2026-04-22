// Edge Function: admin-update-user-profile
// Updates full_name on user_profiles. Caller must be ADMIN.

import { verifyAdminCaller, createAdminClient } from "../_shared/supabase.ts";
import { handleCorsPreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateUserId } from "../_shared/validators.ts";

interface Body {
  user_id?: string;
  full_name?: string | null;
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

    if (!("full_name" in body)) {
      return errorResponse("Provide full_name", 400);
    }

    const v = body.full_name;
    const full_name =
      v == null || String(v).trim() === "" ? null : String(v).trim();

    const adminClient = createAdminClient();
    const { data: profile, error } = await adminClient
      .from("user_profiles")
      .update({ full_name })
      .eq("id", body.user_id)
      .select()
      .single();

    if (error) {
      return errorResponse(`Failed to update profile: ${error.message}`, 500);
    }

    return jsonResponse({ success: true, profile: profile ?? null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return errorResponse(message, 500);
  }
});
