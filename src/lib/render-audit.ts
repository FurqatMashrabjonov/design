// The render audit (EYE-01): what only a rendered page can show — a row pushed off the screen,
// text cut off mid-word, a tap target too small, text too faint to read, two labels on top of
// each other. It runs inside the screen (the canvas frame's bridge, or headless Chrome in the
// eval) and reports each finding with the data-od-id of the element at fault, which is exactly
// what an element edit (EYE-02) needs to fix it. The numbers come from lib/hig-rules.ts.

import { HIG } from './hig-rules.ts'

export const AUDIT_RULES = ['overflow', 'clipped-text', 'small-target', 'low-contrast', 'overlap'] as const
export type AuditRule = (typeof AUDIT_RULES)[number]
export type AuditFinding = { rule: AuditRule; id: string | null; detail: string }

/** A function body (as source) that returns the findings for the current document. */
export const AUDIT_SOURCE = `
var MIN_TARGET = ${HIG.minTargetPx}, TEXT = ${HIG.contrast.text}, LARGE = ${HIG.contrast.largeText}, LARGE_PX = ${HIG.contrast.largeTextPx};
var out = [], seen = {};
var vw = document.documentElement.clientWidth;
function idOf(el) { var e = el.closest ? el.closest('[data-od-id]') : null; return e ? e.getAttribute('data-od-id') : null; }
function add(rule, el, detail) {
  var id = idOf(el), key = rule + '|' + id;
  if (seen[key] || out.length >= 40) return;
  seen[key] = 1; out.push({ rule: rule, id: id, detail: String(detail).slice(0, 120) });
}
function inShell(el) { return !!(el.closest && el.closest('[data-od-shell]')); }
function visible(el) {
  var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
}
function label(el) { return (el.textContent || el.getAttribute('aria-label') || el.tagName).replace(/\\s+/g, ' ').trim().slice(0, 40); }
var canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
var ctx = canvas.getContext('2d', { willReadFrequently: true });
function rgba(c) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return ctx.getImageData(0, 0, 1, 1).data; }
function lum(p) { function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]); }
function background(el) {
  for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
    var cs = getComputedStyle(e);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // a photo or gradient behind: cannot judge
    if (e.tagName === 'IMG' || e.tagName === 'VIDEO') return null;
    var c = rgba(cs.backgroundColor);
    if (c[3] > 230) return c;
  }
  return rgba(getComputedStyle(document.body).backgroundColor);
}
function pinned(el) { for (var e = el; e && e.nodeType === 1; e = e.parentElement) { var p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; }
function ownText(el) { for (var i = 0; i < el.childNodes.length; i++) { var n = el.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()) return true; } return false; }

var all = document.body ? document.body.querySelectorAll('*') : [];
var texts = [];
for (var i = 0; i < all.length; i++) {
  var el = all[i];
  if (/^(SCRIPT|STYLE|SVG|PATH|I|BR|HEAD|META|LINK|TEMPLATE)$/i.test(el.tagName) || !visible(el)) continue;
  var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  // 1. Pushed past the right edge (fixed chrome and horizontal scrollers are allowed to).
  if (r.right > vw + 2 && cs.position !== 'fixed' && !(el.closest && el.closest('[style*="overflow-x"], .od-carousel')) && !inShell(el)) {
    var p = el.parentElement, scroller = false;
    for (; p; p = p.parentElement) { var o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') { scroller = true; break; } }
    if (!scroller) add('overflow', el, label(el) + ' ends at ' + Math.round(r.right) + 'px of ' + vw);
  }
  if (inShell(el)) continue;
  // 2. Text cut off without an ellipsis (an ellipsis is a choice; a hard cut is a bug).
  if (ownText(el) && (cs.overflow === 'hidden' || cs.overflowX === 'hidden') && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && !/-webkit-box/.test(cs.display)) add('clipped-text', el, label(el));
  // 3. Tap targets. An icon-only button carries the autofix hit area, so it is measured with it.
  if (/^(BUTTON|A|SELECT)$/.test(el.tagName) || el.getAttribute('role') === 'button' || (el.tagName === 'INPUT' && /checkbox|radio/.test(el.type))) {
    var hit = getComputedStyle(el, '::after'), hw = r.width, hh = r.height;
    if (hit.content && hit.content !== 'none' && hit.position === 'absolute') { hw = Math.max(hw, parseFloat(hit.width) || 0); hh = Math.max(hh, parseFloat(hit.height) || 0); }
    var inline = el.tagName === 'A' && cs.display === 'inline';
    if (!inline && (hw < MIN_TARGET - 0.5 || hh < MIN_TARGET - 0.5) && !(el.tagName === 'INPUT' && el.closest('label'))) add('small-target', el, label(el) + ' is ' + Math.round(hw) + '×' + Math.round(hh));
  }
  // 4. Contrast of text against what is actually behind it.
  if (ownText(el)) {
    var bg = background(el);
    if (bg) {
      var fg = rgba(cs.color), a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      var size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
      var need = size >= LARGE_PX || (bold && size >= 19) ? LARGE : TEXT;
      if (fg[3] > 60 && ratio < need - 0.05) add('low-contrast', el, label(el) + ' ' + ratio.toFixed(2) + ':1');
    }
    texts.push(el);
  }
}
// 5. Two pieces of text drawn over each other (neither containing the other).
for (var x = 0; x < texts.length && x < 400; x++) {
  var ra = texts[x].getBoundingClientRect();
  for (var y = x + 1; y < texts.length && y < 400; y++) {
    var A = texts[x], B = texts[y];
    // Content scrolls under a sticky or fixed bar by design; only text on the same layer can collide.
    if (A.contains(B) || B.contains(A) || pinned(A) !== pinned(B)) continue;
    var rb = B.getBoundingClientRect();
    var w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 4 && h > 4 && w * h > 0.3 * Math.min(ra.width * ra.height, rb.width * rb.height)) add('overlap', B, label(A) + ' / ' + label(B));
  }
}
return out;
`

const HOW: Record<AuditRule, string> = {
  overflow: 'runs past the right edge of the screen — constrain it (max-width: 100%, min-width: 0, flex-wrap, or a shorter label)',
  'clipped-text': 'text is cut off without an ellipsis — let it wrap, or add text-overflow: ellipsis with white-space: nowrap',
  'small-target': `is too small to tap — make it at least ${HIG.minTargetPx}×${HIG.minTargetPx}px (min-height / min-width or padding), without changing its look otherwise`,
  'low-contrast': `text is too faint — it needs ${HIG.contrast.text}:1 against its background (${HIG.contrast.largeText}:1 from ${HIG.contrast.largeTextPx}px): darken the text (var(--fg), var(--fg-2), or a colour mixed toward var(--fg)); never lighten the background`,
  overlap: 'two texts are drawn over each other — give each its own line or enough space (display: block, gap, line-height)',
}

/**
 * The instruction for fixing a screen's findings in one edit-by-parts call (EYE-02): each problem
 * with the element at fault, so the model touches only those elements. Findings without an element
 * id cannot be targeted and are left out; at most twelve.
 */
export function fixInstruction(findings: AuditFinding[]): string {
  const seen = new Set<string>()
  const lines = findings
    .filter((f) => f.id && !seen.has(`${f.rule}|${f.id}`) && seen.add(`${f.rule}|${f.id}`))
    .slice(0, 12)
    .map((f) => `- data-od-id="${f.id}"${f.detail ? ` (${f.detail})` : ''}: ${HOW[f.rule]}.`)
  return lines.length
    ? `Fix these problems found in the rendered screen. Change only the elements listed, as little as needed; keep the design, the content and every other element exactly as they are.\n${lines.join('\n')}`
    : ''
}

/** Findings arrive from a sandboxed page: keep only well-formed ones, capped. */
export function parseAudit(v: unknown): AuditFinding[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .filter((f) => (AUDIT_RULES as readonly string[]).includes(f.rule as string))
    .map((f) => ({
      rule: f.rule as AuditRule,
      id: typeof f.id === 'string' && /^[\w-]{1,80}$/.test(f.id) ? f.id : null,
      detail: typeof f.detail === 'string' ? f.detail.slice(0, 120) : '',
    }))
    .slice(0, 40)
}

/** The in-frame script: audits once the page has settled and posts the findings to the editor. */
export const AUDIT_BRIDGE = `<script id="__od_audit">
(function () {
  function run() { try { window.parent.postMessage({ type: 'od:audit', findings: (function () { ${AUDIT_SOURCE} })() }, '*'); } catch (e) {} }
  var go = function () { setTimeout(run, 400); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else window.addEventListener('load', go);
})();
</script>`
