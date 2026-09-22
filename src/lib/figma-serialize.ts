// FIG-01: a rendered screen as a neutral tree of layers (ODNode), read inside the screen's own frame
// where the browser has already done the layout — computed styles, real positions, Tailwind
// compiled, fonts loaded. From this tree the SVG copy (FIG-02) and the Figma plugin (FIG-03) build
// editable layers; nothing downstream has to understand CSS.
//
// Flex containers carry their layout (direction, gap, padding, alignment) so the plugin can map
// them to Auto Layout; everything else is placed absolutely. The app's own markers name the layers
// ("Tab bar", "Photo · cappuccino", "Chart · bar"), which no screenshot tool can.

export const OD_TREE_VERSION = 1

export type RGBA = { r: number; g: number; b: number; a: number }
export type Fill = { type: 'solid'; color: RGBA } | { type: 'gradient'; css: string; fallback: RGBA }
export type Font = { family: string; size: number; weight: number; italic: boolean; lineHeight: number; letterSpacing: number; color: RGBA; align: 'left' | 'center' | 'right' | 'justify'; decoration: 'none' | 'underline' | 'line-through' }
export type Layout = { mode: 'row' | 'column'; gap: number; padding: [number, number, number, number]; justify: string; align: string; wrap: boolean }
export type Line = { x: number; y: number; w: number; h: number; text: string }

export type ODNode = {
  type: 'frame' | 'text' | 'image' | 'svg'
  name: string
  x: number
  y: number
  w: number
  h: number
  opacity?: number
  // frame
  fills?: Fill[]
  stroke?: { color: RGBA; width: number }
  radius?: [number, number, number, number]
  shadows?: { x: number; y: number; blur: number; spread: number; color: RGBA; inset: boolean }[]
  clip?: boolean
  layout?: Layout
  children?: ODNode[]
  // text
  text?: string
  font?: Font
  lines?: Line[]
  // image
  src?: string
  fit?: 'cover' | 'contain' | 'fill'
  // svg (icons, charts, maps), colours resolved
  svg?: string
}

export type ODTree = { version: number; name: string; width: number; height: number; background: RGBA; root: ODNode }

/** A function body (as source) that returns the ODTree of the current document. ES5, no imports. */
export const SERIALIZE_SOURCE = `
var canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
var ctx = canvas.getContext('2d', { willReadFrequently: true });
// Any CSS colour (rgb, oklab, color-mix results) to RGBA, through the canvas.
function rgba(c) {
  if (!c || c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);
  var p = ctx.getImageData(0, 0, 1, 1).data;
  return { r: p[0], g: p[1], b: p[2], a: Math.round(p[3] / 255 * 1000) / 1000 };
}
function px(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
function r1(n) { return Math.round(n * 10) / 10; }
var sx = window.scrollX, sy = window.scrollY;
function box(el) { var r = el.getBoundingClientRect(); return { x: r1(r.left + sx), y: r1(r.top + sy), w: r1(r.width), h: r1(r.height) }; }
function visible(el, cs) {
  if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
  var r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}
function nameOf(el) {
  var a = function (n) { return el.getAttribute(n); };
  if (el.hasAttribute('data-od-shell')) return /nav|tab/i.test(el.tagName + ' ' + (a('data-od-shell') || '')) ? 'Tab bar' : 'Header';
  if (a('data-od-img')) return 'Photo · ' + a('data-od-img');
  if (a('data-od-avatar')) return 'Avatar · ' + a('data-od-avatar');
  if (el.hasAttribute('data-od-logo-resolved')) return 'Logo';
  if (a('data-od-chart')) return 'Chart · ' + a('data-od-chart');
  if (el.hasAttribute('data-od-map-rendered')) return 'Map';
  if (a('data-lucide')) return 'Icon · ' + a('data-lucide');
  if (el.tagName === 'BUTTON' || a('role') === 'button') return 'Button · ' + (el.textContent || '').trim().slice(0, 24);
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return 'Input · ' + (a('placeholder') || a('aria-label') || '');
  var cls = (el.getAttribute('class') || '').split(/\\s+/).filter(function (c) { return c && !/[:\\[\\]]/.test(c); })[0];
  return (el.tagName.toLowerCase() + (cls ? '.' + cls : '')).slice(0, 60);
}
function fillsOf(cs) {
  var out = [], bg = rgba(cs.backgroundColor);
  if (bg.a > 0) out.push({ type: 'solid', color: bg });
  var img = cs.backgroundImage;
  if (img && img !== 'none' && /gradient/.test(img)) {
    var stop = img.match(/(rgba?\\([^)]*\\)|#[0-9a-f]{3,8}|oklab\\([^)]*\\)|color\\([^)]*\\))/i);
    out.push({ type: 'gradient', css: img.slice(0, 400), fallback: rgba(stop ? stop[1] : cs.backgroundColor) });
  }
  return out;
}
function strokeOf(cs) {
  var w = px(cs.borderTopWidth), c = rgba(cs.borderTopColor);
  return w > 0 && cs.borderTopStyle !== 'none' && c.a > 0 ? { color: c, width: w } : undefined;
}
function radiusOf(cs) {
  var r = [px(cs.borderTopLeftRadius), px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderBottomLeftRadius)];
  return r[0] || r[1] || r[2] || r[3] ? r : undefined;
}
function shadowsOf(cs) {
  var s = cs.boxShadow; if (!s || s === 'none') return undefined;
  var out = [];
  s.split(/,(?![^(]*\\))/).forEach(function (part) {
    var color = (part.match(/(rgba?\\([^)]*\\)|#[0-9a-f]{3,8}|oklab\\([^)]*\\)|color\\([^)]*\\))/i) || [])[1] || 'rgba(0,0,0,0.2)';
    var nums = part.replace(color, '').match(/-?\\d*\\.?\\d+px/g) || [];
    out.push({ x: px(nums[0]), y: px(nums[1]), blur: px(nums[2]), spread: px(nums[3]), color: rgba(color), inset: /inset/.test(part) });
  });
  return out.length ? out : undefined;
}
function layoutOf(el, cs) {
  if (!/flex/.test(cs.display)) return undefined;
  for (var i = 0; i < el.children.length; i++) {
    var p = getComputedStyle(el.children[i]).position;
    if (p === 'absolute' || p === 'fixed') return undefined; // overlaid children: keep absolute placement
  }
  var row = /row/.test(cs.flexDirection);
  return {
    mode: row ? 'row' : 'column',
    gap: px(row ? cs.columnGap : cs.rowGap),
    padding: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
    justify: cs.justifyContent, align: cs.alignItems, wrap: cs.flexWrap === 'wrap',
  };
}
function fontOf(cs) {
  var size = px(cs.fontSize);
  var lh = cs.lineHeight === 'normal' ? size * 1.2 : px(cs.lineHeight);
  var ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
  var fam = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
  var dec = /line-through/.test(cs.textDecorationLine) ? 'line-through' : /underline/.test(cs.textDecorationLine) ? 'underline' : 'none';
  var al = cs.textAlign === 'center' || cs.textAlign === 'right' || cs.textAlign === 'justify' ? cs.textAlign : cs.textAlign === 'end' ? 'right' : 'left';
  return { family: fam, size: size, weight: Number(cs.fontWeight) || 400, italic: cs.fontStyle === 'italic', lineHeight: r1(lh), letterSpacing: r1(ls), color: rgba(cs.color), align: al, decoration: dec };
}
function transform(t, cs) {
  if (cs.textTransform === 'uppercase') return t.toUpperCase();
  if (cs.textTransform === 'lowercase') return t.toLowerCase();
  if (cs.textTransform === 'capitalize') return t.replace(/\\b\\w/g, function (c) { return c.toUpperCase(); });
  return t;
}
// A run of text as it is drawn: one entry per visual line, with its own box.
function textNode(node, cs) {
  var raw = node.textContent.replace(/\\s+/g, ' ');
  if (!raw.trim()) return null;
  var range = document.createRange(); range.selectNodeContents(node);
  var rects = range.getClientRects(), lines = [], words = raw.trim();
  if (!rects.length) return null;
  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (var i = 0; i < rects.length; i++) {
    var q = rects[i]; if (q.width < 0.5) continue;
    minX = Math.min(minX, q.left); minY = Math.min(minY, q.top); maxX = Math.max(maxX, q.right); maxY = Math.max(maxY, q.bottom);
    lines.push({ x: r1(q.left + sx), y: r1(q.top + sy), w: r1(q.width), h: r1(q.height), text: '' });
  }
  if (!lines.length) return null;
  // Split the text over the line boxes by measuring each character's line.
  if (lines.length === 1) lines[0].text = transform(words, cs);
  else {
    var t = node.textContent, cur = -1, buf = '', li = 0;
    for (var k = 0; k < t.length; k++) {
      var cr = document.createRange(); cr.setStart(node, k); cr.setEnd(node, k + 1);
      var b = cr.getClientRects()[0];
      if (b) { for (var j = 0; j < lines.length; j++) if (Math.abs(b.top + sy - lines[j].y) < lines[j].h / 2 + 1) { li = j; break; } }
      if (li !== cur && cur !== -1) { lines[cur].text += buf; buf = ''; }
      cur = li; buf += t[k];
    }
    if (cur !== -1) lines[cur].text += buf;
    for (var m = 0; m < lines.length; m++) lines[m].text = transform(lines[m].text.replace(/\\s+/g, ' ').trim(), cs);
    lines = lines.filter(function (l) { return l.text; });
  }
  return { type: 'text', name: words.slice(0, 40), x: r1(minX + sx), y: r1(minY + sy), w: r1(maxX - minX), h: r1(maxY - minY), text: transform(words, cs), font: fontOf(cs), lines: lines };
}
// An SVG with every colour resolved, so it looks the same outside the page's CSS.
function svgOf(el) {
  var clone = el.cloneNode(true), src = el.querySelectorAll('*'), dst = clone.querySelectorAll('*');
  var own = getComputedStyle(el);
  [[el, clone]].concat(Array.prototype.map.call(src, function (s, i) { return [s, dst[i]]; })).forEach(function (pair) {
    var cs = getComputedStyle(pair[0]), d = pair[1];
    ['fill', 'stroke'].forEach(function (p) {
      var v = cs[p]; if (!v || v === 'none') { d.setAttribute(p, 'none'); return; }
      if (/^url/.test(v)) return;
      var c = rgba(v); d.setAttribute(p, c.a ? 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')' : 'none'); if (c.a && c.a < 1) d.setAttribute(p + '-opacity', c.a);
    });
    if (cs.strokeWidth && cs.strokeWidth !== '1px') d.setAttribute('stroke-width', px(cs.strokeWidth));
    if (cs.fontFamily && pair[0].tagName.toLowerCase() === 'text') { d.setAttribute('font-family', cs.fontFamily.split(',')[0].replace(/["']/g, '')); d.setAttribute('font-size', px(cs.fontSize)); d.setAttribute('font-weight', cs.fontWeight); }
    d.removeAttribute('class'); d.removeAttribute('style');
  });
  var r = el.getBoundingClientRect();
  clone.setAttribute('width', r1(r.width)); clone.setAttribute('height', r1(r.height));
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', '0 0 ' + r1(r.width) + ' ' + r1(r.height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (own.color) clone.setAttribute('color', own.color);
  return clone.outerHTML.slice(0, 200000);
}
function walk(el, depth) {
  if (depth > 60) return null;
  var cs = getComputedStyle(el);
  if (!visible(el, cs)) return null;
  var b = box(el), tag = el.tagName;
  var base = { name: nameOf(el), x: b.x, y: b.y, w: b.w, h: b.h };
  var op = Number(cs.opacity); if (op < 1) base.opacity = op;
  if (tag === 'svg') return Object.assign(base, { type: 'svg', svg: svgOf(el) });
  if (tag === 'IMG') {
    var fit = cs.objectFit === 'contain' ? 'contain' : cs.objectFit === 'fill' ? 'fill' : 'cover';
    return Object.assign(base, { type: 'image', src: el.currentSrc || el.src || '', fit: fit, radius: radiusOf(cs), fills: fillsOf(cs) });
  }
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    var n = Object.assign(base, { type: 'frame', fills: fillsOf(cs), stroke: strokeOf(cs), radius: radiusOf(cs), children: [] });
    var val = el.value || el.getAttribute('placeholder') || '';
    if (val && el.type !== 'checkbox' && el.type !== 'radio') {
      var f = fontOf(cs); if (!el.value) f.color = rgba(getComputedStyle(el, '::placeholder').color || cs.color);
      var tx = b.x + px(cs.paddingLeft), ty = b.y + (b.h - f.lineHeight) / 2;
      n.children.push({ type: 'text', name: val.slice(0, 40), x: r1(tx), y: r1(ty), w: r1(b.w - px(cs.paddingLeft) - px(cs.paddingRight)), h: f.lineHeight, text: val, font: f, lines: [{ x: r1(tx), y: r1(ty), w: r1(b.w - px(cs.paddingLeft) - px(cs.paddingRight)), h: f.lineHeight, text: val }] });
    }
    return n;
  }
  var node = Object.assign(base, { type: 'frame', fills: fillsOf(cs), stroke: strokeOf(cs), radius: radiusOf(cs), shadows: shadowsOf(cs), clip: cs.overflow !== 'visible' || cs.overflowX !== 'visible', layout: layoutOf(el, cs), children: [] });
  // A background photo (hero cards) is a photo layer behind the children.
  var bgImg = cs.backgroundImage && (cs.backgroundImage.match(/url\\(["']?([^"')]+)["']?\\)/) || [])[1];
  if (bgImg) node.children.push({ type: 'image', name: 'Background photo', x: b.x, y: b.y, w: b.w, h: b.h, src: bgImg, fit: cs.backgroundSize === 'contain' ? 'contain' : 'cover', radius: node.radius });
  for (var c = el.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 3) { var t = textNode(c, cs); if (t) node.children.push(t); }
    else if (c.nodeType === 1 && !/^(SCRIPT|STYLE|TEMPLATE|META|LINK|NOSCRIPT)$/.test(c.tagName)) { var k = walk(c, depth + 1); if (k) node.children.push(k); }
  }
  // A plain wrapper with one child and nothing of its own is just that child.
  var bare = !node.fills.length && !node.stroke && !node.shadows && !node.radius && !node.layout && node.opacity === undefined;
  if (bare && node.children.length === 1 && depth > 0 && !el.hasAttribute('data-od-shell')) return node.children[0];
  if (!node.children.length && !node.fills.length && !node.stroke && !node.shadows) return null;
  ['stroke', 'radius', 'shadows', 'layout'].forEach(function (k) { if (node[k] === undefined) delete node[k]; });
  if (!node.clip) delete node.clip;
  return node;
}
var body = document.body, doc = document.documentElement;
var root = walk(body, 0) || { type: 'frame', name: 'Screen', x: 0, y: 0, w: doc.clientWidth, h: doc.scrollHeight, children: [] };
root.x = 0; root.y = 0; root.w = doc.clientWidth; root.h = Math.max(doc.scrollHeight, body.scrollHeight);
root.name = document.title || 'Screen';
var bg = rgba(getComputedStyle(body).backgroundColor); if (!bg.a) bg = rgba(getComputedStyle(doc).backgroundColor); if (!bg.a) bg = { r: 255, g: 255, b: 255, a: 1 };
return { version: ${OD_TREE_VERSION}, name: root.name, width: root.w, height: root.h, background: bg, root: root };
`

/** The in-frame bridge: answers `od:serialize` from the parent with the tree. */
export const SERIALIZE_BRIDGE = `<script id="__od_serialize">
window.addEventListener('message', function (e) {
  if (e.source !== window.parent || !e.data || e.data.type !== 'od:serialize') return;
  var tree = null, error = null;
  try { tree = (function () { ${SERIALIZE_SOURCE} })(); } catch (err) { error = String(err && err.message || err); }
  window.parent.postMessage({ type: 'od:serialized', requestId: e.data.requestId, tree: tree, error: error }, '*');
});
</script>`

/** A tree arriving from a sandboxed frame: shape-checked before anything uses it. */
export function parseTree(v: unknown): ODTree | null {
  if (!v || typeof v !== 'object') return null
  const t = v as Partial<ODTree>
  if (t.version !== OD_TREE_VERSION || typeof t.width !== 'number' || typeof t.height !== 'number' || !t.root || typeof t.root !== 'object') return null
  return t as ODTree
}
