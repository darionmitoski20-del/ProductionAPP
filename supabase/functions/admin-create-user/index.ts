// Edge Function: admin-create-user
// Creates a new user (Auth + user_profiles). Caller must be ADMIN.
// JWT verified with ANON-key client; admin actions use SERVICE_ROLE client.

import { verifyAdminCaller, createAdminClient } from "../_shared/supabase.ts";
import { handleCorsPreflight, jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  validateEmail,
  validatePasswordMinLength,
  validateRole,
  validateUserId,
} from "../_shared/validators.ts";

interface Body {
  email?: string;
  password?: string;
  role?: "ADMIN" | "STAFF";
  full_name?: string;
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

    if (!body.email || !validateEmail(body.email)) {
      return errorResponse("Invalid or missing email", 400);
    }
    if (!validatePasswordMinLength(body.password, 8)) {
      return errorResponse("Password is required and must be at least 8 characters", 400);
    }
    if (body.role != null && !validateRole(body.role)) {
      return errorResponse("Role must be 'ADMIN' or 'STAFF' (uppercase only)", 400);
    }
    const role = body.role === "ADMIN" ? "ADMIN" : "STAFF";
    const full_name =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : body.full_name != null
          ? String(body.full_name).trim()
          : "";
    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : body.phone != null
          ? String(body.phone).trim()
          : "";

    const adminClient = createAdminClient();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({
        email: (body.email as string).trim(),
        password: body.password,
        email_confirm: true,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return errorResponse(`Failed to create auth user: ${errText}`, 400);
    }

    const created = (await createRes.json()) as {
      id?: string;
      user?: { id?: string };
    };

    const newUserId = created.user?.id ?? created.id;
    if (!newUserId || !validateUserId(newUserId)) {
      return errorResponse(
        "Auth user created but response did not include a valid user id",
        500,
      );
    }

    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .insert({
        id: newUserId,
        email: (body.email as string).trim(),
        role,
        full_name: full_name || null,
      })
      .select()
      .single();

    if (profileError) {
      return errorResponse(`User created but profile insert failed: ${profileError.message}`, 500);
    }

    // Ensure contact fields persist (explicit UPDATE for clients / schemas that only partially apply INSERT).
    const { error: syncError } = await adminClient
      .from("user_profiles")
      .update({
        full_name: full_name || null,
      })
      .eq("id", newUserId);

    if (syncError) {
      return errorResponse(
        `Profile row created but syncing name failed: ${syncError.message}`,
        500,
      );
    }

    return jsonResponse({
      id: newUserId,
      email: (body.email as string).trim(),
      role,
      profile: profile ?? { id: newUserId },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return errorResponse(message, 500);
  }
});
