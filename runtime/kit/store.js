import { useSyncExternalStore } from 'react'

// FUN-01: the app's one store. The model writes the app's data layer once (store.js: `initial`, `actions`,
// `derived`) and every screen reads and changes the app through `useStore()` — so what one screen changes, every
// other screen shows. In the studio each screen runs in its own frame: a change is posted to the host (od:state),
// which hands it to the app's other frames. In an exported app there is one page, and the state is kept in
// localStorage so the app opens where it was left.

let app = { initial: {}, actions: {}, derived: {} }
let key = ''
let state = {}
let version = 0
let view = null
let bound = {}
let persistKey = null
const subs = new Set()
const inFrame = typeof window !== 'undefined' && window.parent !== window

const clone = (v) => {
  try { return structuredClone(v) } catch { return JSON.parse(JSON.stringify(v ?? {})) }
}

function emit(local) {
  version++
  view = null
  for (const f of subs) f()
  if (!local) return
  globalThis.__odActs = (globalThis.__odActs ?? 0) + 1 // FUN-04: a store change is something a tap did
  if (inFrame) window.parent.postMessage({ type: 'od:state', app: key, state }, '*')
  else if (persistKey) {
    try { localStorage.setItem(persistKey, JSON.stringify(state)) } catch {}
  }
}

/** Registers the app's store module. `id` names the app (a frame's store source hash, an export's name). */
export function setupStore(mod, { id = 'app', persist = false } = {}) {
  app = { initial: mod?.initial ?? {}, actions: mod?.actions ?? {}, derived: mod?.derived ?? {} }
  key = String(id)
  state = clone(app.initial)
  if (persist && !inFrame) {
    persistKey = `od:app:${key}`
    try {
      const saved = JSON.parse(localStorage.getItem(persistKey) ?? 'null')
      if (saved && typeof saved === 'object') state = saved
    } catch {}
  }
  // An action gets a copy of the state to change in place; the copy becomes the state, and everyone re-renders.
  bound = {}
  for (const [name, fn] of Object.entries(app.actions)) {
    if (typeof fn !== 'function') continue
    bound[name] = (...args) => {
      const draft = clone(state)
      let out
      try {
        out = fn(draft, ...args)
      } catch (e) {
        console.error(`[store] ${name} failed:`, e)
        return undefined
      }
      state = draft
      emit(true)
      return out
    }
  }
  if (inFrame) {
    window.addEventListener('message', (e) => {
      const d = e.data
      if (e.source !== window.parent || !d || d.type !== 'od:state' || d.app !== key || !d.state || typeof d.state !== 'object') return
      state = d.state
      emit(false)
    })
    // The host answers with the state the app's other frames have reached, if any.
    window.parent.postMessage({ type: 'od:state-hello', app: key }, '*')
  }
  emit(false)
}

/** Back to the store's first state (the host's "reset data"). */
export function resetStore() {
  state = clone(app.initial)
  emit(true)
}

// How many parameters a function declares, defaults and rest included — `fn.length` stops at the first default, so
// `(state, query = '') => …` read as a value and a screen calling it crashed ("is not a function").
function arity(fn) {
  if (fn.length > 1) return fn.length
  const src = Function.prototype.toString.call(fn)
  const open = src.indexOf('(')
  const arrow = src.indexOf('=>')
  if (open < 0 || (arrow >= 0 && arrow < open)) return fn.length // `state => …`: one parameter
  let depth = 0, n = 1, i = open + 1
  for (; i < src.length; i++) {
    const c = src[i]
    if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) { if (depth === 0) break; depth-- }
    else if (c === ',' && depth === 0) n++
  }
  return src.slice(open + 1, i).trim() ? n : 0
}

function current() {
  if (view) return view
  // `state` is there too, for a screen that reads `const { state } = useStore()`.
  const out = { state, ...state }
  for (const [name, fn] of Object.entries(app.derived)) {
    if (typeof fn !== 'function') continue
    // A derived value per item (`streakOf: (state, id) => …`) is called from a screen as `streakOf(h.id)`.
    if (arity(fn) > 1) {
      out[name] = (...args) => {
        try { return fn(state, ...args) } catch (e) { console.error(`[store] ${name} failed:`, e); return undefined }
      }
      continue
    }
    try { out[name] = fn(state) } catch (e) { console.error(`[store] ${name} failed:`, e) }
  }
  view = Object.assign(out, bound)
  return view
}

/** The same object outside a component (the tests, a script). */
export const readStore = () => current()

const subscribe = (f) => (subs.add(f), () => subs.delete(f))

/** The app: its state, derived values and actions in one object — `const { habits, streak, toggleHabit } = useStore()`. */
export function useStore() {
  useSyncExternalStore(subscribe, () => version, () => version)
  return current()
}
