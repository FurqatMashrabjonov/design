/**
 * Element Annotator — auto-injects data-od-id attributes onto structural HTML elements.
 * Used after generation so elements become individually selectable and editable.
 */

const STRUCTURAL_TAGS = new Set([
  'header', 'nav', 'main', 'section', 'article', 'aside', 'footer',
  'form', 'table', 'ul', 'ol', 'details',
])

const SEMANTIC_ROLES = new Set([
  'banner', 'navigation', 'main', 'complementary', 'contentinfo',
  'search', 'form', 'region',
])

/**
 * Annotate structural HTML elements with data-od-id attributes.
 * Uses regex-based parsing to avoid heavy DOM dependencies on the server side.
 *
 * Strategy:
 * 1. Skip elements that already have data-od-id
 * 2. Tag structural elements (header, nav, main, section, footer, etc.)
 * 3. Tag elements with semantic roles
 * 4. Tag elements with common design class patterns (hero, card, etc.)
 * 5. Use semantic slugs when possible, fall back to tag-index
 */
export function annotateHtml(html: string): string {
  const tagCounts: Record<string, number> = {}

  return html.replace(
    /<(header|nav|main|section|article|aside|footer|form|div)(\s[^>]*)?>/gi,
    (match, tag: string, attrs: string = '') => {
      const tagLower = tag.toLowerCase()

      // Skip if already has data-od-id
      if (/data-od-id\s*=/.test(attrs)) return match

      // Determine a semantic ID
      let odId: string | undefined

      // Check for id attribute
      const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i)
      if (idMatch) {
        odId = slugify(idMatch[1])
      }

      // Check for role attribute
      if (!odId) {
        const roleMatch = attrs.match(/\brole\s*=\s*["']([^"']+)["']/i)
        if (roleMatch && SEMANTIC_ROLES.has(roleMatch[1].toLowerCase())) {
          odId = roleMatch[1].toLowerCase()
        }
      }

      // Check for common class patterns
      if (!odId) {
        const classMatch = attrs.match(/\bclass\s*=\s*["']([^"']+)["']/i)
        if (classMatch) {
          const classes = classMatch[1].toLowerCase()
          const semantic = extractSemanticFromClasses(classes)
          if (semantic) odId = semantic
        }
      }

      // For structural tags without any semantic hint, use tag name
      if (!odId && STRUCTURAL_TAGS.has(tagLower)) {
        odId = tagLower
      }

      // For generic divs without semantic hints, skip
      if (!odId) return match

      // Deduplicate: add index if we've seen this slug before
      tagCounts[odId] = (tagCounts[odId] || 0) + 1
      if (tagCounts[odId] > 1) {
        odId = `${odId}-${tagCounts[odId]}`
      }

      return `<${tag}${attrs} data-od-id="${odId}">`
    },
  )
}

/**
 * Extract a semantic name from CSS classes.
 */
function extractSemanticFromClasses(classes: string): string | undefined {
  const patterns = [
    'hero', 'navbar', 'sidebar', 'toolbar', 'banner',
    'pricing', 'features', 'testimonials', 'cta', 'faq',
    'contact', 'about', 'team', 'stats', 'gallery',
    'dashboard', 'card-grid', 'metric', 'chart',
  ]
  for (const p of patterns) {
    if (classes.includes(p)) return p
  }
  return undefined
}

/**
 * Slugify a string into a valid data-od-id value.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}
