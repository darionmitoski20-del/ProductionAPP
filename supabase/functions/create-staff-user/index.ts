type Body = { email: string; password?: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getCaller(jwt: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${jwt}`, apikey: SERVICE_ROLE },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return await res.json();
}

async function isAdmin(userId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.admin&select=id`,
    { headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE } },
  );
  if (!res.ok) throw new Error("Role check failed");
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function createUser(email: string, password?: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json(); // { id, ... }
}

async function addStaffRole(userId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ user_id: userId, role: "staff" }),
  });
  if (!res.ok) throw new Error(await res.text());
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const auth = req.headers.get("authorization") ?? "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!jwt) return new Response("Missing Authorization", { status: 401 });

    const body = (await req.json()) as Body;
    if (!body.email) return new Response("Missing email", { status: 400 });

    const caller = await getCaller(jwt);
    const callerId = caller?.id;
    if (!callerId) return new Response("Unauthorized", { status: 401 });

    if (!(await isAdmin(callerId))) return new Response("Forbidden", { status: 403 });

    const created = await createUser(body.email, body.password);
    await addStaffRole(created.id);

    return new Response(JSON.stringify({ id: created.id, email: body.email }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: String(e?.message || e) }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
