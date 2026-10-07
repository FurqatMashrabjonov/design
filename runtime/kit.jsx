// @od/kit — the host's own components and the mount a screen document calls. Built into the runtime bundle.
import { Component } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from 'konsta/react'
import { AppContext } from './kit/nav.jsx'
import './runtime.css'
// Konsta's own colour math (it is how its Tailwind plugin builds a brand colour): the iOS tint/shade is small and
// always loaded; the Material You scheme is loaded only when a screen is shown as Android.
import iosColors from '../node_modules/konsta/color-utils/ios-colors.js'
import { SERIALIZE_SOURCE } from '../src/lib/figma-serialize.ts'
import { AUDIT_SOURCE } from '../src/lib/render-audit.ts'
export * from './kit/ui.jsx'
export * from './kit/blocks.jsx'
import { STATIC } from './kit/ui.jsx'
export { useNav, AppTabbar, usePhotos } from './kit/nav.jsx'
export { STYLES, applyStyle, styleTokens } from './kit/styles.js'
export { useStore, setupStore, resetStore } from './kit/store.js'
import { setupStore } from './kit/store.js'
import { applyStyle, parseStyle } from './kit/styles.js'

/** A screen that throws while rendering says so, instead of leaving a blank frame. */
class Crash extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return <div data-od-crash style={{ padding: 24, paddingTop: 80, font: '15px -apple-system, system-ui', color: '#ff453a' }}>This screen crashed: {String(this.state.error?.message ?? this.state.error).slice(0, 300)}</div>
  }
}

/** A device's status bar and home area (the preview's device frames), as Konsta's safe-area variables: its
 *  Navbar and Tabbar then keep clear of them, as on the phone. Null: no insets (the canvas). */
const parseInsets = (v) => (v && Number.isFinite(v.top) && Number.isFinite(v.bottom) ? { top: Math.max(0, Math.min(80, v.top)), bottom: Math.max(0, Math.min(60, v.bottom)) } : null)
const safeAreaStyle = (insets) => (insets ? { '--k-safe-area-top': `${insets.top}px`, '--k-safe-area-bottom': `${insets.bottom}px` } : undefined)

/** The accent as Konsta's colour tokens (--k-color-*), so every Konsta part — iOS or Material — wears it. */
async function applyAccent(accent, material) {
  const tokens = { primary: accent, ...iosColors(accent) }
  if (material) Object.assign(tokens, (await import('../node_modules/konsta/color-utils/md-colors.js')).default(accent))
  for (const [k, v] of Object.entries(tokens)) document.documentElement.style.setProperty(`--k-color-${k}`, v)
}

/** Renders one screen inside Konsta's <App>: the app's tabs, accent, light/dark and platform (iOS or Android /
 *  Material) come from the host — the same component is drawn natively for either platform. */
export async function mount(Screen, { dark = false, accent = '#5e5ce6', platform = 'ios', style = 'clean', insets = null, tabs = [], screen = '', photos = {}, store = null, storeId = 'app', el = document.getElementById('root') } = {}) {
  // FUN-01: the app's shared store, before the first render reads it.
  if (store) setupStore(store, { id: storeId })
  // A settled frame (?static): every entrance animation is at its end, so a screenshot shows the finished screen.
  if (STATIC) document.documentElement.classList.add('vs-static')
  const root = createRoot(el)
  let look = { dark, accent, platform, style: parseStyle(style), insets }
  const render = async () => {
    const material = look.platform === 'material'
    document.documentElement.classList.toggle('dark', look.dark)
    await applyAccent(look.accent, material).catch(() => {})
    // THM-01: after the accent, so the style's surfaces win over Material's accent-derived ones.
    applyStyle(look.style, look.accent, look.dark)
    root.render(
      <App theme={material ? 'material' : 'ios'} dark={look.dark} safeAreas className={look.dark ? 'dark' : ''} style={safeAreaStyle(look.insets)}>
        <AppContext value={{ tabs, screen, photos }}>
          <Crash><Screen /></Crash>
        </AppContext>
      </App>,
    )
  }
  await render()
  reportHeight(el)
  answerSerialize()
  answerAudit()
  answerPick()
  // The host changes the look in place (od:look) — iOS ↔ Android, light ↔ dark, accent — so a theme switch
  // re-renders this screen instead of reloading the page. Only the parent is listened to, and only valid values pass.
  window.addEventListener('message', (e) => {
    const d = e.data
    if (e.source !== window.parent || !d || d.type !== 'od:look') return
    const next = {
      dark: d.dark === true,
      platform: d.platform === 'material' ? 'material' : 'ios',
      accent: typeof d.accent === 'string' && /^#[0-9a-f]{6}$/i.test(d.accent) ? d.accent : look.accent,
      style: d.style === undefined ? look.style : parseStyle(d.style),
      insets: parseInsets(d.insets),
    }
    if (next.dark === look.dark && next.platform === look.platform && next.accent === look.accent && next.style === look.style && JSON.stringify(next.insets) === JSON.stringify(look.insets)) return
    look = next
    render()
  })
}

// The canvas shows a screen at its full length, as a designer would: the page tells its frame how tall its
// content is (the scroll height of Konsta's .k-page), again as photos and fonts load. The preview keeps a phone.
function reportHeight(root) {
  if (window.parent === window) return
  let last = 0
  const send = (force = false) => {
    const page = root.querySelector('.k-page')
    const h = Math.ceil(page ? page.scrollHeight : document.documentElement.scrollHeight)
    if (h && (force || Math.abs(h - last) > 1)) window.parent.postMessage({ type: 'od:height', height: (last = h) }, '*')
  }
  // The frame may ask (od:measure) — a report sent before it was listening is not lost.
  window.addEventListener('message', (e) => {
    if (e.source === window.parent && e.data?.type === 'od:measure') send(true)
  })
  const watch = new ResizeObserver(() => send())
  const attach = () => {
    const page = root.querySelector('.k-page')
    if (!page) return setTimeout(attach, 50)
    watch.observe(page)
    for (const child of page.children) watch.observe(child)
    send()
  }
  attach()
  window.addEventListener('load', () => send())
  for (const ms of [300, 1000, 2500]) setTimeout(() => send(), ms)
}

// REG-02: the host turns on picking (od:pick) to change one element. The pointer outlines the element under it —
// the nearest one the compiler marked with where it is in the source (data-od-loc) — and a click names it back
// (od:picked: its place, what it is, its text) instead of doing what the app would do. Escape cancels. Only the
// parent may switch it on.
function answerPick() {
  let on = false
  let box = null
  const target = (el) => (el && el.closest ? el.closest('[data-od-loc]') : null)
  const kind = (el) =>
    el.matches('button, [role=button], .k-button') ? 'Button'
      : el.matches('.k-list-item, li') ? 'Row'
        : el.matches('img, [data-od-photo]') ? 'Photo'
          : el.matches('svg') ? 'Icon'
            : el.matches('h1, h2, h3, .k-navbar, [class*=title]') ? 'Title'
              : el.matches('input, textarea, select, .k-list-input') ? 'Field'
                : 'Element'
  function outline(el) {
    if (!box) {
      box = document.createElement('div')
      box.setAttribute('aria-hidden', 'true')
      box.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #6c5ce7;border-radius:6px;background:rgba(108,92,231,.08);transition:all 80ms ease-out'
      document.body.appendChild(box)
    }
    const r = el.getBoundingClientRect()
    Object.assign(box.style, { display: 'block', left: `${r.left - 2}px`, top: `${r.top - 2}px`, width: `${r.width + 4}px`, height: `${r.height + 4}px` })
  }
  const hide = () => box && (box.style.display = 'none')
  window.addEventListener('message', (e) => {
    if (e.source !== window.parent || !e.data || e.data.type !== 'od:pick') return
    on = !!e.data.on
    document.documentElement.style.cursor = on ? 'crosshair' : ''
    if (!on) hide()
  })
  document.addEventListener('pointermove', (e) => {
    if (!on) return
    const el = target(e.target)
    el ? outline(el) : hide()
  }, true)
  const swallow = (e) => {
    if (!on) return
    e.preventDefault()
    e.stopPropagation()
  }
  for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) document.addEventListener(t, swallow, true)
  document.addEventListener('click', (e) => {
    if (!on) return
    swallow(e)
    const el = target(e.target)
    if (!el) return
    const text = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    window.parent.postMessage({ type: 'od:picked', loc: el.getAttribute('data-od-loc'), kind: kind(el), text }, '*')
  }, true)
  window.addEventListener('keydown', (e) => {
    if (on && e.key === 'Escape') window.parent.postMessage({ type: 'od:picked', loc: null }, '*')
  })
}

// FIG-10: the host asks for this screen as a tree of layers (Copy to Figma). The serializer reads the page the
// browser has laid out — computed styles, real positions — and only the parent may ask.
function answerSerialize() {
  const serialize = new Function(SERIALIZE_SOURCE)
  window.addEventListener('message', (e) => {
    if (e.source !== window.parent || !e.data || e.data.type !== 'od:serialize') return
    let tree = null
    let error = null
    try {
      tree = serialize()
    } catch (err) {
      error = String(err?.message ?? err)
    }
    window.parent.postMessage({ type: 'od:serialized', requestId: e.data.requestId, tree, error }, '*')
  })
}

// KON-13: the server asks what the drawn screen looks like (od:audit) before anyone sees it. Only the parent may ask.
function answerAudit() {
  const audit = new Function(AUDIT_SOURCE)
  window.addEventListener('message', (e) => {
    if (e.source !== window.parent || !e.data || e.data.type !== 'od:audit') return
    let findings = []
    let error = null
    try {
      findings = audit()
    } catch (err) {
      error = String(err?.message ?? err)
    }
    window.parent.postMessage({ type: 'od:audited', findings, error, material: !!document.querySelector('.k-material') }, '*')
  })
}
