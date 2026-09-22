// LP-02: the streaming preview is one iframe, opened once, whose insides are patched as the model
// writes. Swapping srcdoc on every update reloaded the frame — a white flash, Tailwind's CDN script
// re-fetched and recompiling the whole page, fonts re-requested, scroll lost — and froze the browser
// with three screens streaming at once. Now the parent posts the repaired document and this
// runtime, inside the frame, morphs the body (idiomorph: existing nodes stay, only new ones are
// added), updates <style> text in place and adds each external script or stylesheet once.
//
// LP-03 hooks: while the document has no body content yet (the model is still writing CSS), the
// frame shows a skeleton; every node the morph adds carries data-od-new for a reveal animation.
import { IDIOMORPH } from './vendor/idiomorph.ts'

export const STREAM_MESSAGE = 'od:stream'

const SHIMMER_CSS = `
[data-od-skeleton]{position:absolute;inset:0;padding:20px 16px;display:flex;flex-direction:column;gap:14px;background:#fff;pointer-events:none}
[data-od-phase]{position:absolute;left:0;right:0;bottom:24px;text-align:center;font:500 12px/1 system-ui,sans-serif;color:#8a8a8a;letter-spacing:.02em}
[data-od-skeleton] i{display:block;border-radius:12px;background:linear-gradient(90deg,#eee 25%,#f7f7f7 50%,#eee 75%);background-size:200% 100%;animation:od-shimmer 1.4s linear infinite}
@keyframes od-shimmer{to{background-position:-200% 0}}
img[data-od-img]:not([src]),img[data-od-img][src=""],img[data-od-avatar]:not([src]),img[data-od-logo]:not([src]){color:transparent;background:linear-gradient(90deg,#e9e9e9 25%,#f4f4f4 50%,#e9e9e9 75%);background-size:200% 100%;animation:od-shimmer 1.4s linear infinite}
[data-od-new]{animation:od-reveal .24s ease-out both}
@keyframes od-reveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){[data-od-new],[data-od-skeleton] i{animation:none}}
`

// Blocks in the shape of a typical screen: header row, hero, list rows, a bar at the bottom.
const SKELETON = `<div data-od-skeleton><span data-od-phase>Thinking…</span><i style="height:28px;width:55%"></i><i style="height:44px"></i><i style="height:160px"></i><i style="height:20px;width:40%"></i><i style="height:72px"></i><i style="height:72px"></i><i style="height:72px"></i><i style="height:72px"></i></div>`

const RUNTIME = `
${IDIOMORPH}
(function () {
  var head = document.head, body = document.body, styles = [], added = {}, revealed = 0;
  function sameOrigin(e) { return e.source === window.parent; }
  function addOnce(el) {
    var key = el.tagName + ':' + (el.getAttribute('src') || el.getAttribute('href') || '');
    if (!key.split(':')[1] || added[key]) return;
    added[key] = 1;
    var copy = document.createElement(el.tagName);
    for (var i = 0; i < el.attributes.length; i++) copy.setAttribute(el.attributes[i].name, el.attributes[i].value);
    head.appendChild(copy);
  }
  function syncHead(next) {
    var i = 0;
    next.querySelectorAll('head > style').forEach(function (s) {
      if (!styles[i]) { styles[i] = document.createElement('style'); head.appendChild(styles[i]); }
      if (styles[i].textContent !== s.textContent) styles[i].textContent = s.textContent;
      i++;
    });
    next.querySelectorAll('head > link[rel="stylesheet"], head > script[src]').forEach(addOnce);
    if (next.title && document.title !== next.title) document.title = next.title;
  }
  var photos = {};
  // The same normalisation as lib/image-slots normalizeQuery, so a slot finds its URL.
  function norm(s) { return String(s || '').toLowerCase().replace(/[^\\p{L}\\p{N}\\s-]/gu, ' ').replace(/\\s+/g, ' ').trim().slice(0, 80); }
  function fillPhotos() {
    document.querySelectorAll('img[data-od-img]:not([src]), img[data-od-img][src=""]').forEach(function (img) {
      var url = photos[norm(img.getAttribute('data-od-img'))];
      if (!url || url.indexOf('https://images.pexels.com/') !== 0) return;
      img.style.objectFit = img.style.objectFit || 'cover';
      img.setAttribute('src', url);
    });
  }
  var lastH = 0;
  function reportHeight() {
    var h = Math.ceil(document.documentElement.scrollHeight);
    if (Math.abs(h - lastH) < 8) return;
    lastH = h;
    window.parent.postMessage({ type: '${STREAM_MESSAGE}:height', height: h }, '*');
  }
  function apply(html) {
    var next = new DOMParser().parseFromString(html, 'text/html');
    syncHead(next);
    // Inline scripts do not run when morphed in; the finished screen brings its own. Only external
    // ones (Tailwind, Lucide) are added, once, so the page can style itself while it streams.
    next.querySelectorAll('body script').forEach(function (s) { if (s.getAttribute('src')) addOnce(s); s.remove(); });
    var hasContent = next.body && next.body.children.length > 0;
    if (!hasContent) {
      // The model is writing its stylesheet — the longest part of a screen (LP-03).
      var ph = body.querySelector('[data-od-phase]');
      if (ph && styles.length) ph.textContent = 'Styling…';
      return;
    }
    var skel = body.querySelector('[data-od-skeleton]');
    if (skel) skel.remove();
    if (next.body.getAttribute('class') !== body.getAttribute('class')) body.className = next.body.getAttribute('class') || '';
    if (next.body.getAttribute('style') !== body.getAttribute('style')) body.setAttribute('style', next.body.getAttribute('style') || '');
    Idiomorph.morph(body, next.body, {
      morphStyle: 'innerHTML',
      callbacks: {
        afterNodeAdded: function (n) {
          if (n.nodeType !== 1 || revealed > 400) return;
          revealed++;
          n.setAttribute('data-od-new', '');
          setTimeout(function () { n.removeAttribute('data-od-new'); }, 400);
        },
      },
    });
    if (window.lucide && window.lucide.createIcons) { try { window.lucide.createIcons(); } catch (e) {} }
    fillPhotos();
    reportHeight();
  }
  window.addEventListener('message', function (e) {
    if (!sameOrigin(e) || !e.data || e.data.type !== '${STREAM_MESSAGE}') return;
    if (e.data.photos && typeof e.data.photos === 'object') { photos = e.data.photos; fillPhotos(); }
    if (typeof e.data.html === 'string') { try { apply(e.data.html); } catch (err) {} }
  });
  window.parent.postMessage({ type: '${STREAM_MESSAGE}:ready' }, '*');
})();
`

/** The frame's one and only document: skeleton, shimmer and the runtime that patches it. */
export function streamFrameDoc(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html{height:100%}body{margin:0;min-height:100%;position:relative}${SHIMMER_CSS}</style></head><body>${SKELETON}<script>${RUNTIME}</script></body></html>`
}
