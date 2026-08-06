/**
 * Patterns are deliberately anchored to the start of the message (or require
 * the whole message to be the phrase). A loose substring match on something
 * like "this week" would swallow real captures -- "finish the DSP assignment
 * this week" is an item to file, not a request for the digest.
 *
 * Pure string matching, no model call, so this keeps working with no credits.
 */
const DIGEST_PATTERNS: RegExp[] = [
  /^\s*\/upcoming\b/i,
  /^\s*what(?:'s|s| is)?\s+(?:coming\s+up|up|on)\b/i,
  /^\s*what(?:'s|s| is)?\s+(?:today|tomorrow|this\s+week)\b/i,
  /^\s*what\s+do\s+i\s+have\b/i,
  /^\s*(?:my|the)\s+(?:schedule|week|day)\b/i,
  /^\s*show\s+(?:me\s+)?(?:my\s+)?(?:schedule|week|upcoming|day)\b/i,
  /^\s*anything\s+(?:coming\s+up|today|tomorrow|this\s+week|on)\b/i,
  /^\s*(?:this\s+week|upcoming|schedule|agenda)\s*\??\s*$/i,
];

export function isDigestRequest(text: string): boolean {
  return DIGEST_PATTERNS.some((pattern) => pattern.test(text));
}
