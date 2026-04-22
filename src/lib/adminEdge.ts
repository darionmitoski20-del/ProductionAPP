import { supabase } from '@/integrations/supabase/client';

export type InvokeEdgeResult<T = unknown> = {
  data: T | null;
  error: string | null;
  errorCode?: string;
};

export async function invokeEdge<T = unknown>(
  fnName: string,
  body?: Record<string, unknown>
): Promise<InvokeEdgeResult<T>> {
  const { error: userError } = await supabase.auth.getUser();
  if (userError) {
    return { data: null, error: 'Session expired. Please sign in again.' };
  }

  const { data, error } = await supabase.functions.invoke(fnName, {
    body: body ?? {},
  });

  if (error) {
    const raw =
      (error as { message?: unknown; context?: unknown }).message ??
      (error as { context?: unknown }).context ??
      'Request failed';
    const errStr = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return { data: null, error: errStr };
  }

  const json = (data ?? null) as T | null;
  const parsedErrorCode =
    json && typeof json === 'object' && 'error_code' in (json as Record<string, unknown>)
      ? String((json as Record<string, unknown>).error_code ?? '')
      : undefined;

  return { data: json, error: null, errorCode: parsedErrorCode || undefined };
}
