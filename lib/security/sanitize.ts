// lib/security/sanitize.ts

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/gi,
  /you\s+are\s+now\s+(a\s+)?/gi,
  /act\s+as\s+(a\s+)?/gi,
  /\bsystem\s*:\s*/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /\bDAN\b/g,
  /jailbreak/gi,
];

/**
 * Strips prompt injection patterns from user-supplied briefing text.
 * Also enforces a hard character cap so tokens cannot be stuffed.
 */
export function sanitizeBriefing(input: string, maxLength = 2000): string {
  let sanitized = input.slice(0, maxLength * 2); // pre-cap before regex scan
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REMOVED]");
  }
  return sanitized.slice(0, maxLength);
}
