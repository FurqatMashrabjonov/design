// FUN-01: the host side of the app's shared store. Each screen runs in its own sandboxed frame with its own copy of
// the store (runtime/kit/store.js); when one changes it (od:state), the host keeps the new state and hands it to the
// app's other frames, and a frame that opens later asks for it (od:state-hello). `app` is the store's hash, so frames
// of two apps on one page never mix. Untrusted in shape only: an object under 1 MB, forwarded to frames like it.

const states = new Map<string, unknown>()
const appOf = new WeakMap<Window, string>()
let installed = false

const frames = () => [...document.querySelectorAll('iframe')].map((f) => f.contentWindow).filter((w): w is Window => !!w)

export function installStateBus() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('message', (e) => {
    const d = e.data as { type?: unknown; app?: unknown; state?: unknown } | null
    const from = e.source as Window | null
    if (!d || !from || typeof d.app !== 'string' || d.app.length > 64) return
    if (d.type === 'od:state-hello') {
      appOf.set(from, d.app)
      if (states.has(d.app)) from.postMessage({ type: 'od:state', app: d.app, state: states.get(d.app) }, '*')
      return
    }
    if (d.type !== 'od:state' || !d.state || typeof d.state !== 'object') return
    try {
      if (JSON.stringify(d.state).length > 1_000_000) return
    } catch {
      return
    }
    appOf.set(from, d.app)
    states.set(d.app, d.state)
    for (const w of frames()) if (w !== from && appOf.get(w) === d.app) w.postMessage({ type: 'od:state', app: d.app, state: d.state }, '*')
  })
}

/** Every frame of the app back to the store's first state (a fresh page draws it from `initial`). */
export function resetAppState(app?: string) {
  if (app) states.delete(app)
  else states.clear()
}
