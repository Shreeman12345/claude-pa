/**
 * Model-free, same reasoning as isDigestRequest: keeps working with no
 * credits, and runs before anything that costs a call.
 *
 * The tricky part is telling this apart from a genuine income transaction --
 * "got money from home" (reset trigger) vs "got 15000 from daddy" (income).
 * The disambiguator is amount: a reset phrase never carries a number, an
 * income message almost always does. So this only matches when the message
 * has no digits at all, deliberately narrow to avoid swallowing a real
 * transaction that happens to share phrasing.
 */
const RESET_PATTERNS: RegExp[] = [
  /\bgot\s+money\s+from\s+(?:home|dad|daddy|mom|mommy|parents|family)\b/i,
  /\breset\s+(?:the\s+)?budget\b/i,
  /\b(?:start|starting)\s+(?:a\s+)?new\s+(?:budget\s+)?period\b/i,
  /\bnew\s+budget\s+period\b/i,
];

export function isPeriodResetRequest(text: string): boolean {
  if (/\d/.test(text)) return false;
  return RESET_PATTERNS.some((pattern) => pattern.test(text));
}
