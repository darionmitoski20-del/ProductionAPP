// Edge Function: admin-set-password
// Sets a new password for a user. Caller must be ADMIN.
// JWT verified with ANON-key client; admin actions use SERVICE_ROLE client.

import { verifyAdminCaller } from "../_shared/supabase.ts";
import { handleCorsPreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateUserId, validatePasswordMinLength } from "../_shared/validators.ts";

interface Body {
  user_id?: string;
  new_password?: string;
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
    if (!validatePasswordMinLength(body.new_password, 8)) {
      return errorResponse("Password is required and must be at least 8 characters", 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const updateRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${body.user_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
        },
        body: JSON.stringify({ password: body.new_password }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return errorResponse(`Failed to update password: ${errText}`, 500);
    }

    return jsonResponse({ success: true, message: "Password updated successfully" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return errorResponse(message, 500);
  }
});
