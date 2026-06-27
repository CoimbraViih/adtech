/**
 * DCO Template engine — pure functions, no DB calls, no side effects.
 */

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g

/**
 * Replaces {{field}} placeholders in all values of templateBody with context[field].
 * Unreplaced placeholders remain as-is (no throw, no error).
 */
export function renderTemplate(
  templateBody: Record<string, unknown>,
  context: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(templateBody)) {
    // coerce value to string defensively
    const strValue = typeof value === 'string' ? value : String(value ?? '')
    result[key] = strValue.replace(PLACEHOLDER_RE, (_match, fieldName: string) => {
      return Object.prototype.hasOwnProperty.call(context, fieldName)
        ? context[fieldName]
        : _match
    })
  }
  return result
}

/**
 * Returns unique placeholder names found across all string values of templateBody.
 * Pattern: /\{\{(\w+)\}\}/g
 */
export function extractPlaceholders(templateBody: Record<string, unknown>): string[] {
  const seen = new Set<string>()
  for (const value of Object.values(templateBody)) {
    // coerce value to string defensively
    const strValue = typeof value === 'string' ? value : String(value ?? '')
    let match: RegExpExecArray | null
    const re = new RegExp(PLACEHOLDER_RE.source, 'g')
    while ((match = re.exec(strValue)) !== null) {
      seen.add(match[1])
    }
  }
  return Array.from(seen)
}
