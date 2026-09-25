// A generated screen is a picture of an app, not a page of ours. Rendered in a sandboxed srcdoc iframe,
// a relative link (`<a href="/login">`) or a form resolves against our own origin: tapping "Log in" in a
// screen opened the studio's real login page inside the phone. Every frame that shows a screen (canvas,
// preview, export) carries this guard: a real link or a form submit goes nowhere, and taps that should
// move between screens keep working through data-od-link / data-od-tab / data-od-back, which the frame's
// own bridge handles. Registered first and on capture, so no script of the screen runs before it.
export const NAV_GUARD = `<script data-od-nav-guard>(function(){
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';if(h.charAt(0)==='#'&&h.length>1)return;e.preventDefault();},true);
document.addEventListener('submit',function(e){e.preventDefault();},true);
})()</script>`

/** Puts the guard at the very start of <head> (or of the document). Idempotent. */
export function withNavGuard(html: string): string {
  if (html.includes('data-od-nav-guard')) return html
  return /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, (m) => m + NAV_GUARD) : NAV_GUARD + html
}

// A display figure the model sized for a width it could not measure ("$9,540.40" at 88px monospace in
// a 320px card) runs out of its box. A model writes tokens, it never sees the rendered width, so this is
// decided where the width is known: after fonts load, a large single line (≥28px) wider than its parent's
// content box, or than the phone, is set just small enough to fit (never below half its size). Only the
// font size of that one element changes — nothing is moved — and a line that fits is left alone.
export const FIT_TEXT = `<script data-od-fit>(function(){
function fit(){var vw=document.documentElement.clientWidth;var els=document.body?document.body.querySelectorAll('*'):[];
for(var i=0;i<els.length;i++){var el=els[i];if(el.closest('svg,[data-od-shell],[data-od-map-rendered],[data-od-chart-rendered]'))continue;
var cs=getComputedStyle(el);var fs=parseFloat(cs.fontSize);if(!(fs>=28)||cs.display==='none')continue;
var own=false;for(var c=el.firstChild;c;c=c.nextSibling)if(c.nodeType===3&&c.textContent.trim()){own=true;break}if(!own)continue;
var p=el.parentElement;if(!p)continue;var pcs=getComputedStyle(p);var pr=p.getBoundingClientRect();var r=el.getBoundingClientRect();
var right=Math.min(pr.right-parseFloat(pcs.paddingRight||0),vw);var avail=Math.min(r.width,right-r.left);
var need=Math.max(r.width+Math.max(0,r.right-right),el.scrollWidth);if(avail<=0||need<=avail+1)continue;
el.style.fontSize=Math.max(Math.floor(fs*avail/need),Math.ceil(fs/2))+'px';}}
function run(){fit();fit();}
if(document.readyState==='complete')run();else addEventListener('load',run);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run);
})()</script>`

/** The guard and the fitter, as every frame that shows a stored screen needs them. Idempotent. */
export function withFrameRuntime(html: string): string {
  const guarded = withNavGuard(html)
  if (guarded.includes('data-od-fit')) return guarded
  return guarded.includes('</body>') ? guarded.replace('</body>', `${FIT_TEXT}</body>`) : guarded + FIT_TEXT
}
