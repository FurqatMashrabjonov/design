// LP-01: what a half-written screen may show. A streaming preview receives the model's text as it
// arrives, cut anywhere — mid-tag, mid-attribute, inside a <style> or <script>. Handed to an iframe
// as-is, and with our own scripts appended after it, that cut turns code into visible text: an
// appended <script> lands inside an open attribute, its first quote closes the attribute and the
// rest of the script prints on the screen. So a partial document is repaired before it is shown,
// and nothing is ever appended to one (bridges, listeners and audits wait for the finished screen).

/** The document up to its last complete piece, closed properly; '' while there is nothing to show. */
export function repairPartialHtml(text: string): string {
  // Anything before the document (a preamble sentence, a fence) is not part of the screen.
  const start = text.search(/<!doctype\b|<html\b/i)
  if (start === -1) return ''
  let html = text.slice(start)

  // A comment or block still open at the end would swallow whatever follows.
  html = cutOpen(html, /<!--/g, '-->')
  html = cutOpen(html, /<style\b/gi, '</style>')
  html = cutOpen(html, /<script\b/gi, '</script>')
  html = cutOpen(html, /<svg\b/gi, '</svg>') // a half svg is a stray path, not a picture

  // An unfinished tag at the end ("<span class=\"pri").
  const lastOpen = html.lastIndexOf('<')
  if (lastOpen > html.lastIndexOf('>')) html = html.slice(0, lastOpen)
  // An unfinished entity ("&am").
  html = html.replace(/&[a-z0-9#]{0,8}$/i, '')

  if (!/<body\b/i.test(html)) {
    if (/<head\b/i.test(html) && !/<\/head>/i.test(html)) html += '</head>'
    html += '<body>'
  }
  if (!/<\/body>/i.test(html)) html += '</body>'
  if (!/<\/html>/i.test(html)) html += '</html>'
  return html
}

// If the last `open` has no `close` after it, the document ends just before that `open`.
function cutOpen(html: string, open: RegExp, close: string): string {
  let last = -1
  for (const m of html.matchAll(open)) last = m.index
  if (last === -1) return html
  return html.toLowerCase().indexOf(close, last) === -1 ? html.slice(0, last) : html
}
