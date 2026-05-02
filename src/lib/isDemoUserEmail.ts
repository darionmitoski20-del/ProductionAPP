/** Built-in demo logins — always treated as demo regardless of VITE_DEMO_EMAILS. */
const BUILTIN_DEMO_EMAILS = new Set(['demo@brzinaracki.com']);

/**
 * True when this login should use in-memory demo mutations (no DB writes for menu/design demo).
 * Keep in sync with AuthContext demo detection.
 */
export function isDemoUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  if (BUILTIN_DEMO_EMAILS.has(normalizedEmail)) return true;

  const configuredDemoEmails = String(import.meta.env.VITE_DEMO_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (configuredDemoEmails.length > 0) {
    return configuredDemoEmails.includes(normalizedEmail);
  }

  return normalizedEmail.startsWith('demo@') || normalizedEmail.includes('+demo@');
}
