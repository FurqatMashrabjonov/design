// Isomorphic: server uses it to save, client uses it for the live preview of a partial stream.
// Models sometimes skip the <artifact> tag or wrap the HTML in a ```html fence.
export function extractArtifact(text: string) {
  const tag = text.match(/<artifact(?:\s+title="([^"]*)")?[^>]*>([\s\S]*?)(?:<\/artifact>|$)/i)
  if (tag) return { title: decodeEntities(tag[1] || '') || 'Untitled', html: stripFence(tag[2]) }
  const fence = text.match(/```html\s*([\s\S]*?)(?:```|$)/i)
  const html = fence ? fence[1] : text
  const title = decodeEntities(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '') || 'Untitled'
  return { title, html: html.trim() }
}

// A title is plain text from here on (screen name, injected header). Left encoded, "Profile &amp; Goals"
// showed up literally on the canvas and was escaped a second time inside the detail header.
function decodeEntities(s: string) {
  return s
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, e: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' })[e] ?? '')
    .trim()
}

function stripFence(s: string) {
  return s.replace(/^\s*```html\s*/i, '').replace(/```\s*$/, '').trim()
}

// Server appends this when the stream fails midway, so the client can show the reason.
export const ERROR_MARK = '<!--GEN_ERROR:'
