/**
 * Input validation helpers. All role values must be uppercase 'ADMIN' | 'STAFF'.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

export function validatePasswordMinLength(password: unknown, min = 8): boolean {
  return typeof password === "string" && password.length >= min;
}

export function validateRole(role: unknown): role is "ADMIN" | "STAFF" {
  return role === "ADMIN" || role === "STAFF";
}

export function validateUserId(userId: unknown): userId is string {
  return typeof userId === "string" && UUID_REGEX.test(userId);
}
