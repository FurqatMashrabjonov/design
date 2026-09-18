/**
 * Element Patcher — replaces a specific element (by data-od-id) within full HTML.
 * All other elements remain unchanged.
 */

/**
 * Replace the element with the given data-od-id in the full HTML string.
 * Returns the patched HTML, or the original HTML if the element wasn't found.
 */
export function patchElement(fullHtml: string, elementId: string, newElementHtml: string): string {
  // Build a regex that matches the opening tag with data-od-id="elementId",
  // captures everything until the matching closing tag.
  // This handles self-closing and nested tags of the same type.
  const escapedId = escapeRegex(elementId)
  const openTagPattern = new RegExp(
    `(<(\\w+)\\s[^>]*data-od-id\\s*=\\s*["']${escapedId}["'][^>]*>)`,
    'i',
  )

  const match = fullHtml.match(openTagPattern)
  if (!match) return fullHtml

  const openTag = match[1]
  const tagName = match[2].toLowerCase()
  const startIndex = fullHtml.indexOf(openTag)
  if (startIndex === -1) return fullHtml

  // Find the matching closing tag, accounting for nesting
  const endIndex = findClosingTag(fullHtml, startIndex + openTag.length, tagName)
  if (endIndex === -1) return fullHtml

  const closingTag = `</${tagName}>`
  const elementEnd = endIndex + closingTag.length

  // Replace the entire element (open tag + content + close tag) with new HTML
  return fullHtml.slice(0, startIndex) + newElementHtml.trim() + fullHtml.slice(elementEnd)
}

/**
 * Extract the HTML content of an element with a specific data-od-id.
 * Returns the full outer HTML of the element, or null if not found.
 */
export function extractElement(fullHtml: string, elementId: string): string | null {
  const escapedId = escapeRegex(elementId)
  const openTagPattern = new RegExp(
    `(<(\\w+)\\s[^>]*data-od-id\\s*=\\s*["']${escapedId}["'][^>]*>)`,
    'i',
  )

  const match = fullHtml.match(openTagPattern)
  if (!match) return null

  const openTag = match[1]
  const tagName = match[2].toLowerCase()
  const startIndex = fullHtml.indexOf(openTag)
  if (startIndex === -1) return null

  const endIndex = findClosingTag(fullHtml, startIndex + openTag.length, tagName)
  if (endIndex === -1) return null

  const closingTag = `</${tagName}>`
  return fullHtml.slice(startIndex, endIndex + closingTag.length)
}

/**
 * List all data-od-id values found in the HTML.
 */
export function listElementIds(html: string): string[] {
  const ids: string[] = []
  const re = /data-od-id\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    ids.push(m[1])
  }
  return ids
}

// --- Helpers ---

function findClosingTag(html: string, searchFrom: number, tagName: string): number {
  let depth = 1
  let pos = searchFrom
  const openRe = new RegExp(`<${tagName}[\\s>/]`, 'gi')
  const closeRe = new RegExp(`</${tagName}>`, 'gi')

  // Combine all open and close positions
  const events: Array<{ pos: number; type: 'open' | 'close' }> = []

  openRe.lastIndex = searchFrom
  let om: RegExpExecArray | null
  while ((om = openRe.exec(html)) !== null) {
    events.push({ pos: om.index, type: 'open' })
  }

  closeRe.lastIndex = searchFrom
  let cm: RegExpExecArray | null
  while ((cm = closeRe.exec(html)) !== null) {
    events.push({ pos: cm.index, type: 'close' })
  }

  events.sort((a, b) => a.pos - b.pos)

  for (const event of events) {
    if (event.type === 'open') {
      depth++
    } else {
      depth--
      if (depth === 0) return event.pos
    }
  }

  return -1
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
