// Runs inside every canvas frame (sandboxed, so it only talks to the editor by postMessage).
// It is always present and switched on/off by the editor, so selecting a screen never reloads it.
//
// Switched on (the screen is selected): hovering outlines the element under the pointer, a click
// selects it, a double click on text edits it in place, Esc steps back out, and the wheel is handed
// to the canvas so panning and zooming keep working over the selected frame.
//
// Selectable means: carries data-od-id (see lib/element-ops.ts annotateElements) and is not part of
// the injected shell. Text is editable in place under the same rule as the server's isTextEditable.

export const EDIT_BRIDGE = `
<style id="__od_edit_bridge">
  html[data-od-active] [data-od-hover] { outline: 1.5px solid #3b82f6 !important; outline-offset: 1px !important; }
  html[data-od-active] [data-od-selected] { outline: 2px solid #2563eb !important; outline-offset: 2px !important; }
  html[data-od-active] [data-od-editing] { outline: 2px solid #2563eb !important; outline-offset: 2px !important; cursor: text !important; }
  html[data-od-active], html[data-od-active] * { cursor: default; }
</style>
<script id="__od_edit_bridge_js">
(function () {
  var active = false, selectedId = null, hover = null, editing = null, original = null;
  var root = document.documentElement;
  function post(m) { window.parent.postMessage(m, '*'); }
  function selectable(t) {
    var el = t && t.closest ? t.closest('[data-od-id]') : null;
    if (!el || el.closest('[data-od-shell]')) return null;
    return el;
  }
  function rectOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  }
  function textEditable(el) {
    if (/^(IMG|INPUT|TEXTAREA|SELECT|UL|OL|TABLE)$/i.test(el.tagName)) return false;
    var own = false;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) { if (n.textContent.trim()) own = true; }
      else if (n.nodeType === 1 && !/^(I|SVG|IMG|BR)$/i.test(n.tagName) && n.textContent.trim()) return false;
    }
    return own;
  }
  function setHover(el) {
    if (hover === el) return;
    if (hover) hover.removeAttribute('data-od-hover');
    hover = el;
    if (hover && hover.getAttribute('data-od-id') !== selectedId) hover.setAttribute('data-od-hover', '');
  }
  function paintSelected() {
    var old = document.querySelectorAll('[data-od-selected]');
    for (var i = 0; i < old.length; i++) old[i].removeAttribute('data-od-selected');
    if (!active || !selectedId) return null;
    var el = null, all = document.querySelectorAll('[data-od-id]');
    for (var j = 0; j < all.length; j++) if (all[j].getAttribute('data-od-id') === selectedId) { el = all[j]; break; }
    if (el) el.setAttribute('data-od-selected', '');
    return el;
  }
  function select(el) {
    selectedId = el ? el.getAttribute('data-od-id') : null;
    setHover(null);
    paintSelected();
    post({ type: 'od:select_element', elementId: selectedId, rect: el ? rectOf(el) : null });
  }
  function startEdit(el) {
    if (!el || editing || !textEditable(el)) return;
    editing = el;
    original = el.innerHTML;
    for (var i = 0; i < el.children.length; i++) el.children[i].setAttribute('contenteditable', 'false');
    try { el.setAttribute('contenteditable', 'plaintext-only'); } catch (e) {}
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-od-editing', '');
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    post({ type: 'od:editing', elementId: el.getAttribute('data-od-id'), editing: true });
  }
  function endEdit(commit) {
    var el = editing;
    if (!el) return;
    editing = null;
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-od-editing');
    for (var i = 0; i < el.children.length; i++) el.children[i].removeAttribute('contenteditable');
    var id = el.getAttribute('data-od-id');
    var text = (el.innerText || '').replace(/\\s+/g, ' ').trim();
    var before = document.createElement('div');
    before.innerHTML = original;
    var was = (before.innerText || before.textContent || '').replace(/\\s+/g, ' ').trim();
    if (!commit || !text || text === was) { el.innerHTML = original; post({ type: 'od:editing', elementId: id, editing: false }); return; }
    post({ type: 'od:text_edit', elementId: id, text: text });
  }

  document.addEventListener('mousemove', function (e) { if (active && !editing) setHover(selectable(e.target)); }, true);
  document.addEventListener('mouseleave', function () { setHover(null); });
  document.addEventListener('click', function (e) {
    if (!active) return;
    if (editing && editing.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (editing) endEdit(true);
    select(selectable(e.target));
  }, true);
  document.addEventListener('dblclick', function (e) {
    if (!active) return;
    e.preventDefault();
    var el = selectable(e.target);
    if (el && el.getAttribute('data-od-id') !== selectedId) select(el);
    startEdit(el);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (editing) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); endEdit(true); }
      else if (e.key === 'Escape') { e.preventDefault(); endEdit(false); }
      return;
    }
    if (e.key === 'Escape' && active) { e.preventDefault(); post({ type: 'od:escape' }); }
  }, true);
  document.addEventListener('focusout', function (e) { if (editing && e.target === editing) endEdit(true); }, true);
  // Over the selected frame the page gets the wheel; the canvas still has to pan and zoom.
  document.addEventListener('wheel', function (e) {
    if (!active) return;
    e.preventDefault();
    post({ type: 'od:wheel', deltaX: e.deltaX, deltaY: e.deltaY, ctrlKey: e.ctrlKey, metaKey: e.metaKey, clientX: e.clientX, clientY: e.clientY });
  }, { passive: false, capture: true });

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || !e.data) return;
    var d = e.data;
    if (d.type === 'od:mode') {
      active = Boolean(d.active);
      if (active) root.setAttribute('data-od-active', ''); else { root.removeAttribute('data-od-active'); setHover(null); if (editing) endEdit(false); }
      selectedId = d.selectedId || null;
      var el = paintSelected();
      if (selectedId) post(el ? { type: 'od:selected_rect', elementId: selectedId, rect: rectOf(el) } : { type: 'od:select_element', elementId: null, rect: null });
    } else if (d.type === 'od:start_edit') {
      var all = document.querySelectorAll('[data-od-id]');
      for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-od-id') === d.elementId) { startEdit(all[i]); break; }
    } else if (d.type === 'od:cancel_edit') {
      var target = document.querySelector('[data-od-id="' + String(d.elementId).replace(/"/g, '') + '"]');
      if (target && original !== null) target.innerHTML = original;
    }
  });
})();
</script>
`

export function withEditBridge(html: string): string {
  return html.includes('</body>') ? html.replace('</body>', `${EDIT_BRIDGE}</body>`) : html + EDIT_BRIDGE
}

/** A frame-local rectangle reported by the bridge, validated before it positions anything. */
export type BridgeRect = { x: number; y: number; w: number; h: number }
export function parseRect(v: unknown): BridgeRect | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  const ok = ['x', 'y', 'w', 'h'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k] as number) && Math.abs(r[k] as number) < 100_000)
  return ok ? { x: r.x as number, y: r.y as number, w: r.w as number, h: r.h as number } : null
}

/** Element ids come from the sandbox: only accept ones shaped like annotateElements makes them. */
export const safeElementId = (v: unknown): string | null => (typeof v === 'string' && /^[\w-]{1,80}$/.test(v) ? v : null)
