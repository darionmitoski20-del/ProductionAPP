/**
 * CORS headers for Edge Functions.
 * Add to ALL responses (success + error) so browsers can read them.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * Handle OPTIONS preflight: return 200 with CORS headers.
 */
export function handleCorsPreflight(): Response {
  return new Response("ok", { status: 200, headers: corsHeaders });
}

/**
 * Build a JSON Response with CORS headers applied.
 */
export function jsonResponse(
  body: object,
  init: { status?: number; statusText?: string } = {}
): Response {
  const { status = 200, statusText } = init;
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Error response with CORS. Use for 400, 401, 403, 500.
 */
export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, { status });
}
