/**
 * DCO Template engine — pure functions, no DB calls, no side effects.
 */

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g

/**
 * Replaces {{field}} placeholders in all values of templateBody with context[field].
 * Unreplaced placeholders remain as-is (no throw, no error).
 */
export function renderTemplate(
  templateBody: Record<string, string>,
  context: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(templateBody)) {
    result[key] = value.replace(PLACEHOLDER_RE, (_match, fieldName: string) => {
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
export function extractPlaceholders(templateBody: Record<string, string>): string[] {
  const seen = new Set<string>()
  for (const value of Object.values(templateBody)) {
    let match: RegExpExecArray | null
    const re = new RegExp(PLACEHOLDER_RE.source, 'g')
    while ((match = re.exec(value)) !== null) {
      seen.add(match[1])
    }
  }
  return Array.from(seen)
}
