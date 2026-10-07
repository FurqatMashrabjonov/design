// KON-13: what only a rendered screen shows. The model writes a component without ever seeing it; this runs in
// the drawn page (the kit answers od:audit) and measures what a person would notice at a glance — a row pushed
// off the screen, text cut off, text drawn over text, a card sitting on a heading, text too faint to read, half
// a phone left empty. Each finding names the text it is about and the Konsta part it sits in, which is what the
// one repair call needs to find it in its own code. It measures; it never edits.
//
// The page is laid out in a frame as tall as its content (as the canvas shows it), so every element is in view
// and elementFromPoint can tell what is on top.

export const AUDIT_RULES = ['overflow', 'clipped-text', 'overlap', 'covered-text', 'low-contrast', 'sparse', 'broken-value', 'crash'] as const
export type AuditRule = (typeof AUDIT_RULES)[number]
export type AuditFinding = { rule: AuditRule; where: string; detail: string }

/** A function body (as source) that returns the findings for the current document. */
export const AUDIT_SOURCE = `
var PHONE_H = 844, out = [], seen = {};
// 0. The screen crashed (the kit's Crash boundary, or the module failed to load): the one finding that matters —
// before this, a crashed screen had no findings at all, so the repair never ran on it and the person saw the error.
var crashed = document.querySelector('[data-od-crash]');
if (crashed) return [{ rule: 'crash', where: '(Page)', detail: (crashed.textContent || '').replace(/^This screen crashed:\\s*/, '').slice(0, 160) }];
var vw = document.documentElement.clientWidth;
var PARTS = [['k-navbar','Navbar'],['k-tabbar','Tab bar'],['k-toolbar','Toolbar'],['k-segmented','Segmented'],['k-searchbar','Searchbar'],['k-list-item','List row'],['k-list','List'],['k-card','Card'],['k-block-title','Block title'],['k-block','Block'],['k-chip','Chip'],['k-button','Button'],['k-fab','Fab'],['k-sheet','Sheet'],['k-popup','Popup']];
function part(el) {
  for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
    var c = ' ' + (e.getAttribute('class') || '') + ' ';
    for (var i = 0; i < PARTS.length; i++) if (c.indexOf(' ' + PARTS[i][0] + ' ') >= 0) return PARTS[i][1];
    if (e.hasAttribute('data-od-kit')) return e.getAttribute('data-od-kit');
  }
  return el.tagName.toLowerCase();
}
function label(el) { return (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').replace(/\\s+/g, ' ').trim().slice(0, 48); }
function where(el) { var t = label(el); return (t ? '"' + t + '" ' : '') + '(' + part(el) + ')'; }
function add(rule, el, detail) {
  var w = where(el), key = rule + '|' + w;
  if (seen[key] || out.length >= 12) return;
  seen[key] = 1; out.push({ rule: rule, where: w, detail: String(detail).slice(0, 160) });
}
function visible(el) {
  var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
}
function ownText(el) { for (var i = 0; i < el.childNodes.length; i++) { var n = el.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()) return true; } return false; }
function pinned(el) { for (var e = el; e && e.nodeType === 1; e = e.parentElement) { var p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; }
// A row meant to scroll sideways (chips, a carousel) may be wider than the phone; Konsta's page is not such a row.
function scrollsX(el) {
  for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    if (/\\bk-page\\b/.test(p.getAttribute('class') || '')) return false;
    var o = getComputedStyle(p).overflowX;
    if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 2) return true;
  }
  return false;
}
// The nearest box that hides what spills out of it (not a scroller, not the page).
function clipper(el) {
  for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    if (/\\bk-page\\b/.test(p.getAttribute('class') || '')) return null;
    var o = getComputedStyle(p).overflowX;
    if (o === 'hidden' || o === 'clip') return p;
    if (o === 'auto' || o === 'scroll') return null;
  }
  return null;
}
// The horizontal extent of a box that is actually drawn: cut by every ancestor that hides its overflow (the
// page itself excepted — a page that spills sideways is the bug).
function seenX(el, r) {
  var l = r.left, rr = r.right;
  for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    if (/\bk-page\b/.test(p.getAttribute('class') || '')) break;
    var o = getComputedStyle(p).overflowX;
    if (o !== 'visible') { var b = p.getBoundingClientRect(); l = Math.max(l, b.left); rr = Math.min(rr, b.right); }
  }
  return [l, rr];
}
var canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
var ctx = canvas.getContext('2d', { willReadFrequently: true });
function rgba(c) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return ctx.getImageData(0, 0, 1, 1).data; }
function lum(p) { function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]); }
// What is behind a piece of text: translucent layers are painted onto the first opaque one; a photo or a
// gradient behind it cannot be judged, so it is not.
// The colour stops of a CSS gradient, or null for a photo (url) — a gradient is judged at its worst stop.
function stops(bgi) {
  if (/url\\(/.test(bgi)) return null;
  var m = bgi.match(/rgba?\\([^)]+\\)|#[0-9a-f]{3,8}\\b/gi);
  return m && m.length ? m.map(rgba) : null;
}
function background(el) {
  var layers = [];
  for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
    var cs = getComputedStyle(e);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') { var st = stops(cs.backgroundImage); return st ? st.map(function (c) { return flatten(layers, c); }) : null; }
    if (e.tagName === 'IMG' || e.hasAttribute('data-od-photo')) return null;
    var c = rgba(cs.backgroundColor);
    if (c[3] > 230) return [flatten(layers, c)];
    if (c[3] > 8) layers.push(c);
  }
  return [flatten(layers, rgba(getComputedStyle(document.body).backgroundColor))];
}
function flatten(layers, base) {
  var o = [base[0], base[1], base[2], 255];
  for (var i = layers.length - 1; i >= 0; i--) { var a = layers[i][3] / 255; o = [o[0] + (layers[i][0] - o[0]) * a, o[1] + (layers[i][1] - o[1]) * a, o[2] + (layers[i][2] - o[2]) * a, 255]; }
  return o;
}
function paints(e) { var cs = getComputedStyle(e); return e.tagName === 'IMG' || (cs.backgroundImage && cs.backgroundImage !== 'none') || rgba(cs.backgroundColor)[3] > 160; }
// Something that paints over the text: any box between what is on top and the branch the text lives on.
function covers(top, el) {
  for (var e = top; e && e.nodeType === 1 && !e.contains(el); e = e.parentElement) if (paints(e)) return true;
  return false;
}
// Is el what the browser shows at (x, y)?
function shows(el, x, y) { var t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t) || t.contains(el)); }
// Art turned on purpose (two tilted cards on an onboarding slide) overlaps by design.
function turned(el) {
  for (var e = el; e && e.nodeType === 1; e = e.parentElement) { var t = getComputedStyle(e).transform; if (t && t !== 'none') { var m = t.match(/matrix\(([^)]+)\)/); if (m && Math.abs(parseFloat(m[1].split(',')[1])) > 0.01) return true; } }
  return false;
}
function emojiOnly(el) { return !/[\p{L}\p{N}]/u.test(el.textContent || ''); }
function onPhoto(el, r) {
  var stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  for (var i = 0; i < stack.length; i++) if (stack[i].tagName === 'IMG' || stack[i].hasAttribute('data-od-photo') || /url\\(/.test(getComputedStyle(stack[i]).backgroundImage || '')) return true;
  return false;
}

var all = document.body ? document.body.querySelectorAll('*') : [];
var texts = [], reported = [], bottom = 0;
for (var i = 0; i < all.length; i++) {
  var el = all[i];
  if (/^(SCRIPT|STYLE|SVG|PATH|BR|HEAD|META|LINK|TEMPLATE|CANVAS)$/i.test(el.tagName) || (el.closest && el.closest('svg'))) continue;
  if (!visible(el) || (el.closest && el.closest('[aria-hidden="true"]'))) continue; // decoration (a glow) is not content
  var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  var fixed = pinned(el);
  if (!fixed && (ownText(el) || el.tagName === 'IMG' || el.tagName === 'BUTTON' || el.tagName === 'INPUT')) bottom = Math.max(bottom, r.bottom);
  // 1. Past the phone's edge. Only the outermost box is named: its children spill with it.
  // A box entirely off the screen, or one the browser does not show where it is on screen (a slide parked to the
  // side, the back of a flip card), is hidden on purpose.
  // What a box that hides its overflow (a progress track, a card) cuts away is not on screen either.
  var cl = seenX(el, r), onL = Math.max(0, cl[0]), onR = Math.min(vw, cl[1]);
  if ((cl[1] > vw + 2 || cl[0] < -2) && onR - onL > 8 && !fixed && !scrollsX(el) && shows(el, (onL + onR) / 2, r.top + Math.min(r.height / 2, 20))) {
    var inside = false;
    for (var k = 0; k < reported.length; k++) if (reported[k].contains(el)) { inside = true; break; }
    if (!inside) { reported.push(el); add('overflow', el, 'runs past the ' + (cl[1] > vw + 2 ? 'right' : 'left') + ' edge of the ' + vw + 'px phone by ' + Math.round(cl[1] > vw + 2 ? cl[1] - vw : -cl[0]) + 'px'); }
  }
  if (!ownText(el)) continue;
  texts.push(el);
  // 2. Text cut off: wider than its own box with no ellipsis, or spilling out of a box that hides it.
  if (el.scrollWidth > el.clientWidth + 2 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis' && !/-webkit-box/.test(cs.display)) add('clipped-text', el, 'is cut off: its text is ' + (el.scrollWidth - el.clientWidth) + 'px wider than its box');
  else {
    var box = clipper(el);
    if (box) { var b = box.getBoundingClientRect(); if (r.left < b.left - 2 || r.right > b.right + 2) add('clipped-text', el, 'is cut off by the edge of its ' + part(box)); }
  }
  // 3. Text under something drawn on top of it (a card over a heading), by what the browser shows at its middle.
  if (!fixed && r.top >= 0 && r.width > 6 && r.height > 6) {
    // The middle and the lower part of the line: a card pulled up by a negative margin cuts the descenders first.
    var pts = [[0.5, 0.5], [0.25, 0.8], [0.5, 0.8]];
    for (var q = 0; q < pts.length; q++) {
      var top = document.elementFromPoint(r.left + r.width * pts[q][0], r.top + r.height * pts[q][1]);
      if (top && top !== el && !el.contains(top) && !top.contains(el) && !turned(el) && covers(top, el) && !/\\bk-(navbar|tabbar|toolbar)\\b/.test((top.closest && top.closest('.k-navbar, .k-tabbar, .k-toolbar') || {}).className || '')) { add('covered-text', el, 'is hidden under ' + where(top)); break; }
    }
  }
  // 4. Text a person cannot read at all. Coloured figures on white (an orange 1,470) are a style the skill asks
  // for, so only near-invisible text counts; emoji and text on a photo are not judged.
  var bgs = !emojiOnly(el) && !onPhoto(el, r) && background(el);
  if (bgs) {
    var fg = rgba(cs.color), ratio = 99;
    for (var bi = 0; bi < bgs.length; bi++) { var bg = bgs[bi]; ratio = Math.min(ratio, (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05)); }
    if (fg[3] > 60 && ratio < 1.6) add('low-contrast', el, 'is almost invisible: ' + ratio.toFixed(2) + ':1 against its background');
  }
}
// 5. Two pieces of text drawn over each other.
for (var x = 0; x < texts.length && x < 300; x++) {
  var ra = texts[x].getBoundingClientRect();
  for (var y = x + 1; y < texts.length && y < 300; y++) {
    var A = texts[x], B = texts[y];
    if (A.contains(B) || B.contains(A) || pinned(A) !== pinned(B)) continue;
    var rb = B.getBoundingClientRect();
    var w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (!(w > 4 && h > 4 && w * h > 0.3 * Math.min(ra.width * ra.height, rb.width * rb.height))) continue;
    // Only where the browser really draws one of them (a closed sheet parked off screen draws nothing), and not in
    // art that was turned on purpose.
    var cx = Math.max(ra.left, rb.left) + w / 2, cy = Math.max(ra.top, rb.top) + h / 2;
    if (!(shows(A, cx, cy) || shows(B, cx, cy)) || turned(A) || turned(B)) continue;
    add('overlap', B, 'is drawn over ' + where(A));
  }
}
// 7. A value the code could not make (FUN-01: a date parsed wrong, a sum of undefined): the person reads "Invalid Date".
var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
for (var tn; (tn = walker.nextNode());) {
  var m = /\\b(Invalid Date|NaN|undefined)\\b|\\[object Object\\]/.exec(tn.textContent || '');
  if (m && tn.parentElement && visible(tn.parentElement)) add('broken-value', tn.parentElement, 'shows "' + m[0] + '"');
}
// 6. Half a phone left empty: the content stops high up on a phone-tall screen.
if (bottom > 0 && bottom < PHONE_H * 0.6) out.push({ rule: 'sparse', where: '(Page)', detail: 'the content ends ' + Math.round(bottom) + 'px down; the lower ' + Math.round(100 - (bottom / PHONE_H) * 100) + '% of the phone is empty' });
return out;
`

/** Findings arrive from a sandboxed page: keep only well-formed ones, capped. */
export function parseAudit(v: unknown): AuditFinding[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object' && (AUDIT_RULES as readonly string[]).includes(f.rule as string))
    .map((f) => ({ rule: f.rule as AuditRule, where: String(f.where ?? '').slice(0, 80), detail: String(f.detail ?? '').slice(0, 160) }))
    .slice(0, 12)
}

/** The findings as the repair call reads them: what is wrong, where, and what "fixed" means. */
export function auditBrief(findings: AuditFinding[]): string {
  const how: Record<AuditRule, string> = {
    overflow: 'make it fit the phone width (wrap, shrink, fewer items per row, or a horizontal scroller with overflow-x-auto)',
    'clipped-text': 'give the text room (shorter label, smaller type, wrap to two lines, or fewer items in the row)',
    overlap: 'give each its own space; nothing absolute or negative-margin over text',
    'covered-text': 'move the covering element out of the way; no negative margins pulling a card over a heading',
    'low-contrast': 'use a text colour that reads on that background',
    crash: 'the screen throws while rendering — fix exactly this error (an identifier that does not exist, a value used as a function); until it renders, nothing else matters',
    'broken-value': 'compute the value from the store or the data correctly (a date from a \'YYYY-MM-DD\' string is new Date(s + \'T00:00:00\'); a missing field gets a fallback) so a real value shows',
    sparse: 'fill the screen with real content from APP DATA (more rows, a second section, a summary) — not filler, not a giant empty illustration',
  }
  return findings.map((f) => `- ${f.where} ${f.detail} → ${how[f.rule]}`).join('\n')
}
