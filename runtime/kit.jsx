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
import { STATIC } from './kit/ui.jsx'
export { useNav, AppTabbar, usePhotos } from './kit/nav.jsx'
export { STYLES, applyStyle, styleTokens } from './kit/styles.js'
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
export async function mount(Screen, { dark = false, accent = '#5e5ce6', platform = 'ios', style = 'clean', insets = null, tabs = [], screen = '', photos = {}, el = document.getElementById('root') } = {}) {
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
