# Edge Functions

## Required environment variables

| Variable | Set by Supabase | Purpose |
|----------|-----------------|---------|
| `SUPABASE_URL` | Yes (auto) | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (auto) | Admin API and DB (server-side only) |
| `SUPABASE_ANON_KEY` | **You must set** | JWT verification for caller (used with `auth.getUser`) |

**Set the anon key** (required for admin-* functions to avoid "Invalid JWT"):

- **Dashboard:** Project Settings → Edge Functions → Secrets → Add `SUPABASE_ANON_KEY` = your project's anon (public) key.
- **CLI:** `supabase secrets set SUPABASE_ANON_KEY=eyJhbG...` (use the anon key from Project Settings → API).

Do **not** expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend; it is only used inside Edge Functions.

**Why 401 before?** The Supabase gateway can verify JWT before invoking the function; that can fail and return 401 before our code runs. In `config.toml` we set `verify_jwt = false` for these four functions so the request always reaches the function; we then verify the JWT and ADMIN role inside the function (anon client + `user_profiles` check). Security is unchanged: only a valid JWT for an ADMIN user can succeed.

## Deploy

From the project root:

```bash
supabase functions deploy admin-list-users
supabase functions deploy admin-create-user
supabase functions deploy admin-set-password
supabase functions deploy admin-set-role
```

Or deploy all at once:

```bash
supabase functions deploy
```

If you still get 401 after deploy, the gateway may be verifying JWT; redeploy with the flag so the request reaches our code:

```bash
supabase functions deploy admin-list-users --no-verify-jwt
supabase functions deploy admin-create-user --no-verify-jwt
supabase functions deploy admin-set-password --no-verify-jwt
supabase functions deploy admin-set-role --no-verify-jwt
```

## Verify in browser

1. Open the app, sign in as ADMIN, go to Staff Users tab.
2. Open DevTools → Network. Trigger a call (e.g. Refresh list).
3. Select the request to `.../functions/v1/admin-list-users` (or another admin function).
4. **Request Headers:** `Authorization: Bearer <jwt>` should be present.
5. **Response:** Status 200 and JSON body (e.g. `{ "users": [...] }`). On auth failure you get 401 with `{ "error": "..." }`.
